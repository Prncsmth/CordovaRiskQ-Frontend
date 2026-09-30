# Email OTP Verification (Registration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registering with email+password no longer creates a `User` row immediately — it first sends a 6-digit code to the submitted Gmail address, and only creates the account once that code is verified. Google Sign-In is untouched.

**Architecture:** A new `PendingRegistration` Postgres table holds a hashed password + hashed OTP + expiry + attempt count per email, keyed by a unique `email` column so a resend simply upserts over it. The core OTP logic (cooldown/expiry/attempt rules) is a pure, dependency-injected module unit-tested with in-memory fakes — mirroring this repo's existing `sosTrigger.ts`/`sos.service.ts` split (pure orchestration vs. real Prisma wiring) — with a thin Resend-backed email sender wired in only at the real-service layer. Two new endpoints (`request-otp`, `verify-otp`) replace the direct-create step of registration for the password path; a new frontend screen collects the code and hands off to the existing `login()` flow exactly as `register.tsx` does today.

**Tech Stack:** Backend: Express 5, Prisma 7 (custom client output at `src/generated/prisma`), Postgres (Neon), `bcrypt`, `zod`, `express-rate-limit`, new `resend` package, `node:test` for unit tests. Frontend: Expo Router, React Native, existing `AuthInput`/`PrimaryButton`/`AuthHeader`/`AuthFooter`/`KeyboardSafeView` components.

**Spec:** `docs/superpowers/specs/2026-09-29-email-otp-verification-design.md`

## Global Constraints

