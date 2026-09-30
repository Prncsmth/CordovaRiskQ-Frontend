# Email OTP Verification (Registration) — Design

**Date:** 2026-09-29
**Repos touched:** `CordovaRiskQ-Bacnkend` (Express + Prisma/Postgres + JWT, TypeScript) and `CordovaRiskQ-Frontend` (this repo, Expo/React Native).

## Purpose

Today, `POST /api/auth/register` creates a real account the moment someone submits a name/email/password — nothing confirms the submitter actually owns that Gmail address. This adds a one-time-code email verification step: the account is not created until the code sent to that address is confirmed.

Google Sign-In registration is unaffected — Google's own OAuth flow already proves address ownership, so it skips this entirely.

## Scope

1. Backend: `PendingRegistration` Prisma model (hand-written migration — see Migration note).
2. Backend: `src/services/email.service.ts` — thin wrapper around the Resend SDK.
3. Backend: `POST /api/auth/register/request-otp` and `POST /api/auth/register/verify-otp`, replacing the direct-create step of today's `POST /api/auth/register` for the password-based signup path.
4. Frontend: `app/(auth)/register.tsx` calls `request-otp` instead of today's `registerUser()`, then navigates to a new `app/(auth)/verify-email.tsx` screen.
5. Frontend: `services/auth.service.ts` gains `requestRegistrationOtp`/`verifyRegistrationOtp`, replacing `registerUser`'s call site (the function itself can stay for now — see Out of scope).

## Out of scope

- **Google Sign-In.** No change to `POST /api/auth/google` or `GoogleButton.tsx` — this spec only touches the email/password registration path.
- **Full-name step for new Google users.** Separate, smaller follow-up (mirrors the existing `needsOnboarding` → `/phone-number` gate in `app/_layout.tsx`), tracked independently of this spec.
- **The existing dead "Forgot Password" screen.** `app/(auth)/forgot-password.tsx` already calls `POST /api/auth/forgot-password`, which does not exist on the backend today. Confirmed out of scope; noted here only so it isn't mistaken for something this spec touches.
- **Scheduled cleanup job for expired `PendingRegistration` rows.** Expiry is enforced by checking `otpExpiresAt` at verify time (an expired row is simply treated as invalid); rows are not proactively deleted on a timer. A periodic sweep (e.g. delete rows where `otpExpiresAt < now() - interval` on a cron) is reasonable future work once there's a scheduled-job mechanism in this backend at all — there isn't one today, and adding one is out of proportion to this feature.
- **Login-time email verification enforcement for accounts that predate this feature.** Every existing row in `User` was created before this existed; none of them gain a `emailVerifiedAt` flag or similar, and login is not changed to check one. This spec only gates the registration path.

## Architecture

### Data model

```prisma
model PendingRegistration {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String?
  passwordHash String
  otpHash      String
  otpExpiresAt DateTime
  attempts     Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

- `email` is `@unique` so `request-otp` always **upserts** a single row per address — a resend (or a second registration attempt with the same email before the first is verified) overwrites the previous `passwordHash`/`otpHash`/`otpExpiresAt`/resets `attempts` to 0, which is what makes "only the latest code works" true for free, with no separate invalidation step.
- `passwordHash`/`otpHash` — both bcrypt (cost 10, matching `authService.register`'s existing `bcrypt.hash(password, 10)`). The OTP is never persisted or logged in plaintext anywhere, including in the email-sending code path (it's held in a local variable just long enough to hash it and pass it to the email template).
- `attempts` — incremented on each wrong `verify-otp` call for that row; at 5, `verify-otp` starts rejecting with "too many attempts, request a new code" even if the code would otherwise still be within its time window, forcing a fresh `request-otp` (which resets `attempts` to 0 via the upsert above).

### Migration (hand-written, per this repo's established Neon-drift workaround)

Per `2026-09-21-hotlines-backend-design.md`'s precedent, `prisma migrate dev`/`reset`/`db push --accept-data-loss` are destructive against the current drifted Neon DB (they'd offer to drop the Admin repo's own `Admin` table). The migration is written by hand and applied the same three-step way:

1. Write `prisma/migrations/20260929120000_add_pending_registration/migration.sql`:
   ```sql
   -- CreateTable
   CREATE TABLE "PendingRegistration" (
       "id" TEXT NOT NULL,
       "email" TEXT NOT NULL,
       "name" TEXT,
       "passwordHash" TEXT NOT NULL,
       "otpHash" TEXT NOT NULL,
       "otpExpiresAt" TIMESTAMP(3) NOT NULL,
       "attempts" INTEGER NOT NULL DEFAULT 0,
       "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updatedAt" TIMESTAMP(3) NOT NULL,

       CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
   );

   -- CreateIndex
   CREATE UNIQUE INDEX "PendingRegistration_email_key" ON "PendingRegistration"("email");
   ```
2. Apply it: `npx prisma db execute --file prisma/migrations/20260929120000_add_pending_registration/migration.sql`.
3. Record it: `npx prisma migrate resolve --applied 20260929120000_add_pending_registration`.
4. `npx prisma generate` to refresh the client.

### Backend: email sending

New `src/services/email.service.ts`:
```ts
import { Resend } from "resend";
import { AppError } from "@/utils/AppError";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Cordova RiskQ <onboarding@resend.dev>";

