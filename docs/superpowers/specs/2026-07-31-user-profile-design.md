# User Profile Edit Screen — Design

**Date:** 2026-07-31
**Source design:** user-provided screenshot of the "User Profile" screen from the "Cordova RiskQ Emergency App" claude.ai design project (same source referenced in prior specs in this series, most recently [2026-07-31-profile-design.md](./2026-07-31-profile-design.md)).

## Purpose

Replace `app/user-profile/index.tsx`'s current "Coming Soon" stub — reached from the Profile screen's "User Profile" row — with the real edit-profile form from the prototype.

## Scope

The User Profile screen, top to bottom:

1. Header: back button, centered "User Profile" title
2. Avatar edit block: large pink-tinted circle with a person-outline icon, small red camera badge overlaid bottom-right
3. Four labeled, pill-shaped text fields: First Name, Last Name, E-Mail, Mobile
4. "Save" button

## Out of scope

- **Real photo upload.** No image picker integration — same decision as the Report Incident form's `PhotoPicker` (this app doesn't yet touch device camera/photo-library capabilities). The camera badge renders but has no `onPress`.
- **Real profile-update backend call.** No `PUT/PATCH /api/users/me`-style endpoint exists. "Save" is a mock action: no service call, just navigates back.
- **Real mobile number data.** No `mobile` field exists anywhere in this app (`AuthUser` only has `id`/`name`/`email`). It's a local mock constant, consistent with how onboarding already mocks the phone-number step.
- **Field validation.** Fields start pre-filled from real user data (where available) and Save doesn't persist anything, so there's nothing to validate against.
- **`services/user.service.ts`'s existing `getProfile()` stub.** It returns a shape (`{ name, email }`) that doesn't match this screen's fields and appears unused elsewhere in the app; left untouched, out of scope.

## Architecture

New `components/user-profile/` folder (mirrors the existing per-screen-domain component pattern):

- **`ProfileAvatarEdit`** — a large (matching the screenshot's proportions) circle in `COLORS.primaryTint` containing a centered `Ionicons name="person-outline"` in `COLORS.primary`, plus a small circular badge (`COLORS.primary` background, white `camera` icon) absolutely positioned at the bottom-right edge of the circle. No props, no `onPress` — purely decorative for now. Distinct from `components/common/Avatar.tsx` (which renders initials) — this screen's screenshot shows a generic placeholder icon instead, not the user's initials.
- **`ProfileFieldInput`** — a labeled, fully-rounded (`RADIUS.full`) single-line text input: small label above (matching `AuthInput`'s label styling), rounded-pill `TextInput` below. Built as a new component rather than extending `components/auth/AuthInput.tsx`, because `AuthInput`'s container radius (`RADIUS.md`) and shadow styling are tuned for the already-shipped login/register screens and aren't exposed for per-instance override — changing them there would risk altering those screens' approved look for no reason. Props: `{ label: string; value: string; onChangeText: (text: string) => void } & Pick<TextInputProps, "keyboardType" | "autoCapitalize">` (so the E-Mail field can set `keyboardType="email-address"` / `autoCapitalize="none"`, matching `AuthInput`'s existing precedent for those two props).

`app/user-profile/index.tsx` composes: inline header row (`BackButton` + centered "User Profile" `Text`, matching the inline-header precedent already used in `app/(tabs)/report.tsx`) → `ProfileAvatarEdit` → the four `ProfileFieldInput`s → `PrimaryButton` "Save". All in a `ScrollView`, following this app's standard `insets.top`-padded, `COLORS.background`-backed layout convention.

## Data flow

- **Local component state**, seeded once (via `useState` initializers, not `useEffect`) from `useAuth().user`:
  - `firstName` = first word of `user?.name`, `lastName` = remaining words joined (both empty string if `user` is null)
  - `email` = `user?.email ?? ""`
  - `mobile` = local mock constant `"+63 917 555 0142"` (no real source)
- No service calls; `useAuth()` is the only external data dependency.

## Navigation

| Element | Destination |
|---|---|
| Back button (header) | `router.back()` |
| Save | `router.back()` (mock action, no persistence) |

## Error handling

None needed — no validation, no network call, nothing that can fail.

## Testing

No automated test suite exists in this repo (consistent with prior specs). Verification is manual via `expo start`:

- Navigating from Profile's "User Profile" row lands here with First Name/Last Name/E-Mail pre-filled from the logged-in user's real name/email, and Mobile showing the mock placeholder number
- Back button returns to the Profile screen
- All four fields are editable (typing updates local state)
- Camera badge on the avatar has no effect when tapped (renders, but inert)
- "Save" returns to the Profile screen
