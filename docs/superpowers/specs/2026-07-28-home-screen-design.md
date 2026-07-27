# Home Screen — Design

**Date:** 2026-07-28
**Source design:** prototype screenshot of the Home screen from the "Cordova RiskQ Emergency App" claude.ai design project (same source referenced in [2026-07-25-cordova-riskq-design-import-design.md](./2026-07-25-cordova-riskq-design-import-design.md)).

## Purpose

Implement `app/(tabs)/home.tsx` as a real, functional screen. It's currently a one-line stub (`<Text>Home Screen</Text>`), the last major screen from the original design-import pass that was never built out. This spec covers only the Home screen; it supersedes what the 2026-07-25 doc said about Home where the two disagree (see Deviations below).

## Scope

The Home screen, top to bottom:

1. Brand header (logo + wordmark) with a notification bell
2. Greeting + location + weather
3. Tide-level status banner
4. SOS trigger button
5. Quick actions row (Report Incident / Evacuation Center / Emergency Contacts)
6. Nearest Evacuation Center card
7. Safety Tips list

## Out of scope

- **SOS overlay** (confirm/active states). `SosContext` already tracks `stage: idle|confirm|active`; Home's SOS button calls `openConfirm()`, but nothing renders the overlay yet anywhere in the app. This is a known, deliberate gap — pressing SOS on Home will change context state with no visible effect until a future task builds the overlay.
- **Real content/screens for Emergency Contacts and Evacuation Detail.** Both are reachable from Home but neither route exists yet. This task adds minimal "Coming Soon" stub routes for them (matching the existing style of `map.tsx`/`report.tsx` before they were built out) so navigation doesn't 404 — not full implementations.
- Real weather/location/tide data or services — all local mock constants, matching how the original design-import spec treated these values.
- Cleaning up `components/ui/*` (unused generic scaffolding) — untouched, unrelated to this task.

## Deviations from the 2026-07-25 spec

- That doc didn't mention a "Safety Tips" section; the actual prototype screenshot shows one below the fold. It's included here as a small local mock list.
- That doc implied Home's greeting could use real user data; this spec mocks both the name and location as local constants (weather/tide were already planned as mocks). `location.service.ts` only returns raw `{latitude, longitude}` today, not a readable address, and there's no reason to special-case just the name — auth's `user.name` isn't wired to a home-specific greeting anywhere else in the app.

## Architecture

New `components/home/` folder (mirrors the existing `components/auth/` pattern — dedicated, theme-token-driven components per screen, not the generic/unused `components/ui/*`):

- **`HomeHeader`** — brand row (logomark + "CORDOVA RISKQ" wordmark) + bell icon button. Bell shows a red dot when `getNotifications()` returns a non-empty list. Tap → `/notifications`.
- **`GreetingBlock`** — "Hello, {name}!" + location line + weather (temp + description). All local mock constants.
- **`TideBanner`** — status card (icon, "Tide Level: {level}", description). Takes a `{level: "normal"|"watch"|"warning", message}` shape and maps to `COLORS.success/warning/danger`, even though only `"normal"` is exercised today.
- **`QuickActionsRow`** — 3 fixed cards: Report Incident, Evacuation Center, Emergency Contacts.
- **`EvacuationCenterCard`** — nearest-center summary (name, distance, status). Thumbnail reuses the existing `components/common/PlaceholderThumb` rather than a new placeholder implementation.
- **`SafetyTipsList`** — renders a small local mock array of `{title, body}` tips.

**SOS button is not a new component under `components/home/`.** `components/sos/SOSButton.tsx` already exists for exactly this purpose but is currently unstyled scaffolding with zero imports anywhere in the app. This task restyles it in place (theme tokens, large circular hero button) instead of creating a near-duplicate. It stays in `components/sos/` since it's SOS-domain UI that a future overlay task will also touch, colocated with the equally-unused `SOSCard.tsx` (whose `{title, message}` shape already matches the eventual confirm/active overlay content).

`app/(tabs)/home.tsx` composes all of the above in a `ScrollView`.

## Data flow

**Local mock constants** (component-level, no service):
- Greeting name: `"Carl"`; location: `"Barangay Poblacion, Cordova"`; weather: `29°C`, `"Partly Cloudy"`
- Tide: `{ level: "normal", message: "No flooding risk detected in your area." }`
- Safety tips: 3–4 short `{title, body}` entries

**From existing services** (fetched on mount via `useEffect`/`useState`; no loading UI — these resolve instantly with static, always-non-empty mock data, so there's no meaningful loading/error/empty state to design for yet):
- `getEvacuationCenters()` (`services/evacuation.service.ts`) → nearest center by `distanceKm` feeds `EvacuationCenterCard`
- `getNotifications()` (`services/notification.service.ts`) → bell dot shows if the list is non-empty

## Navigation

Following this repo's existing convention of full group-qualified paths (e.g. `router.push("/(tabs)/home")` in `app/_layout.tsx`):

| Element | Destination |
|---|---|
| Bell icon | `router.push("/notifications")` (existing stub route) |
| "Report Incident" quick action | `router.push("/(tabs)/report")` |
| "Evacuation Center" quick action | `router.push("/(tabs)/map")` (already repurposed as the evacuation list) |
| "Emergency Contacts" quick action | `router.push("/contacts")` — **new stub route**, `app/contacts/index.tsx` |
| Evacuation center card tap | ``router.push(`/evacuation-detail/${id}`)`` — **new stub route**, `app/evacuation-detail/[id].tsx` |
| SOS button | `useSos().openConfirm()` (no visible effect yet — see Out of scope) |

Both new stub routes render a simple "Coming Soon" placeholder, matching the current style of `map.tsx`/`report.tsx` before those were built out.

## Error handling

Minimal by design. All data is either a local constant or a mock service call that resolves synchronously with static, non-empty data — there's no real failure surface yet. No spinners, retries, or error boundaries in this task; revisit once these services talk to a real backend.

## Testing

No automated test suite exists in this repo (confirmed in the 2026-07-25 spec). Verification is manual via `expo start` (web target):

- Home renders all seven sections in order and matches the prototype screenshot's structure
- Bell icon → `/notifications`
- Quick actions → `/(tabs)/report`, `/(tabs)/map`, `/contacts` (new stub, no 404)
- Evacuation center card → `/evacuation-detail/[id]` (new stub, no 404)
- SOS button press changes `useSos().stage` to `"confirm"` without crashing (verify via React DevTools or a temporary log, since no overlay renders)
