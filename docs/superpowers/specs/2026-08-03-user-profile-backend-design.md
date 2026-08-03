# User Profile & Change Password Backend — Design

**Date:** 2026-08-03
**Repos touched:** `CordovaRiskQ-Frontend` (this repo) and `CordovaRiskQ-Bacnkend` (sibling repo, `C:\Users\kianr\CordovaRiskQ-Bacnkend` — Express + Prisma/Postgres + JWT, TypeScript, ESM with `@/` path aliases).

## Purpose

Replace the mocked, non-persisting User Profile and Change Password screens with real backend-backed behavior. Today:

- `app/user-profile/index.tsx` seeds fields from `useAuth().user` plus a hardcoded `MOCK_MOBILE` constant, and Save just calls `router.back()` — nothing is sent anywhere.
- `app/change-password/index.tsx` collects old/new/confirm password and Save also just calls `router.back()`.
- `services/user.service.ts`'s `getProfile()` is an unused stub returning a hardcoded `{ name: "Guest", email: "guest@example.com" }`.
- The backend has no endpoint for reading/updating a profile or changing a password, and — more fundamentally — **no middleware verifies the JWT on any request**. `signToken`/`verifyToken` exist, but nothing currently calls `verifyToken` on an incoming request.

This spec covers building the three endpoints, the auth middleware they depend on, and wiring the two frontend screens to call them for real.

## Scope

1. Backend: JWT-verifying auth middleware.
2. Backend: `GET /api/users/me`, `PUT /api/users/me`, `POST /api/users/change-password`.
3. Backend: Prisma schema gains `User.mobile String?` (migration).
4. Frontend: `services/api.ts` gains an `apiPut` helper and optional bearer-token support on `apiGet`/`apiPost`/`apiPut`.
5. Frontend: `services/user.service.ts` gains real `getProfile`, `updateProfile`, `changePassword`.
6. Frontend: `context/AuthContext.tsx` gains an `updateUser` method so a saved name/email propagates to the rest of the app (e.g. the Profile screen header) without requiring a re-login.
7. Frontend: `user-profile/index.tsx` and `change-password/index.tsx` call the real services, show a loading state while the initial profile fetch is in flight, and surface errors via `Alert.alert` instead of silently navigating back.

## Out of scope

- **Avatar upload.** The avatar block stays the decorative placeholder it is today (no `onPress`, no `avatarUrl` field). Deferred to its own future feature — it needs an image picker and a storage/CDN decision first.
- **Email verification.** Editing email in this pass only re-checks uniqueness (`409` on conflict); no confirmation-email flow. Consistent with the app having no email-verification flow anywhere yet.
- **Letting Google-only users set an initial password.** A user with no password on file gets a clear rejection (`401`, "This account uses Google Sign-In and has no password to change.") rather than a "set password" flow.
- **Automated tests.** Neither repo has a test setup today; verification is manual (see Testing below), consistent with how prior specs in this series (e.g. [2026-07-31-user-profile-design.md](./2026-07-31-user-profile-design.md)) were verified.
- **Refactoring `test.routes.ts`/`test.controller.ts`** on the backend, or anything unrelated to these three endpoints.

## Architecture

### Backend

