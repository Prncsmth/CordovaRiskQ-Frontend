# Change Password Bottom Sheet — Design

**Date:** 2026-07-31
**Source design:** user-provided screenshot of the "Change Password" screen from the "Cordova RiskQ Emergency App" claude.ai design project (same source referenced in prior specs in this series, most recently [2026-07-31-user-profile-design.md](./2026-07-31-user-profile-design.md)).

## Purpose

Replace `app/change-password/index.tsx`'s current "Coming Soon" stub — reached from the Profile screen's "Change Password" row — with a bottom-sheet form for changing the account password, presented over the Profile screen (which stays dimmed and visible behind it), matching the prototype.

## Scope

The Change Password sheet, top to bottom:

1. Drag handle bar
2. "Change Password" title (red, centered)
3. Three masked password fields, placeholder-only (no separate labels): Old Password, New Password, Confirm Password
4. "SAVE" button, disabled until Old Password is non-empty, New Password is non-empty, and New Password equals Confirm Password

Dismiss interactions: tapping the dimmed backdrop, or dragging the sheet down past a threshold. Both return to the Profile screen underneath.

## Out of scope

- **Real password-change backend call.** No such endpoint exists (`services/auth.service.ts` only has login/register/google). "SAVE" is a mock action — no service call, just dismisses the sheet.
- **Old-password verification.** Nothing checks the entered Old Password against anything real; it's only required to be non-empty, consistent with the mock-everything pattern used elsewhere in this app.
- **Password strength rules.** No minimum length, character-class requirements, etc. — only the non-empty + match checks described above.

## Architecture

**Presentation:** `/change-password` becomes a `transparentModal`-presented route. One new `<Stack.Screen name="change-password/index" options={{ presentation: "transparentModal", animation: "fade" }} />` entry is added to the root `Stack` in `app/_layout.tsx` (alongside the existing `(auth)`/`(tabs)` entries). `@react-navigation/native-stack`'s own type docs (checked directly in `node_modules` before this design) list `transparentModal` with no Android-fallback caveat — unlike `formSheet`, `pageSheet`, `modal`, and `fullScreenModal`, which all explicitly degrade to a plain `modal` on Android. `transparentModal` keeps the previous screen (Profile) visible underneath on both platforms.

**Post-implementation correction (found via live device testing, not caught by tsc/eslint/web bundle checks):** the `Stack.Screen` `name` must be the full route name Expo Router registers for a `folder/index.tsx` file — `"change-password/index"`, not `"change-password"` — otherwise the options are silently dropped (a console warning fires, and the screen falls back to default `"card"` presentation, hiding Profile instead of dimming it). Also, `animation: "slide_from_bottom"` moves the whole transparent screen including the backdrop, making the dim visibly sweep up instead of fading in place — `"fade"` is used instead, with the sheet's own position (already anchored to the bottom via `justifyContent: "flex-end"`) providing the "bottom sheet" look without a screen-level slide.

**New `components/change-password/PasswordSheet.tsx`** — a generic bottom-sheet shell: `{ children, onClose }`. Renders a dimmed backdrop (`TouchableOpacity`, tap → `onClose`) behind a white, top-rounded (`RADIUS.xl`) sheet containing a drag-handle bar and `children`. Built with `react-native-gesture-handler`'s `Gesture.Pan()` and `react-native-reanimated`'s `useSharedValue`/`useAnimatedStyle` (both already project dependencies — no new packages) to track a vertical drag on the sheet and call `onClose` once dragged down past a threshold, snapping back to position otherwise. This is the one piece the navigator's own transition can't provide; everything else (backdrop dimming, entrance/exit animation) comes from `transparentModal` + `slide_from_bottom` for free.

**`app/change-password/index.tsx`** renders `PasswordSheet` with `onClose={() => router.back()}`, and inside it: the "Change Password" title, three password fields, and the "SAVE" button. Owns all local form state.

**Reused, lightly extended component:** `components/user-profile/ProfileFieldInput.tsx` (already shipped, part of the User Profile screen) gets three additive, backward-compatible changes:
- `label` becomes optional — when omitted, the label row isn't rendered (this screen's fields have no labels)
- new optional `placeholder?: string` prop, passed through to the underlying `TextInput`
- new optional `secureTextEntry?: boolean` prop, passed through to mask input

User Profile's own usage (which always passes `label` and never passes the two new props) is unaffected.

## Data flow

- Local component state in `app/change-password/index.tsx`: `oldPassword`, `newPassword`, `confirmPassword` (all `useState("")`).
- `canSave = oldPassword.length > 0 && newPassword.length > 0 && newPassword === confirmPassword`. "SAVE" is disabled (`PrimaryButton`'s existing `disabled` support) until true.
- No service calls, no `AuthContext` interaction.

## Navigation

| Element | Destination |
|---|---|
| Profile's "Change Password" row | `router.push("/change-password")` (already wired, unchanged) |
| Backdrop tap | `router.back()` |
| Swipe sheet down past threshold | `router.back()` |
| "SAVE" (when enabled) | mock action → `router.back()` |

## Error handling

None needed — no network call, and the only validation (non-empty + match) directly gates the Save button rather than surfacing an error state.

## Testing

No automated test suite exists in this repo (consistent with prior specs). Verification is manual via `expo start`, on a real device or simulator rather than web — gesture/drag behavior and modal presentation can't be verified in a browser (a limitation already noted in the User Profile screen's final review):

- Tapping "Change Password" on Profile shows the sheet sliding up from the bottom, with Profile visible and dimmed behind it
- Tapping the dimmed backdrop dismisses the sheet back to Profile
- Dragging the sheet down past a threshold dismisses it; a smaller drag snaps back to position
- "SAVE" is disabled until Old Password is filled, New Password is filled, and New Password matches Confirm Password; becomes enabled once all three hold
- Tapping "SAVE" while enabled dismisses the sheet back to Profile
- All three fields mask their input (dots/bullets, not plain text)
- The User Profile screen (`app/user-profile/index.tsx`) still renders and behaves identically after `ProfileFieldInput`'s prop changes — its fields still show labels, since it always passes `label`