- OTP is 6 digits, generated via `crypto.randomInt(0, 1_000_000).toString().padStart(6, "0")` (leading zeros allowed).
- OTP and password are both stored **hashed** (bcrypt, cost 10) in `PendingRegistration` — never plaintext, never logged.
- OTP expiry: exactly 10 minutes from generation (`otpExpiresAt = now + 10 * 60 * 1000`).
- Max verification attempts per pending registration: 5. At 5, `verify-otp` rejects regardless of remaining time, forcing a fresh `request-otp`.
- Resend cooldown: 60 seconds, enforced **server-side**, per email, using `PendingRegistration.otpExpiresAt` (not `updatedAt` — see spec's correctness note). No new column for this.
- `request-otp` upserts by `email`, always resetting `attempts` to 0 and refreshing `otpExpiresAt` — this is what makes a resend invalidate the previous code.
- Migration is **hand-written**, applied via `prisma db execute` + `prisma migrate resolve` — never `prisma migrate dev`/`reset`/`db push --accept-data-loss` (documented Neon-drift risk against the Admin repo's own `Admin` table; see `2026-09-21-hotlines-backend-design.md`).
- `resend.emails.send()` resolves `{ data, error }` — never throws on a failed send. `sendOtpEmail` must check `error` and throw `AppError(..., 502)`.
- Google Sign-In (`POST /api/auth/google`, `GoogleButton.tsx`) is completely untouched by this plan.
- `POST /api/auth/register` (today's direct-create route) stays in place, unmodified.
- New env vars: `RESEND_API_KEY` (required), `EMAIL_FROM` (optional, defaults to `"Cordova RiskQ <onboarding@resend.dev>"`).

## Review Focus

- **Resending immediately after a wrong-code guess.** A user who mistypes the code, then taps Resend a few seconds later, must be blocked based on when the code was actually *sent* (3:00:00), not when they last *guessed* (3:00:10) — Task 1's tests pin this exactly, since it's the one subtlety the spec's own review round caught.
- **A second registration attempt for an email that's already a real, verified `User`.** `request-otp` must reject with 409 before ever touching `PendingRegistration` — someone re-registering an existing account shouldn't get a fresh OTP flow for it.
- **Non-Gmail addresses and malformed 6-digit codes.** Both request-otp and verify-otp run through zod validation before any service code executes — a `"code": "12a45"` or `"code": "1234567"` must 400 at the middleware, never reach `bcrypt.compare`.
- **Resend actually failing to send (bad key, outage, bounce).** Without the `{ data, error }` check, this looks identical to success from the caller's side — the account never gets created and the user is left waiting for a code that never arrives, with no error surfaced anywhere.
- **A pending registration abandoned past its 10-minute expiry, then resumed.** `verify-otp` on an expired row must 410, not silently accept a stale code or throw an unhandled Prisma "not found" — and a subsequent `request-otp` for that same email must succeed immediately (expiry always clears the cooldown, per the spec's arithmetic).

---

### Task 1: Pure OTP orchestration logic (`pendingRegistrationFlow.ts`)

**Files:**
- Create: `src/services/pendingRegistrationFlow.ts`
- Create: `src/services/pendingRegistrationFlow.test.ts`

**Interfaces:**
- Produces (consumed by Task 3):
  - `type PendingRegistrationRow = { email: string; name: string | null; passwordHash: string; otpHash: string; otpExpiresAt: Date; attempts: number }`
  - `interface PendingRegistrationStore { findByEmail(email: string): Promise<PendingRegistrationRow | null>; upsert(row: PendingRegistrationRow): Promise<void>; incrementAttempts(email: string): Promise<void>; delete(email: string): Promise<void>; }`
  - `interface UserStore { findByEmail(email: string): Promise<{ id: string } | null>; create(data: { email: string; name: string | null; passwordHash: string }): Promise<{ id: string; email: string; name: string | null; role: string; isOnDuty: boolean; createdAt: Date }>; }`
  - `interface RegistrationOtpDeps { pendingStore: PendingRegistrationStore; userStore: UserStore; hash(value: string): Promise<string>; compareHash(value: string, hash: string): Promise<boolean>; sendOtpEmail(to: string, code: string): Promise<void>; now(): Date; onUserCreated(user: { id: string; email: string; name: string | null; createdAt: Date }): void; }`
  - `requestRegistrationOtp(input: { name?: string; email: string; password: string }, deps: RegistrationOtpDeps): Promise<void>`
  - `verifyRegistrationOtp(input: { email: string; code: string }, deps: RegistrationOtpDeps): Promise<{ id: string; email: string; name: string | null; role: string; isOnDuty: boolean }>`

This is the pure logic layer — no Prisma import, no `resend` import, exactly mirroring `src/services/sosTrigger.ts`'s split from `src/services/sos.service.ts`. Everything it needs comes through `deps`, so it's tested directly with in-memory fakes.

- [ ] **Step 1: Write the failing tests**

```ts
// src/services/pendingRegistrationFlow.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
    requestRegistrationOtp,
    verifyRegistrationOtp,
    type PendingRegistrationRow,
    type RegistrationOtpDeps,
} from "@/services/pendingRegistrationFlow";

const TEN_MINUTES = 10 * 60 * 1000;

function createFakeDeps(overrides: Partial<RegistrationOtpDeps> = {}) {
    const pendingRows = new Map<string, PendingRegistrationRow>();
    const users = new Map<string, { id: string; email: string; name: string | null; role: string; isOnDuty: boolean; createdAt: Date }>();
    const sentEmails: { to: string; code: string }[] = [];
    const createdEvents: { id: string; email: string; name: string | null; createdAt: Date }[] = [];
    let clock = new Date("2026-09-29T03:00:00.000Z");
    let userSeq = 0;

    const deps: RegistrationOtpDeps = {
        pendingStore: {
            async findByEmail(email) {
                return pendingRows.get(email) ?? null;
            },
            async upsert(row) {
                pendingRows.set(row.email, row);
            },
            async incrementAttempts(email) {
                const row = pendingRows.get(email);
                if (row) row.attempts += 1;
            },
            async delete(email) {
                pendingRows.delete(email);
            },
        },
        userStore: {
            async findByEmail(email) {
                for (const user of users.values()) {
                    if (user.email === email) return { id: user.id };
                }
                return null;
            },
            async create(data) {
                const user = {
                    id: `user-${++userSeq}`,
                    email: data.email,
                    name: data.name,
                    role: "citizen",
                    isOnDuty: true,
                    createdAt: clock,
                };
                users.set(user.id, user);
                return user;
            },
        },
        // Fake "hash" is reversible on purpose (`hashed:${value}`) so
        // compareHash below can check equality without real bcrypt --
        // real bcrypt is exercised in Task 3's wiring, not here.
        hash: async (value) => `hashed:${value}`,
        compareHash: async (value, hash) => `hashed:${value}` === hash,
        sendOtpEmail: overrides.sendOtpEmail ?? (async (to, code) => {
            sentEmails.push({ to, code });
        }),
        now: () => clock,
        onUserCreated: (user) => {
            createdEvents.push(user);
        },
        ...overrides,
    };

    return {
        deps,
        pendingRows,
        users,
        sentEmails,
        createdEvents,
        advanceClock(ms: number) {
            clock = new Date(clock.getTime() + ms);
        },
        setClock(date: Date) {
            clock = date;
        },
    };
}

test("requestRegistrationOtp creates a pending row and sends the code", async () => {
    const { deps, pendingRows, sentEmails } = createFakeDeps();

    await requestRegistrationOtp({ name: "Juana", email: "juana@gmail.com", password: "secret123" }, deps);

    assert.equal(pendingRows.size, 1);
    const row = pendingRows.get("juana@gmail.com")!;
    assert.equal(row.attempts, 0);
    assert.equal(row.passwordHash, "hashed:secret123");
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].to, "juana@gmail.com");
    assert.equal(row.otpHash, `hashed:${sentEmails[0].code}`);
    assert.equal(row.otpExpiresAt.getTime(), new Date("2026-09-29T03:10:00.000Z").getTime());
});

test("requestRegistrationOtp rejects an email that already belongs to a real User", async () => {
    const { deps } = createFakeDeps();
    await deps.userStore.create({ email: "existing@gmail.com", name: "Existing", passwordHash: "x" });

    await assert.rejects(
        () => requestRegistrationOtp({ email: "existing@gmail.com", password: "secret123" }, deps),
        (err: any) => {
            assert.equal(err.statusCode, 409);
            return true;
        },
    );
});

test("requestRegistrationOtp blocks a resend within 60 seconds of the code actually being sent", async () => {
    const { deps, advanceClock } = createFakeDeps();

    await requestRegistrationOtp({ email: "juana@gmail.com", password: "secret123" }, deps);
    advanceClock(20_000); // 20s later

    await assert.rejects(
        () => requestRegistrationOtp({ email: "juana@gmail.com", password: "secret123" }, deps),
        (err: any) => {
            assert.equal(err.statusCode, 429);
            return true;
        },
    );
});

test("requestRegistrationOtp allows a resend once 60 seconds have passed", async () => {
    const { deps, advanceClock, sentEmails } = createFakeDeps();

    await requestRegistrationOtp({ email: "juana@gmail.com", password: "secret123" }, deps);
    advanceClock(60_000);
    await requestRegistrationOtp({ email: "juana@gmail.com", password: "secret123" }, deps);

    assert.equal(sentEmails.length, 2);
});

test("a failed verify attempt does not itself extend the resend cooldown (the updatedAt bug from spec review)", async () => {
    const { deps, advanceClock } = createFakeDeps();

    // 3:00:00 -- code requested
    await requestRegistrationOtp({ email: "juana@gmail.com", password: "secret123" }, deps);

    // 3:00:10 -- wrong guess
    advanceClock(10_000);
    await assert.rejects(() => verifyRegistrationOtp({ email: "juana@gmail.com", code: "000000" }, deps));

    // 3:00:20 -- resend: only 20s have passed since the code was actually
    // sent at 3:00:00, so this must still be blocked (not measured from
    // the 3:00:10 typo, which would otherwise push the block out further).
    advanceClock(10_000);
    await assert.rejects(
        () => requestRegistrationOtp({ email: "juana@gmail.com", password: "secret123" }, deps),
        (err: any) => {
            assert.equal(err.statusCode, 429);
            return true;
        },
    );

    // 3:01:00 -- exactly 60s since the ORIGINAL send: must now be allowed.
    advanceClock(40_000);
    await requestRegistrationOtp({ email: "juana@gmail.com", password: "secret123" }, deps); // must not throw
});

test("requestRegistrationOtp resets attempts to 0 on a resend", async () => {
    const { deps, pendingRows, advanceClock } = createFakeDeps();

    await requestRegistrationOtp({ email: "juana@gmail.com", password: "secret123" }, deps);
    await assert.rejects(() => verifyRegistrationOtp({ email: "juana@gmail.com", code: "000000" }, deps));
    assert.equal(pendingRows.get("juana@gmail.com")!.attempts, 1);

    advanceClock(60_000);
    await requestRegistrationOtp({ email: "juana@gmail.com", password: "secret123" }, deps);

    assert.equal(pendingRows.get("juana@gmail.com")!.attempts, 0);
});

test("requestRegistrationOtp allows an immediate resend once the previous code has expired", async () => {
    const { deps, advanceClock } = createFakeDeps();

    await requestRegistrationOtp({ email: "juana@gmail.com", password: "secret123" }, deps);
    advanceClock(TEN_MINUTES + 1000); // just past expiry -- also long past the 60s cooldown

    await requestRegistrationOtp({ email: "juana@gmail.com", password: "secret123" }, deps); // must not throw
});

test("requestRegistrationOtp propagates a send failure without leaving a false-success response", async () => {
    const { deps } = createFakeDeps({
        sendOtpEmail: async () => {
            throw Object.assign(new Error("send failed"), { statusCode: 502 });
        },
    });

    await assert.rejects(
        () => requestRegistrationOtp({ email: "juana@gmail.com", password: "secret123" }, deps),
        (err: any) => {
            assert.equal(err.statusCode, 502);
            return true;
        },
    );
});

test("verifyRegistrationOtp creates the User and deletes the pending row on a correct code", async () => {
    const { deps, pendingRows, sentEmails, createdEvents } = createFakeDeps();

    await requestRegistrationOtp({ name: "Juana", email: "juana@gmail.com", password: "secret123" }, deps);
    const code = sentEmails[0].code;

    const user = await verifyRegistrationOtp({ email: "juana@gmail.com", code }, deps);

    assert.equal(user.email, "juana@gmail.com");
    assert.equal(user.name, "Juana");
    assert.equal(pendingRows.has("juana@gmail.com"), false);
    assert.equal(createdEvents.length, 1);
});

test("verifyRegistrationOtp rejects when no pending registration exists", async () => {
    const { deps } = createFakeDeps();

    await assert.rejects(
        () => verifyRegistrationOtp({ email: "nobody@gmail.com", code: "123456" }, deps),
        (err: any) => {
            assert.equal(err.statusCode, 404);
            return true;
        },
    );
});

test("verifyRegistrationOtp rejects an expired code", async () => {
    const { deps, advanceClock, sentEmails } = createFakeDeps();

    await requestRegistrationOtp({ email: "juana@gmail.com", password: "secret123" }, deps);
    const code = sentEmails[0].code;
    advanceClock(TEN_MINUTES + 1000);

    await assert.rejects(
        () => verifyRegistrationOtp({ email: "juana@gmail.com", code }, deps),
        (err: any) => {
            assert.equal(err.statusCode, 410);
            return true;
        },
    );
});

test("verifyRegistrationOtp rejects a wrong code and increments attempts", async () => {
    const { deps, pendingRows } = createFakeDeps();

    await requestRegistrationOtp({ email: "juana@gmail.com", password: "secret123" }, deps);

    await assert.rejects(
        () => verifyRegistrationOtp({ email: "juana@gmail.com", code: "000000" }, deps),
        (err: any) => {
            assert.equal(err.statusCode, 401);
            return true;
        },
    );
    assert.equal(pendingRows.get("juana@gmail.com")!.attempts, 1);
});

test("verifyRegistrationOtp rejects after 5 attempts even with time remaining", async () => {
    const { deps, sentEmails } = createFakeDeps();

    await requestRegistrationOtp({ email: "juana@gmail.com", password: "secret123" }, deps);
    const realCode = sentEmails[0].code;

    for (let i = 0; i < 5; i++) {
        await assert.rejects(() => verifyRegistrationOtp({ email: "juana@gmail.com", code: "000000" }, deps));
    }

    // Even the correct code is now rejected -- attempts are exhausted.
    await assert.rejects(
        () => verifyRegistrationOtp({ email: "juana@gmail.com", code: realCode }, deps),
        (err: any) => {
            assert.equal(err.statusCode, 429);
            return true;
        },
    );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx tsx --test src/services/pendingRegistrationFlow.test.ts`
Expected: FAIL — `Cannot find module '@/services/pendingRegistrationFlow'`

- [ ] **Step 3: Write the implementation**

```ts
// src/services/pendingRegistrationFlow.ts
// Pure orchestration for the "request-otp -> verify-otp -> create User"
// registration flow. No Prisma, no Resend -- everything comes through
// `deps`, mirroring src/services/sosTrigger.ts's split from sos.service.ts,
// so this is unit-tested directly with in-memory fakes. See
// pendingRegistration.service.ts for the real Prisma/Resend wiring.
import crypto from "node:crypto";
import { AppError } from "@/utils/AppError";

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

export type PendingRegistrationRow = {
    email: string;
    name: string | null;
    passwordHash: string;
    otpHash: string;
    otpExpiresAt: Date;
    attempts: number;
};

export type CreatedUser = {
    id: string;
    email: string;
    name: string | null;
    role: string;
    isOnDuty: boolean;
    createdAt: Date;
};

export interface PendingRegistrationStore {
    findByEmail(email: string): Promise<PendingRegistrationRow | null>;
    upsert(row: PendingRegistrationRow): Promise<void>;
    incrementAttempts(email: string): Promise<void>;
    delete(email: string): Promise<void>;
}

export interface UserStore {
    findByEmail(email: string): Promise<{ id: string } | null>;
    create(data: { email: string; name: string | null; passwordHash: string }): Promise<CreatedUser>;
}

export interface RegistrationOtpDeps {
    pendingStore: PendingRegistrationStore;
    userStore: UserStore;
    hash(value: string): Promise<string>;
    compareHash(value: string, hash: string): Promise<boolean>;
    sendOtpEmail(to: string, code: string): Promise<void>;
    now(): Date;
    // Fires only on real account creation (verifyRegistrationOtp's success
    // path) -- lets the real wiring emit the same admin activity event
    // authService.register already emits today, without this pure module
    // knowing anything about realtime/emit.ts.
    onUserCreated(user: CreatedUser): void;
}

function generateOtp(): string {
    // 0..999_999 inclusive of leading zeros -- randomInt's upper bound is
    // exclusive, so 1_000_000 gives a uniform 6-digit space including "000000".
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function requestRegistrationOtp(
    input: { name?: string; email: string; password: string },
    deps: RegistrationOtpDeps,
): Promise<void> {
    const email = input.email.trim().toLowerCase();

    const existingUser = await deps.userStore.findByEmail(email);
    if (existingUser) {
        throw new AppError("Email already registered", 409);
    }

    const existingPending = await deps.pendingStore.findByEmail(email);
    if (existingPending) {
        const sentAt = existingPending.otpExpiresAt.getTime() - OTP_EXPIRY_MS;
        const elapsed = deps.now().getTime() - sentAt;
        if (elapsed < RESEND_COOLDOWN_MS) {
            throw new AppError("Please wait before requesting another code.", 429);
        }
    }

    const passwordHash = await deps.hash(input.password);
    const code = generateOtp();
    const otpHash = await deps.hash(code);
    const otpExpiresAt = new Date(deps.now().getTime() + OTP_EXPIRY_MS);

    await deps.pendingStore.upsert({
        email,
        name: input.name?.trim() || null,
        passwordHash,
        otpHash,
        otpExpiresAt,
        attempts: 0,
    });

    // Not caught here -- a send failure propagates to the caller (see
    // Global Constraints: request-otp must never look like it succeeded
    // when the email never went out).
    await deps.sendOtpEmail(email, code);
}

export async function verifyRegistrationOtp(
    input: { email: string; code: string },
    deps: RegistrationOtpDeps,
): Promise<CreatedUser> {
    const email = input.email.trim().toLowerCase();

    const pending = await deps.pendingStore.findByEmail(email);
    if (!pending) {
        throw new AppError("No pending registration for this email", 404);
    }

    if (pending.otpExpiresAt.getTime() < deps.now().getTime()) {
        throw new AppError("Code has expired. Request a new one.", 410);
    }

    if (pending.attempts >= MAX_ATTEMPTS) {
        throw new AppError("Too many attempts. Request a new code.", 429);
    }

    const matches = await deps.compareHash(input.code, pending.otpHash);
    if (!matches) {
        await deps.pendingStore.incrementAttempts(email);
        throw new AppError("Incorrect code", 401);
    }

    const user = await deps.userStore.create({
        email,
        name: pending.name,
        passwordHash: pending.passwordHash,
    });
    await deps.pendingStore.delete(email);
    deps.onUserCreated(user);

    return user;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsx --test src/services/pendingRegistrationFlow.test.ts`
Expected: PASS (13 tests)

- [ ] **Step 5: Run the full backend test suite to check for regressions**

Run: `npm test`
Expected: all existing suites still PASS, plus the 13 new ones

- [ ] **Step 6: Commit**

```bash
git add src/services/pendingRegistrationFlow.ts src/services/pendingRegistrationFlow.test.ts
git commit -m "feat(auth): add pure email-OTP registration orchestration logic"
```

---

### Task 2: `PendingRegistration` Prisma model + hand-written migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260929120000_add_pending_registration/migration.sql`

**Interfaces:**
- Produces: the `PendingRegistration` Prisma model (consumed by Task 3's real store implementation via `prisma.pendingRegistration.*`).

- [ ] **Step 1: Add the model to `prisma/schema.prisma`**

Append after the `User` model:

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

- [ ] **Step 2: Write the migration by hand**

Create `prisma/migrations/20260929120000_add_pending_registration/migration.sql`:

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

- [ ] **Step 3: Apply the migration directly against the database**

Run: `npx prisma db execute --file prisma/migrations/20260929120000_add_pending_registration/migration.sql`
Expected: no output on success (or a confirmation depending on Prisma version) — **do not** run `prisma migrate dev`, `prisma migrate reset`, or `prisma db push --accept-data-loss` (see Global Constraints: these are destructive against this project's drifted Neon DB and can offer to drop the Admin repo's own `Admin` table).

- [ ] **Step 4: Record the migration as applied, without re-running it**

Run: `npx prisma migrate resolve --applied 20260929120000_add_pending_registration`
Expected: confirms the migration is now recorded in `_prisma_migrations`

- [ ] **Step 5: Regenerate the Prisma Client**

Run: `npx prisma generate`
Expected: regenerates `src/generated/prisma` to include `PendingRegistration` types

- [ ] **Step 6: Verify the table exists and is usable**

Run:
```bash
npx prisma db execute --stdin <<'EOF'
INSERT INTO "PendingRegistration" (id, email, "passwordHash", "otpHash", "otpExpiresAt", "updatedAt")
VALUES ('smoke-test-1', 'smoke-test@gmail.com', 'x', 'y', now() + interval '10 minutes', now());
SELECT email, attempts FROM "PendingRegistration" WHERE id = 'smoke-test-1';
DELETE FROM "PendingRegistration" WHERE id = 'smoke-test-1';
EOF
```
Expected: the SELECT prints one row (`smoke-test@gmail.com`, `attempts=0`); the DELETE cleans it up — confirms the table, unique index, and defaults all work before anything in Task 3 depends on them.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors — confirms the regenerated Prisma Client's types compile cleanly (nothing consumes `PendingRegistration` yet, so this mainly guards against a schema typo)

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260929120000_add_pending_registration/
git commit -m "feat(db): add PendingRegistration table for email OTP verification"
```

---

### Task 3: Resend email wrapper + real Prisma-backed service wiring

**Files:**
- Create: `src/services/email.service.ts`
- Create: `src/services/pendingRegistration.service.ts`
- Modify: `package.json` (add `resend` dependency)

**Interfaces:**
- Consumes: everything from Task 1 (`RegistrationOtpDeps` and friends) and Task 2 (`prisma.pendingRegistration`, `prisma.user`).
- Produces (consumed by Task 4): `pendingRegistrationService.requestOtp(input: { name?: string; email: string; password: string }): Promise<void>` and `pendingRegistrationService.verifyOtp(input: { email: string; code: string }): Promise<{ user: { id: string; email: string; name: string | null; role: string; isOnDuty: boolean }; token: string }>`.

- [ ] **Step 1: Install the Resend SDK**

Run: `npm install resend`
Expected: adds `resend` to `package.json` dependencies

- [ ] **Step 2: Write `src/services/email.service.ts`**

```ts
// src/services/email.service.ts
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
        // The SDK resolves { data, error } instead of rejecting on a failed
        // send -- without this check, a bad API key, a Resend outage, or a
        // bounced address would silently look like success to the caller.
        throw new AppError("Couldn't send the verification email. Please try again.", 502);
    }
}
```

- [ ] **Step 3: Write `src/services/pendingRegistration.service.ts`**

```ts
// src/services/pendingRegistration.service.ts
// Real Prisma + Resend wiring for pendingRegistrationFlow.ts's pure logic --
// mirrors sos.service.ts's role relative to sosTrigger.ts.
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { emitAdminActivity } from "@/realtime/emit";
import { signToken } from "@/utils/jwt";
import { sendOtpEmail } from "@/services/email.service";
import {
    requestRegistrationOtp,
    verifyRegistrationOtp,
    type PendingRegistrationStore,
    type RegistrationOtpDeps,
    type UserStore,
} from "@/services/pendingRegistrationFlow";

const pendingStore: PendingRegistrationStore = {
    async findByEmail(email) {
        const row = await prisma.pendingRegistration.findUnique({ where: { email } });
        if (!row) return null;
        return {
            email: row.email,
            name: row.name,
            passwordHash: row.passwordHash,
            otpHash: row.otpHash,
            otpExpiresAt: row.otpExpiresAt,
            attempts: row.attempts,
        };
    },
    async upsert(row) {
        await prisma.pendingRegistration.upsert({
            where: { email: row.email },
            create: {
                email: row.email,
                name: row.name,
                passwordHash: row.passwordHash,
                otpHash: row.otpHash,
                otpExpiresAt: row.otpExpiresAt,
                attempts: row.attempts,
            },
            update: {
                name: row.name,
                passwordHash: row.passwordHash,
                otpHash: row.otpHash,
                otpExpiresAt: row.otpExpiresAt,
                attempts: row.attempts,
            },
        });
    },
    async incrementAttempts(email) {
        await prisma.pendingRegistration.update({
            where: { email },
            data: { attempts: { increment: 1 } },
        });
    },
    async delete(email) {
        await prisma.pendingRegistration.delete({ where: { email } }).catch(() => {});
    },
};

const userStore: UserStore = {
    async findByEmail(email) {
        // Case-insensitive, matching authService.register/updateProfile's
        // existing convention -- email here is already lowercased by
        // pendingRegistrationFlow before this is called, but a defensive
        // insensitive match costs nothing and stays consistent.
        const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
            select: { id: true },
        });
        return user;
    },
    async create(data) {
        const user = await prisma.user.create({
            data: { email: data.email, name: data.name, password: data.passwordHash },
        });
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isOnDuty: user.isOnDuty,
            createdAt: user.createdAt,
        };
    },
};

