# Onboarding (Phone Number Step) — Design

**Date:** 2026-08-05
**Repos touched:** `CordovaRiskQ-Frontend` (this repo) and `CordovaRiskQ-Bacnkend` (sibling repo, `C:\Users\kianr\CordovaRiskQ-Bacnkend`).

## Purpose

Make the existing post-signup "onboarding" flow (phone number → terms of service) real. Today:

- `app/(auth)/phone-number.tsx` collects a phone number into local state only. "Continue" always navigates to `/terms` regardless of what (or whether anything) was entered — nothing is validated or persisted.
- `app/(auth)/terms.tsx` is unchanged by this spec — it stays a local-only "scroll to the bottom, then agree" UI gate. There is no backend field for terms acceptance and this spec doesn't add one.
- `app/(auth)/login.tsx` sends **every** successful login through `/phone-number`, not just first-time signups — this reads as a bug rather than intended behavior, since it means returning users see the "onboarding" phone-number screen on every login.
- `components/auth/GoogleButton.tsx` skips phone-number/terms entirely for both new and returning Google accounts — new Google sign-ups never get asked for a phone number today.
- Now that the User Profile & Change Password backend work ([2026-08-03-user-profile-backend-design.md](./2026-08-03-user-profile-backend-design.md)) added `User.mobile` and `PUT /api/users/me`, the phone-number screen has a real endpoint to save to.
- `app/_layout.tsx`'s `RootLayoutNav` redirect effect sends any authenticated user sitting on an `(auth)`-group screen straight to `/(tabs)/home`. This races `register.tsx`'s `router.push("/phone-number")` (both fire off the same `login()` state change) and, as written today, wins — an authenticated user on any `(auth)` screen, including `phone-number`, gets redirected home regardless of which specific screen it is. This must be fixed for onboarding to reliably show at all.

This spec covers making the phone-number step persist to the backend, showing it exactly once (right after a fresh registration or Google sign-up, never on login), and fixing the redirect race that currently undermines it.

## Scope

1. Frontend: new `app/(onboarding)/` route group holding `phone-number.tsx` and `terms.tsx` (moved out of `(auth)`), with its own `_layout.tsx`.
2. Frontend: `app/_layout.tsx`'s redirect effect becomes three-way across `(auth)` / `(onboarding)` / `(tabs)`, fixing the race described above.
3. Frontend: `phone-number.tsx` validates a minimum-length phone number, saves it via `PUT /api/users/me`, and blocks-with-retry on failure.
4. Frontend: `login.tsx` no longer routes to `/phone-number` — existing users go straight home on login, same as returning Google users already do.
5. Frontend: `GoogleButton.tsx` routes new Google sign-ups (not returning users) to `/phone-number`.
6. Backend: `POST /api/auth/google` response gains `isNewUser: boolean`, so the frontend can distinguish a brand-new Google account from a returning one.

## Out of scope

- **Terms-of-Service persistence.** No new backend field (e.g. `termsAcceptedAt`); `terms.tsx`'s logic is unchanged, only its file location moves.
- **Gating onboarding on whether `mobile` is set.** Onboarding shows exactly once, immediately after a fresh registration or Google sign-up. Existing accounts (created before this feature, or anyone who dismisses onboarding via the back button) are never retroactively prompted — they can fill in `mobile` later via the User Profile screen, same as today.
- **Server-side minimum-length validation for `mobile`.** `updateProfileSchema`'s `mobile: z.string().optional()` is unchanged; the 10-digit minimum is enforced only on the onboarding screen's "Continue" button, not backend-wide, since `PUT /api/users/me` is shared with the general-purpose Profile screen edit where a stricter format would be unwelcome.
- **International phone number formats.** The existing `formatPhone` helper's US-style `(555) 123-4567` formatting is unchanged.
- **Automated tests.** Neither repo has a test setup; verification is manual (see Testing below).

## Architecture

### Routing & gating (frontend)

New group `app/(onboarding)/`:
- `phone-number.tsx`, `terms.tsx` (moved from `app/(auth)/`, logic changes below).
- `_layout.tsx` — a plain `Stack` with `screenOptions={{ headerShown: false }}`, mirroring `app/(auth)/_layout.tsx`.

`app/(auth)/_layout.tsx` drops its `phone-number` and `terms` `<Stack.Screen>` entries.

`app/_layout.tsx`'s `RootLayoutNav` redirect effect becomes:

```ts
const inAuthGroup = segments[0] === "(auth)";
const inOnboardingGroup = segments[0] === "(onboarding)";

if (!isAuthenticated && !inAuthGroup) {
  router.replace("/(auth)/login");
} else if (isAuthenticated && inAuthGroup) {
  router.replace("/(tabs)/home");
}
// isAuthenticated && inOnboardingGroup: no redirect — left alone.
```

