# Profile Screen — Design

**Date:** 2026-07-31
**Source design:** user-provided screenshot of the "Profile" screen from the "Cordova RiskQ Emergency App" claude.ai design project (same source referenced in [2026-07-25-cordova-riskq-design-import-design.md](./2026-07-25-cordova-riskq-design-import-design.md), [2026-07-29-report-incident-design.md](./2026-07-29-report-incident-design.md), and [2026-07-31-report-history-design.md](./2026-07-31-report-history-design.md)).

## Purpose

Replace `app/(tabs)/profile.tsx`'s current minimal implementation (name, email, a single "Log Out" button) with the full Profile screen from the prototype: avatar + welcome header, a grouped menu of account/settings rows, and a Contact Support card.

## Scope

The Profile screen, top to bottom:

1. "Profile" title
2. Header row: avatar (2-letter initials), "Welcome" + full name, small logout icon button (top-right)
3. A single bordered, rounded card containing 5 stacked rows, each with an icon-in-circle, a label, and either a red chevron or (for the last row) a toggle switch:
   - User Profile → chevron
   - Change Password → chevron
   - Emergency Contacts → chevron
   - FAQs → chevron
   - Push Notification → `Switch`, default on
4. Contact Support card (pink background): reassurance line + "Contact Support" link

## Out of scope

- **Real destination screens for User Profile, Change Password, FAQs, Contact Support.** Each gets a new minimal "Coming Soon" stub route, matching the existing pattern (`app/notifications/index.tsx`, `app/settings/index.tsx`). Building out their real content is future work.
- **Real push notification registration.** No `expo-notifications` integration (not a project dependency) — the toggle is local `useState`, UI-only, consistent with this app's existing mock-behind-a-toggle pattern (`PhotoPicker`'s attach toggle).
- **Emergency Contacts implementation.** Reuses the existing `app/contacts/index.tsx` stub unchanged; not part of this task.
- **`app/settings/index.tsx`.** Not linked from the new Profile screen (the screenshot has no generic "Settings" row) and remains untouched, consistent with the original design-import spec's decision to leave it out of scope.
- **Backend/API changes.** User identity comes from the existing `useAuth().user` (unchanged); no new service.

## Architecture

New `components/profile/` folder (mirrors the existing `components/home/`, `components/report/`, `components/report-history/` per-screen-domain pattern):

- **`ProfileHeader`** — renders the `Avatar`, "Welcome" caption + user's full name, and a small circular icon-only logout button (`Ionicons name="log-out-outline"`, `COLORS.primary`). Tapping it runs the same confirm-`Alert` → `logout()` → `router.replace("/(auth)/login")` flow already in `profile.tsx` today (moved here, not duplicated).
- **`MenuRow`** — one reusable row: an icon in a bordered circle (`COLORS.border`, icon color `COLORS.text` — plain, not per-item-colored, matching the screenshot's uniform gray/black rows), a label, and a `right` slot defaulting to a red (`COLORS.primary`) chevron-forward icon. The Push Notification row passes `right={<Switch ... />}` instead of relying on the default. Used for all 5 rows; `app/(tabs)/profile.tsx` renders them inside one bordered card with a 1px `COLORS.borderMuted` divider between consecutive rows (no divider after the last).
- **`ContactSupportCard`** — static card: `COLORS.primaryTint` background (the app's established light-pink card color — already used by `TideBanner`, `SafetyTipsList`, `QuickActionsRow`, `SOSButton`), a centered reassurance line, and a bold underlined "Contact Support" link.

`components/common/Avatar.tsx` (existing, currently unused anywhere in the app) gets two small changes: derive initials from the first letter of the first two whitespace-separated words in `name` (was: first letter only), and switch its hardcoded `#2563eb`/`#fff` to `COLORS.primary`/`COLORS.white`. Safe to change directly since no other screen currently imports it.

`app/(tabs)/profile.tsx` composes `ProfileHeader` → the bordered menu card (5 `MenuRow`s) → `ContactSupportCard`, in a `ScrollView`, following the same `insets.top`-padded, `COLORS.background`-backed layout convention as every other tab screen (`home.tsx`, `report-history.tsx`).

Four new stub routes, each a minimal "Coming Soon" placeholder identical in structure to the existing `app/notifications/index.tsx`:
- `app/user-profile/index.tsx`
- `app/change-password/index.tsx`
- `app/faqs/index.tsx`
- `app/contact-support/index.tsx`

## Data flow

- **`useAuth().user`** (existing `AuthContext`, unchanged): `name` and `email` — already what `profile.tsx` reads today.
- **Local component state**: Push Notification's on/off value (`useState(true)`), UI-only.
- No new services.

## Navigation

| Element | Destination |
|---|---|
| Logout icon (header) | Confirm `Alert` → `logout()` → `router.replace("/(auth)/login")` |
| User Profile row | `router.push("/user-profile")` |
| Change Password row | `router.push("/change-password")` |
| Emergency Contacts row | `router.push("/contacts")` (existing route, unchanged) |
| FAQs row | `router.push("/faqs")` |
| Push Notification row | no navigation — `Switch` toggles local state only |
| Contact Support link | `router.push("/contact-support")` |

All four new stub routes are plain pushed routes outside the `(tabs)` group, matching the existing convention (`app/notifications/index.tsx`, `app/contacts/index.tsx`) — no header, no back button, same as those existing stubs.

## Error handling

None needed: the screen is static UI plus local state plus the already-working `logout()` call, which already has its own confirm-dialog safeguard.

## Testing

No automated test suite exists in this repo (consistent with prior specs). Verification is manual via `expo start`:

- Avatar shows the correct 2-letter initials and the header shows "Welcome" + the logged-in user's full name
- Tapping the logout icon shows the confirm dialog; confirming logs out and returns to the login screen; canceling does nothing
- Each of the 4 new-stub rows (User Profile, Change Password, FAQs) and the Contact Support link navigates to its "Coming Soon" stub; Emergency Contacts navigates to the existing `/contacts` stub
- Push Notification switch toggles between on/off and holds its state while on the screen
- Card/divider layout visually matches the screenshot (single bordered card, dividers between rows, no divider after the last row)