const deps: RegistrationOtpDeps = {
    pendingStore,
    userStore,
    hash: (value) => bcrypt.hash(value, 10),
    compareHash: (value, hash) => bcrypt.compare(value, hash),
    sendOtpEmail,
    now: () => new Date(),
    onUserCreated: (user) => {
        // Same event authService.register emits today on direct-create.
        emitAdminActivity({
            type: "user_registered",
            title: "New user registered",
            detail: user.name ?? user.email,
            occurredAt: user.createdAt.toISOString(),
        });
    },
};

export const pendingRegistrationService = {
    requestOtp(input: { name?: string; email: string; password: string }) {
        return requestRegistrationOtp(input, deps);
    },

    async verifyOtp(input: { email: string; code: string }) {
        const user = await verifyRegistrationOtp(input, deps);
        const token = signToken({ userId: user.id });
        return {
            user: { id: user.id, email: user.email, name: user.name, role: user.role, isOnDuty: user.isOnDuty },
            token,
        };
    },
};
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Manually verify against a real Resend account (requires `RESEND_API_KEY` set locally)**

Add `RESEND_API_KEY=<your test key>` to `.env` (create it if it doesn't exist; this repo has no `.env.example` to extend — see Task 4's env var note). Then in a scratch script or the Node REPL with the dev server running:

