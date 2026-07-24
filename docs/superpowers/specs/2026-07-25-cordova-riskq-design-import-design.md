# Cordova RiskQ — Design Import & Implementation

**Date:** 2026-07-25
**Source design:** claude.ai/design project "Cordova RiskQ Emergency App" (`20958154-bc63-4aeb-b906-632746bc826d`), file `Cordova RiskQ.dc.html` — an interactive clickable prototype (iOS-frame mockup) covering onboarding, home, SOS, incident reporting, evacuation centers, notifications, report history, profile, and emergency contacts.

## Purpose

Implement the screens and flows defined in the prototype as real, functional Expo/React Native screens in this codebase, replacing the current stub screens and restyling the working auth screens to match. This is a UI implementation pass: no new backend contracts are introduced — screens are wired to the existing `services/*.ts` layer, with stub services updated to return mock data shaped like the prototype's.

## Out of scope

- Real map integration (react-native-maps, WebView+Leaflet, or otherwise) — the map/evacuation-list visuals use a **static placeholder** in place of an interactive map, since the map library choice is still undecided. This is the one deliberate visual deviation from the prototype.
- Backend/API changes. Phone number and Terms-of-Service acceptance captured during onboarding are **local UI state only** — not persisted or sent anywhere (no backend field exists for them yet).
- `app/settings/index.tsx` — not part of the design, left untouched.
- Dark mode / `ThemeContext` — left as-is, out of scope.
- Automated test suite — none exists in the repo today; verification is manual (see Testing).

## Architecture

### Routing changes

**`app/(auth)/` (Stack, unchanged group)**
- `login.tsx`, `register.tsx` — restyled to match the design's Sign in / Sign up screens. Existing backend calls (`loginUser`, `registerUser`, `useAuth().login()`) and navigation to `/home` on success are preserved, but the flow now passes through the two new screens first.
- `phone-number.tsx` **(new)** — numeric keypad entry screen matching the prototype's phone-number step. Local component state only (`useState<string>`). "Continue" navigates to `terms`.
- `terms.tsx` **(new)** — scrollable Terms of Service. Tracks scroll position; the CTA reads "Scroll to Bottom" (disabled style) until the user reaches the bottom, then becomes "I Agree & Continue" and navigates to `/home`.
- `forgot-password.tsx` — untouched stub. Signin's "Forgot Password?" text gets a `Link` to this route (it currently has no handler in the prototype, but the route already exists in this app, so wiring it is a trivial, low-risk improvement).
- Flow order: `register` (or `login`) → `phone-number` → `terms` → `/home`.