New auth middleware, `src/middlewares/authenticate.middleware.ts`: reads the `Authorization: Bearer <token>` header, calls the existing `verifyToken`, and attaches the decoded `userId` to `req` (extending Express's `Request` type via a local `AuthenticatedRequest` interface, matching how the rest of this codebase favors small typed helpers over `any`). Missing header, malformed header, or a token that fails verification all throw `AppError(401, ...)`, handled by the existing global `errorHandler` — no new error-response shape.

New files, mirroring the existing `auth.*` layering exactly:

- `src/validations/user.validation.ts` — `updateProfileSchema` (`name` optional string, `email` required valid email, `mobile` optional string), `changePasswordSchema` (`oldPassword` required, `newPassword` min 6 chars — same rule `registerSchema` uses).
- `src/services/user.service.ts` — `getById`, `updateProfile` (re-checks email uniqueness against *other* users before writing, throws `AppError(409, "Email already in use")` on conflict), `changePassword` (throws `AppError(401, ...)` if `user.password` is null; otherwise bcrypt-compares `oldPassword`, throws `AppError(401, "Old password is incorrect")` on mismatch, else hashes and updates `newPassword`).
- `src/controllers/user.controller.ts` — thin `asyncHandler`-wrapped handlers calling the service, same shape as `auth.controller.ts`.
- `src/routes/user.routes.ts` — all three routes behind `authenticate`: `GET /users/me`, `PUT /users/me` (validated), `POST /users/change-password` (validated). Mounted in `src/routes/index.ts` alongside `authRoutes`.

Prisma: add `mobile String?` to `model User` in `prisma/schema.prisma`, run a migration (`npm run db:migrate`).

### Frontend

`services/api.ts`: add `apiPut<T>(path, body, token?)` mirroring `apiPost`; both it and `apiGet`/`apiPost` gain an optional trailing `token?: string` param that, when present, sets `Authorization: Bearer ${token}`. This is the first authenticated call the frontend makes, so the header attachment is new but the request-building pattern is unchanged.

`services/user.service.ts`: replace the stub with

```ts
export type UserProfile = { id: string; name: string | null; email: string; mobile: string | null };
getProfile(token: string): Promise<UserProfile>          // GET /api/users/me
updateProfile(token: string, payload: { name?: string; email: string; mobile?: string }): Promise<UserProfile>  // PUT /api/users/me
changePassword(token: string, payload: { oldPassword: string; newPassword: string }): Promise<void>  // POST /api/users/change-password
```

`context/AuthContext.tsx`: add `updateUser: (user: AuthUser) => Promise<void>` to the context value — writes the new user to `SecureStore` (same key, same shape as `login` already does) and updates state, without touching the token.

`app/user-profile/index.tsx`: on mount, `useEffect` calls `getProfile(token)`; while pending, render a loading state instead of the form (simple — no skeleton, just a centered `ActivityIndicator`, matching this being a small utility screen). On resolve, seed `firstName`/`lastName` (via existing `splitName`)/`email`/`mobile` from the response, replacing today's `MOCK_MOBILE`. `handleSave` becomes `async`: calls `updateProfile(token, { name: \`${firstName} ${lastName}\`.trim(), email, mobile })`, then `updateUser({ id, name, email })` from the response, then `router.back()`; on thrown error, `Alert.alert("Update failed", error.message)` and stay on the screen.

`app/change-password/index.tsx`: `handleSave` becomes `async`: calls `changePassword(token, { oldPassword, newPassword })`, on success `router.back()`, on thrown error `Alert.alert("Change password failed", error.message)` and stay on the screen (fields keep their current values so the user doesn't have to retype everything).

Both screens read `token` from `useAuth()`.

## Data flow

1. **Load:** `user-profile` screen mounts → `getProfile(token)` → `GET /api/users/me` with bearer token → `authenticate` middleware resolves `userId` → service reads the row via Prisma → controller returns `{ success: true, user: {...} }` → screen populates fields.
2. **Save profile:** form submit → `updateProfile(token, {...})` → `PUT /api/users/me` → middleware resolves `userId` → service checks email uniqueness, updates row → returns updated user → screen calls `updateUser(...)` on `AuthContext` (propagates app-wide) → `router.back()`.
3. **Change password:** form submit → `changePassword(token, {...})` → `POST /api/users/change-password` → middleware resolves `userId` → service loads user, validates `oldPassword` (or rejects Google-only accounts), hashes and writes `newPassword` → `{ success: true }` → `router.back()`.

## Error handling

All server-side failures throw `AppError(message, statusCode)` and flow through the existing `errorHandler` → `{ success: false, message }` JSON response; no new error-response convention is introduced. Cases covered:

- `401` — missing/malformed/invalid/expired bearer token; wrong `oldPassword`; `changePassword` called on a Google-only account.
- `409` — `updateProfile` email collides with a different existing user.
- `400` — zod validation failures (e.g. malformed email, `newPassword` under 6 chars) via the existing `validate` middleware.

`apiGet`/`apiPost`/`apiPut` already throw on non-OK responses; both screens catch and surface `error.message` via `Alert.alert`, matching the existing `Alert.alert` usage pattern in `app/(tabs)/profile.tsx`'s logout confirmation.

## Testing

Manual verification (neither repo has an automated test setup):

**Backend**, via curl/Postman against the running dev server:
- `GET /api/users/me` with a valid token → 200 with current profile; without/with a bad token → 401.
- `PUT /api/users/me` with a valid, non-conflicting email → 200 and persisted change; with an email already used by another user → 409.
- `POST /api/users/change-password` with correct `oldPassword` → 200 and the new password logs in successfully afterward; with wrong `oldPassword` → 401; against a Google-only test account → 401 with the Google-specific message.

**Frontend**, running the app against the local backend:
- Edit and save a profile; confirm the change persists after an app restart (SecureStore) and reflects immediately on the Profile screen header (via `updateUser`).
- Attempt a password change with an incorrect old password; confirm the `Alert` surfaces the server's message and the screen doesn't navigate away.
- Attempt a password change on a Google-only test account; confirm the clear rejection message appears.