```bash
node --import tsx -e "
import { pendingRegistrationService } from './src/services/pendingRegistration.service.ts';
await pendingRegistrationService.requestOtp({ name: 'Test', email: 'YOUR_REAL_TEST_GMAIL@gmail.com', password: 'testpass123' });
console.log('sent — check your inbox');
"
```
Expected: no thrown error, and a real email arrives at the test address within a few seconds. This confirms the Resend wiring (not just the mocked logic from Task 1) actually works end-to-end before Task 4 builds HTTP routes on top of it.

- [ ] **Step 6: Commit**

```bash
git add src/services/email.service.ts src/services/pendingRegistration.service.ts package.json package-lock.json
git commit -m "feat(auth): wire real Resend + Prisma into the email-OTP registration flow"
```

---

### Task 4: Validation, rate limiting, controller, and routes

**Files:**
- Modify: `src/validations/auth.validation.ts`
- Modify: `src/middlewares/rateLimit.middleware.ts`
- Modify: `src/controllers/auth.controller.ts`
- Modify: `src/routes/auth.routes.ts`

**Interfaces:**
- Consumes: `pendingRegistrationService.requestOtp`/`verifyOtp` from Task 3.
- Produces: `POST /api/auth/register/request-otp`, `POST /api/auth/register/verify-otp` (consumed by Task 5's frontend service functions).

- [ ] **Step 1: Add the two validation schemas**

Modify `src/validations/auth.validation.ts` — add at the end:

```ts
export const requestRegistrationOtpSchema = registerSchema;

export const verifyRegistrationOtpSchema = z.object({
    email: z
        .string()
        .trim()
        .email("Invalid email address")
        .transform((value) => value.toLowerCase()),
    code: z
        .string()
        .length(6, "Code must be 6 digits")
        .regex(/^\d{6}$/, "Code must be 6 digits"),
});
```

- [ ] **Step 2: Add the two rate limiters**

Modify `src/middlewares/rateLimit.middleware.ts` — add at the end:

```ts
export const requestOtpLimiter = createRateLimiter(
    5 * 60 * 1000,
    5,
    "Too many verification code requests. Please try again in a few minutes."
);

export const verifyOtpLimiter = createRateLimiter(
    5 * 60 * 1000,
    10,
    "Too many attempts. Please try again in a few minutes."
);
```

- [ ] **Step 3: Add the two controller handlers**

Modify `src/controllers/auth.controller.ts` — add `pendingRegistrationService` to the imports and two new handlers to the exported object:

```ts
import { Request, Response } from "express";
import { authService } from "@/services/auth.service";
import { pendingRegistrationService } from "@/services/pendingRegistration.service";
import { asyncHandler } from "@/utils/asyncHandler";

export const authController = {
    register: asyncHandler(async (req: Request, res: Response) => {
        const { email, password, name } = req.body;
        const result = await authService.register(email, password, name);
        res.status(201).json({ success: true, ...result });
    }),

    requestRegistrationOtp: asyncHandler(async (req: Request, res: Response) => {
        const { name, email, password } = req.body;
        await pendingRegistrationService.requestOtp({ name, email, password });
        res.status(200).json({ success: true });
    }),

    verifyRegistrationOtp: asyncHandler(async (req: Request, res: Response) => {
        const { email, code } = req.body;
        const result = await pendingRegistrationService.verifyOtp({ email, code });
        res.status(200).json({ success: true, ...result });
    }),

    login: asyncHandler(async (req: Request, res: Response) => {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        res.status(200).json({ success: true, ...result });
    }),

    google: asyncHandler(async (req: Request, res: Response) => {
        const { idToken } = req.body;
        const result = await authService.loginWithGoogle(idToken);
        res.status(200).json({ success: true, ...result });
    }),
};
```

- [ ] **Step 4: Add the two routes**

Modify `src/routes/auth.routes.ts`:

```ts
import { Router } from "express";
import { authController } from "@/controllers/auth.controller";
import { validate } from "@/middlewares/validate.middleware";
import {
    loginLimiter,
    registerLimiter,
    requestOtpLimiter,
    verifyOtpLimiter,
} from "@/middlewares/rateLimit.middleware";
import {
    registerSchema,
    loginSchema,
    googleAuthSchema,
    requestRegistrationOtpSchema,
    verifyRegistrationOtpSchema,
} from "@/validations/auth.validation";

const router = Router();

router.post(
    "/auth/register",
    registerLimiter,
    validate(registerSchema),
    authController.register
);
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
router.post("/auth/login", loginLimiter, validate(loginSchema), authController.login);
router.post(
    "/auth/google",
    loginLimiter,
    validate(googleAuthSchema),
    authController.google
);

export default router;
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Start the dev server and manually verify both endpoints with curl**

Run: `npm run dev` (leave running in one terminal)

In a second terminal, using a real Gmail address you can read:

```bash
# Happy path
curl -i -X POST http://localhost:8000/api/auth/register/request-otp \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"YOUR_REAL_TEST_GMAIL@gmail.com","password":"testpass123"}'
# Expected: 200 {"success":true} — check your inbox for the 6-digit code

curl -i -X POST http://localhost:8000/api/auth/register/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_REAL_TEST_GMAIL@gmail.com","code":"THE_CODE_FROM_YOUR_INBOX"}'
# Expected: 200 {"success":true,"user":{...},"token":"..."}

# Wrong code
curl -i -X POST http://localhost:8000/api/auth/register/request-otp \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User 2","email":"YOUR_REAL_TEST_GMAIL@gmail.com","password":"testpass123"}'
curl -i -X POST http://localhost:8000/api/auth/register/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_REAL_TEST_GMAIL@gmail.com","code":"000000"}'
# Expected: 401 {"success":false,"message":"Incorrect code"}

# Immediate resend -- must 429
curl -i -X POST http://localhost:8000/api/auth/register/request-otp \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User 2","email":"YOUR_REAL_TEST_GMAIL@gmail.com","password":"testpass123"}'
# Expected: 429 {"success":false,"message":"Please wait before requesting another code."}

# Non-Gmail address -- must 400 at validation
curl -i -X POST http://localhost:8000/api/auth/register/request-otp \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"someone@yahoo.com","password":"testpass123"}'
# Expected: 400

# Malformed code -- must 400 at validation
curl -i -X POST http://localhost:8000/api/auth/register/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_REAL_TEST_GMAIL@gmail.com","code":"12a45"}'
# Expected: 400
```

- [ ] **Step 7: Run the full backend test suite**

Run: `npm test`
Expected: all suites PASS (no test file directly covers the HTTP layer added in this task — matches this repo's existing precedent of testing pure logic/middleware only, not routes; the curl pass above is this task's real verification)

- [ ] **Step 8: Commit**

```bash
git add src/validations/auth.validation.ts src/middlewares/rateLimit.middleware.ts src/controllers/auth.controller.ts src/routes/auth.routes.ts
git commit -m "feat(auth): add POST /auth/register/request-otp and /verify-otp endpoints"
```

---

### Task 5: Frontend service functions + Register screen

**Files:**
- Modify: `services/auth.service.ts`
- Modify: `app/(auth)/register.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/register/request-otp`, `POST /api/auth/register/verify-otp` from Task 4.
- Produces: `requestRegistrationOtp(name, email, password): Promise<void>`, `verifyRegistrationOtp(email, code): Promise<RegisterResponse>` (consumed by Task 6's Verify Email screen).

- [ ] **Step 1: Add the two functions to `services/auth.service.ts`**

Add after the existing `registerUser` function (leave `registerUser` itself in place — `POST /api/auth/register` stays live and unused-but-present, per Global Constraints):

```ts
export async function requestRegistrationOtp(
  name: string,
  email: string,
  password: string,
): Promise<void> {
  await apiPost("/api/auth/register/request-otp", { name, email, password });
}

export async function verifyRegistrationOtp(
  email: string,
  code: string,
): Promise<RegisterResponse> {
  return apiPost<RegisterResponse>("/api/auth/register/verify-otp", { email, code });
}
```

- [ ] **Step 2: Update `app/(auth)/register.tsx` to call request-otp instead of registering directly**

Replace the imports and `handleRegister`:

```tsx
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AuthFooter from "@/components/auth/AuthFooter";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthInput from "@/components/auth/AuthInput";
import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import KeyboardSafeView from "@/components/common/KeyboardSafeView";
import { requestRegistrationOtp } from "@/services/auth.service";
import {
    RADIUS,
    SPACING,
    TYPOGRAPHY,
    useIsDarkTheme,
    useThemeColors,
    type ColorPalette,
} from "@/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();
  const isDark = useIsDarkTheme();
  const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (!email.trim().toLowerCase().endsWith("@gmail.com")) {
      setError("Only Gmail addresses (@gmail.com) are allowed.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      await requestRegistrationOtp(name, trimmedEmail, password);
      router.push({
        pathname: "/verify-email",
        params: { email: trimmedEmail, name, password },
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={COLORS.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <KeyboardSafeView style={styles.transparentFlex}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + SPACING.md },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <BackButton
            onPress={() => router.push("/login")}
            style={styles.back}
          />

          <AuthHeader
            title="Sign up"
            subtitle="Create an account to continue"
          />

          <AuthInput
            label="Full Name"
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
          />

          <AuthInput
            label="Email"
            placeholder="Enter your email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <AuthInput
            label="Set Password"
            placeholder="Enter your password"
            secureTextEntry
            secureToggle
            value={password}
            onChangeText={setPassword}
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <PrimaryButton
            title="Register"
            loading={loading}
            onPress={handleRegister}
          />

          <AuthFooter
            promptText="Already have an account?"
            actionText="Login"
            onPress={() => router.push("/login")}
          />
        </ScrollView>
      </KeyboardSafeView>
    </View>
  );
}

function createStyles(COLORS: ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: COLORS.background,
    },

    transparentFlex: {
      flex: 1,
    },

    container: {
      flexGrow: 1,
      justifyContent: "flex-start",
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xl,
    },

    back: {
      marginBottom: SPACING.lg,
    },

    errorBanner: {
      backgroundColor: `${COLORS.danger}${isDark ? "26" : "14"}`,
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      marginBottom: SPACING.sm,
    },

    error: {
      color: COLORS.danger,
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "600",
    },
  });
}
```

Note what changed from today's file: the `useAuth`/`login` import and usage are gone (login now happens on the Verify Email screen instead), `registerUser` is replaced with `requestRegistrationOtp`, and a successful call navigates to `/verify-email` with `email`/`name`/`password` as router params instead of calling `login()` directly.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: this will show one error at this point — `Property '(auth)/verify-email' does not exist` (or similar, from `typedRoutes`) — because the route doesn't exist yet. That's expected; Task 6 creates it. If any *other* error appears, fix it before proceeding.

- [ ] **Step 4: Commit**

```bash
git add services/auth.service.ts "app/(auth)/register.tsx"
git commit -m "feat(auth): register screen requests an email OTP instead of creating the account directly"
```

---

### Task 6: Verify Email screen + route registration

**Files:**
- Create: `app/(auth)/verify-email.tsx`
- Modify: `app/(auth)/_layout.tsx`

**Interfaces:**
- Consumes: `verifyRegistrationOtp`/`requestRegistrationOtp` from Task 5, `useAuth().login` from `context/AuthContext.tsx` (existing, unchanged signature: `login(token: string, user, needsOnboardingFlag = false)`).

- [ ] **Step 1: Register the new route**

Modify `app/(auth)/_layout.tsx`:

```tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ThemeProvider } from "@/context/ThemeContext";
import { LIGHT_COLORS } from "@/theme/colors";