**`app/(tabs)/` (Tabs group, restructured)**
- Custom tab bar (not the default `Tabs` icon row) rendered via the `tabBar` prop, matching the prototype's 4-visible-tab + raised-center-FAB layout:
  - `home.tsx` — Home
  - `map.tsx` — repurposed as the **Evacuation Centers list** screen (prototype's `isEvacuation`)
  - `report.tsx` **(new)** — the incident-creation form (prototype's `isReport`). Not shown as a normal tab button; reached only via the raised center FAB. Still a `Tabs.Screen` so it participates in the tab navigator's back-stack behavior.
  - `reports.tsx` → renamed **`report-history.tsx`** — the prototype's `isReportHistory` list (was previously an unstyled stub named for the wrong concept).
  - `profile.tsx` — Profile, existing logic preserved (already has real `useAuth()`/logout wiring), restyled.
  - `notifications.tsx` **(removed from this group)** — see below.

**Promoted to plain (non-tab) pushed routes:**
- `app/notifications/index.tsx` **(new; moved out of `(tabs)`)** — reached via the bell icon in Home's header.
- `app/evacuation-detail/[id].tsx` **(new)** — reached from evacuation-center cards (Home's "Nearest Evacuation Center", the evacuation list, notification items). `[id]` is currently only used to look up mock data; no backend lookup.
- `app/contacts/index.tsx` **(new)** — reached from Home's "Emergency Contacts" quick action and from Profile's "Emergency Contacts" row.

**Removed:**
- `app/sos/index.tsx` — deleted. The prototype's SOS confirm/active states are a global overlay, not a navigable screen (see SOS Overlay below), so this stub route is dead weight once the overlay exists.
- `app/history/index.tsx` — deleted. Redundant with the new `report-history` tab; was an unlinked "Coming Soon" stub.

### SOS overlay

A new `context/SosContext.tsx` (`SosProvider` / `useSos()`) holds `sosStage: 'idle' | 'confirm' | 'active'`, mounted in `app/_layout.tsx` alongside the existing providers.

- Home's SOS button calls `openConfirm()`.
- While `sosStage !== 'idle'`, an overlay renders above the currently mounted tab screen (absolutely positioned, full-bleed, `zIndex` above tab content) showing either the confirm dialog ("Send Emergency SOS?" / Cancel / Send SOS) or the active state (pulsing rings, "Help Is On The Way", estimated arrival, Cancel SOS) — mirroring the prototype's `showSOSConfirm` / `showSOSActive` behavior, which is rendered outside any individual screen's `sc-if` block.
- `confirmSOS()` calls the existing `triggerSOS()` stub and moves to `active`. `cancelSOS()` resets to `idle` from either stage.
- The tab bar hides while `sosStage !== 'idle'`, matching the prototype's `showTabBar` logic.

### Theming

`theme/colors.ts` updated to the prototype's palette:
- Accent: `#C8102E` (replaces current `primary: #B70F0F`), with a computed/derived darker variant for gradients (SOS active background) and a light tint variant (icon chips, selected-category backgrounds) — mirroring the prototype's `mix()`/`tint()`/`darken()` helpers, reimplemented as small color-utility functions or precomputed constants.
- Neutrals: background `#F7F6F4` (screen bg), `#EDEBE7` (auth/onboarding bg), card border `#F1F0EE`, input bg `#F9F8F6`/border `#E5E3DF`, text `#17181A` (primary) / `#6B7280` (secondary) / `#9CA3AF` (tertiary/placeholder) / `#C7C5C1` (disabled/faint).
- Status colors for tide levels and report statuses: success `#1E8E3E`/`#EAF7EE`, warning `#B45309`/`#FEF3E2` (existing `warning`/`success` tokens are close but get adjusted to these exact values for fidelity).

`constants/theme.ts` is touched only where the new custom tab bar needs an active-tint color; it otherwise stays as-is (out of scope to unify the two theme systems).

## Screens & data (mock data shapes)

All list/detail data is added to the relevant stub service file so it's easy to swap for real API calls later:

- **`services/location.service.ts`** — stays a stub; evacuation center list becomes a local mock array in `evacuation.service.ts` **(new)**: `{ id, name, address, distanceKm, capacity: {current, max}, status: 'open'|'full', facilities: string[] }`, seeded with the prototype's 3 centers.
- **`services/report.service.ts`** — `createReport(payload)` stays a stub returning `{ success, payload, ref }`; add mock `getReportHistory()` returning the prototype's 3 sample entries (`{ category, location, date, ref, status, statusColor, statusBg }`).
- **`services/notification.service.ts`** — `getNotifications()` returns the prototype's mock feed (`{ id, type, title, body, timestamp, group: 'today'|'earlier' }`).
- **`services/contacts.service.ts` (new)** — `getHotlines()` returns the prototype's 4 hotlines; `getMyContacts()` / `addContact()` are stubs (single seeded "Mama Beckett" contact + an "Add Contact" affordance that's UI-only for now, consistent with the mock-data decision).
- **`services/sos.service.ts`** — `triggerSOS()` stays a stub returning `{ success: true }`.
- Home's weather (`29°C, Partly Cloudy`) and tide-level (`Normal` / `Watch` / `Warning`) values are local mock constants, matching how the prototype treats them as component props with defaults — no service needed.

Category selection on the Report screen (Flood / Fire / Medical Emergency / Road Accident / Other, each with its own icon shape and color) is local component state, not a service concern.

## Testing

No automated test suite exists in this repo. Verification is manual via `expo start` (web target, then one native target if available): walk every flow — register → phone → terms → home; SOS open → confirm → active → cancel; report create → submit → confirmation → report history; evacuation list → detail; notifications; contacts; profile → logout. Confirm the tab bar hides during SOS and the FAB navigates to the Report screen correctly.