Expo Router group folders don't appear in the URL, so `router.push("/phone-number")` / `router.push("/terms")` call sites are unchanged by the move.

### Backend

`src/services/auth.service.ts`'s `loginWithGoogle` gains an `isNewUser` boolean in its return value: `true` only when the "brand new user, Google-only" branch runs (`prisma.user.create`), `false` for both the "found by `googleId`" (returning user) and "found by email, linked" (existing password account adding Google) branches. `src/controllers/auth.controller.ts`'s `google` handler needs no change — it already spreads `...result` into the JSON response.

### Frontend screens

`app/(onboarding)/phone-number.tsx`:
- Reads `token` and `user.email` from `useAuth()`.
- Adds `isSaving` state. "Continue" is disabled while `phone.length < 10` or while `isSaving`.
- On Continue: `await updateProfile(token, { email: user.email, mobile: formatPhone(phone) })` — saves the formatted display string (e.g. `"(555) 123-4567"`), matching the free-text format the User Profile screen already round-trips.
- On success: `router.push("/terms")` (unchanged).
- On failure: `Alert.alert("Couldn't save phone number", error.message)`, stays on the screen, `isSaving` cleared in `finally` — blocks with retry rather than silently advancing.

`app/(onboarding)/terms.tsx`: moved only, no logic changes.

`app/(auth)/login.tsx`: removes the `router.push("/phone-number")` call after `login()`. The root layout's "authenticated + in `(auth)`" redirect now handles sending existing users home, matching how returning Google users are already routed today.

`app/(auth)/register.tsx`: unchanged — still `router.push("/phone-number")` after `login()`, which now lands correctly instead of racing the auto-redirect.

`components/auth/GoogleButton.tsx`: after `googleAuth(idToken)` resolves, check `result.isNewUser`. If `true`, `router.push("/phone-number")`. If `false`, do nothing (unchanged — the root layout's redirect sends them home).

`services/auth.service.ts`: `GoogleAuthResponse` gains `isNewUser: boolean`.

## Data flow

1. **Register:** `register.tsx` → `registerUser()` → `login()` (sets `isAuthenticated`) → `router.push("/phone-number")` → root layout sees `isAuthenticated && inOnboardingGroup` → no redirect → phone-number screen renders.
2. **Google sign-up (new account):** `GoogleButton` → `googleAuth(idToken)` → backend creates the user, returns `isNewUser: true` → `login()` → `router.push("/phone-number")` → same as above.
3. **Google sign-in (returning account):** `GoogleButton` → `googleAuth(idToken)` → backend returns `isNewUser: false` → `login()` only → root layout sees `isAuthenticated && inAuthGroup` (still on `/login`) → redirects to `/(tabs)/home`.
4. **Login (existing user):** `login.tsx` → `loginUser()` → `login()` only → same redirect-to-home as (3).
5. **Save phone number:** `phone-number.tsx` Continue → `updateProfile(token, { email, mobile })` → `PUT /api/users/me` → on success, `router.push("/terms")`; on failure, `Alert.alert` and stay.
6. **Finish onboarding:** `terms.tsx` "I Agree & Continue" → `router.replace("/home")` (unchanged) → now in `(tabs)`, so the root layout's redirect rules no longer apply to this screen.

## Error handling

`PUT /api/users/me` failures (network error, `401` expired token, `400` validation) are caught in `phone-number.tsx` and surfaced via `Alert.alert("Couldn't save phone number", error.message)`, matching the `Alert.alert` pattern already used in `user-profile/index.tsx` and `change-password/index.tsx`. The screen does not advance to `/terms` on failure — the user can retry immediately or back out via the existing `BackButton`.

## Testing

Manual verification (neither repo has an automated test setup):

**Backend**, via curl against the running dev server:
- `POST /api/auth/google` with a token for a brand-new Google account → response includes `isNewUser: true`.
- `POST /api/auth/google` with a token for an already-existing Google account (call it twice) → second call's response includes `isNewUser: false`.
- `PUT /api/users/me` with a valid `mobile` value → 200, persisted (already covered by the prior spec's testing, re-verified here in the onboarding context).

**Frontend**, running the app against the local backend:
- Register a new account → confirm the phone-number screen appears (not skipped, not immediately redirected to home).
- On phone-number, confirm Continue is disabled under 10 digits, enabled at 10.
- Stop the backend, tap Continue with a valid number → confirm an `Alert` appears and the screen stays put (retry path).
- Restart the backend, tap Continue again → confirm it saves and advances to Terms, then Home.
- Confirm the saved mobile number appears on the User Profile screen afterward.
- Log out, log back in with an existing (already-onboarded) account → confirm login goes straight to Home, no phone-number screen.
- Sign up with a brand-new Google account → confirm the phone-number screen appears.
- Sign in with an existing Google account → confirm it goes straight to Home, no phone-number screen.