export default function AuthLayout() {
  return (
    <ThemeProvider forceLight>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: LIGHT_COLORS.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="verify-email" />
        <Stack.Screen name="forgot-password" />
      </Stack>
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Write `app/(auth)/verify-email.tsx`**

```tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AuthHeader from "@/components/auth/AuthHeader";
import AuthInput from "@/components/auth/AuthInput";
import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import KeyboardSafeView from "@/components/common/KeyboardSafeView";
import { useAuth } from "@/context/AuthContext";
import type { ApiError } from "@/services/api";
import { requestRegistrationOtp, verifyRegistrationOtp } from "@/services/auth.service";
import {
    RADIUS,
    SPACING,
    TYPOGRAPHY,
    useIsDarkTheme,
    useThemeColors,
    type ColorPalette,
} from "@/theme";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();
  const isDark = useIsDarkTheme();
  const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);
  const { email, name, password } = useLocalSearchParams<{
    email: string;
    name: string;
    password: string;
  }>();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function handleVerify() {
    if (code.trim().length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const result = await verifyRegistrationOtp(email, code.trim());
      await login(result.token, result.user, true);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 410 || apiErr.status === 429) {
        // Expired or too-many-attempts -- both mean "this code is dead,"
        // so let the user resend immediately instead of waiting out
        // whatever's left of the (now-moot) countdown.
        setCooldown(0);
      }
      setError(
        err instanceof Error ? err.message : "Verification failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;

    setError(null);
    setResending(true);
    try {
      await requestRegistrationOtp(name, email, password);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't resend the code. Please try again.",
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={COLORS.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <KeyboardSafeView style={styles.transparentFlex}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + SPACING.md },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <BackButton onPress={() => router.back()} style={styles.back} />

          <AuthHeader
            title="Verify Your Email"
            subtitle={`Enter the 6-digit code we sent to ${email}`}
          />

          <AuthInput
            label="Verification Code"
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            rightLabel={
              resending
                ? "Sending…"
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend code"
            }
            onRightLabelPress={cooldown > 0 || resending ? undefined : handleResend}
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <PrimaryButton title="Verify" loading={loading} onPress={handleVerify} />
        </ScrollView>
      </KeyboardSafeView>
    </View>
  );
}

function createStyles(COLORS: ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: COLORS.background,
    },

    transparentFlex: {
      flex: 1,
    },

    container: {
      flexGrow: 1,
      justifyContent: "flex-start",
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xl,
    },

    back: {
      marginBottom: SPACING.lg,
    },

    errorBanner: {
      backgroundColor: `${COLORS.danger}${isDark ? "26" : "14"}`,
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      marginBottom: SPACING.sm,
    },

    error: {
      color: COLORS.danger,
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "600",
    },
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (the route now exists, resolving Task 5's expected error)

- [ ] **Step 4: Manual end-to-end check on a real device/simulator**

Run: `npx expo start` (or your existing dev-client workflow), then:
1. Go to Register, fill in a real Gmail address you can read, submit.
2. Confirm you land on "Verify Your Email" showing that address, and the "Resend code" link shows a counting-down "Resend in 59s" / "58s" / ... that reaches "Resend code" (tappable) at 0.
3. Check the inbox, enter the wrong code once — confirm "Incorrect code" shows and the resend countdown is unaffected by this (still counting down from whatever it already was, not reset — this is the Task 1 bug fix showing up in the real UI).
4. Enter the correct code — confirm you're logged in and land wherever a fresh registration normally lands today (phone-number onboarding).
5. Register a second, different test address; this time let the code sit unused for 10+ minutes, then submit it — confirm "This code expired..." and that Resend is immediately tappable (not stuck on a stale countdown).

- [ ] **Step 5: Commit**

```bash
git add "app/(auth)/verify-email.tsx" "app/(auth)/_layout.tsx"
git commit -m "feat(auth): add Verify Email screen for the registration OTP flow"
```

---

### Task 7: Full regression pass, Google Sign-In check, and deployment notes

No new code in this task — it closes out the plan's remaining explicit requirements (Google Sign-In compatibility, env vars, Neon/Render deployment) with a verification checklist, since none of them are exercised by the tasks above on their own.

- [ ] **Step 1: Confirm Google Sign-In is unaffected**

On the same running app, sign up with **Google Sign-In** (a Google account not previously used in this app) via `GoogleButton.tsx`. Expected: account is created immediately, no OTP/Verify Email screen ever appears — confirms `POST /api/auth/google` and its controller/service path were never touched by this plan.

- [ ] **Step 2: Confirm the old direct-create route is untouched**

```bash
curl -i -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Old Path Test","email":"another_real_test@gmail.com","password":"testpass123"}'
```
Expected: 201, account created immediately (no OTP) — confirms `POST /api/auth/register` still works exactly as before, for anything that might still call it.

- [ ] **Step 3: Run both repos' full test suites one final time**

```bash
cd "CordovaRiskQ-Bacnkend" && npm test
cd "../CordovaRiskQ-Frontend" && npx tsc --noEmit
```
Expected: all backend tests PASS; frontend typecheck has no errors.

- [ ] **Step 4: Confirm required environment variables are documented and set for deployment**

On the Render (or equivalent) dashboard for the backend service, confirm these are set (this repo has no `.env.example` to update — see Global Constraints for the full list):
- `RESEND_API_KEY` — from the Resend dashboard, **required**; without it, `request-otp` will 502 on every call.
- `EMAIL_FROM` — optional; if unset, defaults to `"Cordova RiskQ <onboarding@resend.dev>"` (Resend's own test-domain sender, works without any DNS setup).

- [ ] **Step 5: Confirm the migration applies cleanly on the deployed Neon database**

Since Task 2's migration was applied directly against whichever `DATABASE_URL` was active locally, explicitly re-run the same two commands (Task 2 Steps 3–4) against the **production** Neon connection string before or during deploy, exactly as `2026-09-21-hotlines-backend-design.md`'s migration was rolled out — this repo's migrations are not auto-applied by `npm run build`/`npm start` or by Render, so a forgotten manual step here means `PendingRegistration` simply won't exist in production and every `request-otp` call will 500.

- [ ] **Step 6: Final commit (if any deployment-only config was changed)**

Only if Step 4/5 required committing anything (e.g. a README/deployment note) — otherwise this task produces no commit, since Steps 1–5 are verification against already-committed code.