export async function sendOtpEmail(to: string, code: string): Promise<void> {
    const { error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to,
        subject: "Your Cordova RiskQ verification code",
        text: `Your verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    });

    if (error) {
        // The SDK resolves with { data, error } instead of rejecting on a
        // failed send (confirmed against Resend's own Node SDK docs) --
        // without this check, a bad API key, a Resend outage, or a bounced
        // address would silently look like a successful request-otp call to
        // the caller, and the user would wait forever for a code that was
        // never actually sent.
        throw new AppError("Couldn't send the verification email. Please try again.", 502);
    }
}
```
- New dependency: `resend` (npm package).
- New env var: `RESEND_API_KEY` (required). `EMAIL_FROM` optional, defaults to Resend's own test-domain sender (`onboarding@resend.dev`), which sends without any custom-domain DNS setup — fine for this project's scale; swapping in a verified custom domain later is a config-only change, not a code change.
- Plain-text email body only (no HTML template) — matches this codebase's general preference for the simplest thing that works; an HTML template is easy to add later without touching the calling code.
- `sendOtpEmail` throwing propagates straight out of `requestOtp` (below) uncaught, through `asyncHandler`, to the existing centralized error-handler middleware -- same as every other `AppError` in this codebase. `request-otp` never returns `{success: true}` on a send failure.

### Backend: OTP generation

Small helper (lives in the new service handling these two routes, not a separate file — it's a two-line pure function, not worth its own module):
```ts
function generateOtp(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}
```
`randomInt(0, 1_000_000)` (not `randomInt(100000, 999999)`) so codes starting with one or more zeros are possible — biasing them out would shrink the effective code space and isn't otherwise justified.

### Backend: routes/controller/service

Following `auth.routes.ts`'s existing four-piece pattern:

**`src/validations/auth.validation.ts`** gains:
```ts
export const requestRegistrationOtpSchema = registerSchema; // identical shape (name/email/password)

export const verifyRegistrationOtpSchema = z.object({
    email: z.string().trim().email().transform((v) => v.toLowerCase()),
    code: z.string().length(6, "Code must be 6 digits").regex(/^\d{6}$/, "Code must be 6 digits"),
});
```

**`src/middlewares/rateLimit.middleware.ts`** gains two limiters (same `createRateLimiter` factory already used for `loginLimiter`/`registerLimiter`):
```ts
export const requestOtpLimiter = createRateLimiter(
    5 * 60 * 1000, 5,
    "Too many verification code requests. Please try again in a few minutes."
);
export const verifyOtpLimiter = createRateLimiter(
    5 * 60 * 1000, 10,
    "Too many attempts. Please try again in a few minutes."
);
```
The IP-based rate limiters above are one layer, but they don't stop a *different* IP from repeatedly re-requesting a code for *someone else's* email — and because `request-otp` upserts (invalidating whatever code/attempts count was already pending), that's a real griefing path: another party could keep resetting a victim's in-progress registration before they finish entering the code they were just sent. The **real** boundary against that is the server-side per-email cooldown described next; the rate limiters remain useful defense-in-depth against brute-force/spam from a single source, not the mechanism this specific gap needed.

**Server-side per-email cooldown (the actual security boundary):** `requestOtp` (below) checks the existing row's `otpExpiresAt` before doing anything else — no new column, no new table, and deliberately **not** `updatedAt` (see the correctness note below for why). Since `otpExpiresAt` is always set to `now + 10 minutes` at the moment an OTP is actually (re)generated, `otpExpiresAt - 10 minutes` recovers exactly when that happened — so the check is: if a `PendingRegistration` row already exists and `otpExpiresAt.getTime() - Date.now() > 9 * 60 * 1000` (i.e. more than 9 of its 10 minutes are still left, meaning it was generated less than 60s ago), reject with `AppError("Please wait before requesting another code.", 429)` *before* generating a new OTP, hashing the password again, or calling Resend. Only once that 60s has elapsed (or no row exists yet) does it proceed to upsert + send.

This interacts cleanly with expiry without needing a special case: the cooldown window (60s) is two orders of magnitude shorter than the OTP expiry window (10 minutes), so a row can never be simultaneously "expired" (`otpExpiresAt` in the past) and "within its resend cooldown" (`otpExpiresAt` more than 9 minutes in the future) — those are opposite ends of the same 10-minute window. An expired `PendingRegistration` always has plenty of room left in the *cooldown* check (it's arithmetically impossible for it not to), so it never blocks a fresh `request-otp`; the upsert simply overwrites the stale row with a new code/expiry/reset attempts, same as any other resend.

**Why `otpExpiresAt`, not `updatedAt` (correctness note):** `updatedAt` is touched by *any* write to the row, including `verifyOtp`'s failure path incrementing `attempts` — so a wrong-code guess would extend how long the *next* resend has to wait too, purely as a side effect of Prisma's `@updatedAt` auto-touch, with no actual email having been resent. Concretely: OTP requested at 3:00:00 (`otpExpiresAt` = 3:10:00); a wrong guess at 3:00:10 bumps `updatedAt` to 3:00:10 but leaves `otpExpiresAt` untouched at 3:10:00; a resend requested at 3:00:20 correctly measures 20s since the code was actually sent (`3:10:00 − 10min = 3:00:00`) and stays blocked until 3:01:00 — using `updatedAt` instead would have measured only 10s since the *typo*, incorrectly pushing the block out to 3:01:10. `otpExpiresAt` is written *only* by `requestOtp`'s upsert (never by `verifyOtp`), so it's naturally immune to this without a dedicated `lastSentAt` field or a raw-SQL update that bypasses Prisma's auto-touch — both of which would work too, but are more machinery than reusing a field that already means the right thing.

The frontend's 60-second countdown/disabled Resend button (see Frontend section below) is UX only — it exists so a real user isn't left staring at an enabled button that will just 429 if tapped, not as the security boundary itself. If it's ever bypassed or the frontend and backend clocks disagree, the server-side check above is what actually holds.

**`src/services/pendingRegistration.service.ts`** (new):
- `requestOtp({ name, email, password })`:
  1. Normalize email (`.trim().toLowerCase()`), reject non-Gmail (schema already does this).
  2. Reject if a real `User` with this email already exists (`AppError("Email already registered", 409)`).
  3. Load any existing `PendingRegistration` row for this email. If one exists and `row.otpExpiresAt.getTime() - Date.now() > 9 * 60 * 1000`, reject (`AppError("Please wait before requesting another code.", 429)`) — the server-side cooldown described above, checked *before* any hashing or upsert work happens.
  4. Hash the password, generate + hash a fresh OTP, `prisma.pendingRegistration.upsert({ where: { email }, create: {...}, update: {...} })` with `attempts` reset to 0 and a fresh `otpExpiresAt` (`now + 10 minutes`).
  5. `sendOtpEmail(email, code)` — the *unhashed* code, only at this point, only as a function argument, never stored or logged. If this throws (see Email sending above), it propagates out of `requestOtp` uncaught — the `PendingRegistration` row from step 4 is left as-is (its own `otpExpiresAt` was already refreshed by that upsert, so the next resend attempt is still correctly subject to the same 60s cooldown from *this* attempt: a failed send still shouldn't allow immediate hammering).
- `verifyOtp({ email, code })`:
  1. Load the `PendingRegistration` row by email; 404/`AppError("No pending registration for this email", 404)` if none.
  2. If `otpExpiresAt < now`, reject (`AppError("Code has expired. Request a new one.", 410)`) — the row is left in place (harmless; a subsequent `request-otp` upserts over it, per the cleanup note in Out of scope).
  3. If `attempts >= 5`, reject (`AppError("Too many attempts. Request a new code.", 429)`).
  4. `bcrypt.compare(code, row.otpHash)`; on mismatch, `prisma.pendingRegistration.update({ where: { email }, data: { attempts: { increment: 1 } } })` and reject (`AppError("Incorrect code", 401)`).
  5. On match: create the real `User` (`{ email, password: row.passwordHash, name: row.name }` — reusing the already-hashed password, no second hashing pass), delete the `PendingRegistration` row, `emitAdminActivity` the same "user_registered" event `authService.register` already emits today, `signToken`, return `{ user, token }` in the exact same shape `authService.register` returns today.

**`src/controllers/auth.controller.ts`** gains `requestRegistrationOtp`/`verifyRegistrationOtp`, following the existing handlers' `asyncHandler` + `{success: true, ...}` envelope pattern exactly.

**`src/routes/auth.routes.ts`** gains:
```ts
router.post(
    "/auth/register/request-otp",
    requestOtpLimiter,
    validate(requestRegistrationOtpSchema),
    authController.requestRegistrationOtp
);
router.post(
    "/auth/register/verify-otp",
    verifyOtpLimiter,
    validate(verifyRegistrationOtpSchema),
    authController.verifyRegistrationOtp
);
```
`POST /api/auth/register` (today's direct-create route) is left in place, untouched — see the Frontend section's note on `registerUser` below.

### Frontend

**`services/auth.service.ts`** gains:
```ts
export async function requestRegistrationOtp(name: string, email: string, password: string): Promise<void> {
    await apiPost("/api/auth/register/request-otp", { name, email, password });
}

export async function verifyRegistrationOtp(
    email: string,
    code: string,
): Promise<RegisterResponse> {
    return apiPost<RegisterResponse>("/api/auth/register/verify-otp", { email, code });
}
```
(`RegisterResponse` is the type already exported from this file for `registerUser`'s own return shape — reused as-is, since the backend response is identical.)
`registerUser` (today's direct-create call) stays in the file unused by `register.tsx` after this change — not deleted, since removing a working, independently-callable function isn't necessary to ship this feature and a later cleanup pass can remove it once nothing references it.

**`app/(auth)/register.tsx`**: `handleRegister` calls `requestRegistrationOtp(name, email, password)` instead of `registerUser(...)` + `login(...)`; on success, `router.push({ pathname: "/verify-email", params: { email, name, password } })` — the password is passed along only so the Verify Email screen's own "resend" action can call `requestRegistrationOtp` again without asking the user to retype it; it never leaves this in-memory router param to anywhere else (it's already server-side-hashed at this point regardless — the frontend passing it back down is the same value the user just typed, not the hash).

**New `app/(auth)/verify-email.tsx`**: mirrors `forgot-password.tsx`'s structure/styling (`AuthHeader`, `AuthInput`, `PrimaryButton`, `KeyboardSafeView`) rather than introducing a new segmented/boxed code-input component — this app has no existing multi-box OTP input anywhere to match, and a single `AuthInput` with `keyboardType="number-pad"` and `maxLength={6}` is the simplest thing that actually works.
- Header: "Verify Your Email" / "Enter the 6-digit code we sent to {email}".
- One `AuthInput` for the code.
- `PrimaryButton` "Verify" → `verifyRegistrationOtp(email, code)` → on success, `login(result.token, result.user, true)` (same third `isNewUser` argument `register.tsx` passes today).
- Errors surface the backend's message directly (already user-appropriate: "Incorrect code", "Code has expired...", "Too many attempts...").
- "Resend code" text button, disabled for 60s after each successful send (a local `useState<number>` countdown + `setInterval`, same pattern this codebase doesn't currently have a shared hook for — a one-off local timer here is proportionate; not worth extracting given it's the only place this exists).

## Error handling

| Condition | Backend response | Frontend behavior |
|---|---|---|
| Email already a real registered account | `request-otp` → 409 | Shown inline on the Register screen (same spot today's "email already in use" would surface) |
| Resend requested < 60s since the last one for this email | `request-otp` → 429 | Shouldn't normally be reachable (the button is disabled client-side), but if it is: show the message as-is and keep the countdown running |
| Resend's email actually failed to send (Resend API error) | `request-otp` → 502 | "Couldn't send the verification email. Please try again." — Resend button stays enabled so the user can immediately retry |
| No `PendingRegistration` row for email at verify time | `verify-otp` → 404 | Generic "Session expired, please register again" → back to Register |
| Code expired | `verify-otp` → 410 | "This code expired. Request a new one." + Resend enabled immediately |
| Too many attempts | `verify-otp` → 429 | "Too many attempts. Request a new code." + Resend enabled immediately |
| Wrong code (attempts < 5) | `verify-otp` → 401 | "Incorrect code. X attempts left." |
| Rate limiter tripped | either → 429 (express-rate-limit's own response shape) | Generic network-style error message (same as any other rate-limited call today, e.g. login) |

## Testing

- Backend: unit tests for `generateOtp()` (length/digit-only/zero-padding) and `pendingRegistration.service.ts`'s `requestOtp`/`verifyOtp` (expiry rejection, attempts-cap rejection, upsert-resets-attempts, correct-code success path), following this repo's existing `node:test` style (see `src/services/incidentAuthorization.test.ts` for the pattern) — mocking `prisma` and `email.service.ts`'s `sendOtpEmail`.
- Frontend: no existing test coverage for auth screens to extend (confirmed — `register.tsx`/`forgot-password.tsx` have none today); verification is manual, same precedent as the Hotlines spec.
- Manual end-to-end check: register with a real Gmail address → confirm the email actually arrives via Resend → enter the code → confirm the account is created only at that point (not before) → confirm login proceeds normally afterward.
