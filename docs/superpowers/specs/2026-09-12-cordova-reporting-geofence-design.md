# Cordova-only reporting geofence

## Problem

Incident reports and SOS alerts can currently be submitted from anywhere —
there's no check that the reporter, or the location they're reporting, is
actually inside the Municipality of Cordova, Cebu. This introduces a strict
geofence so both the citizen's live GPS position and (for incident reports)
the pin they drop on the map must fall inside Cordova's official boundary
before a report or SOS alert is accepted, enforced identically on the
frontend (for instant feedback) and the backend (as the actual authority).

## Scope

- **In scope**: the Incident Reporting flow (pin-drop on `app/(tabs)/map.tsx`
  → `app/(tabs)/report.tsx` submit) and the SOS flow (`SosContext`).
- **Out of scope**: Responder screens and the Evacuation Map's other
  purpose (viewing evacuation centers) are untouched — the map stays fully
  viewable/pannable/zoomable regardless of the citizen's location; only the
  *reporting* entry points are gated.
- Two sibling repos are involved: `CordovaRiskQ-Frontend` (this repo) and
  `CordovaRiskQ-Bacnkend` (Express + Prisma). They have no shared package
  today (see `constants/location.ts`'s existing header comment) — this
  feature continues that pattern: the same boundary data and validation
  logic are duplicated deliberately, one small copy per repo.

## Boundary data

Cordova's official administrative boundary is available in OpenStreetMap as
relation `10337872` (admin boundary, matches the municipality's known
center point exactly, ~110-point single `Polygon` including municipal
waters — small enough to bundle directly, no simplification needed).

Fetched once and committed as a static asset in both repos:
- Frontend: `constants/cordovaBoundary.geojson.json`
- Backend: `src/constants/cordovaBoundary.geojson.json`

Each file carries a header comment noting the OSM relation ID and fetch
date, so it can be re-fetched later if the boundary is ever redrawn —
mirroring `constants/location.ts`'s "kept in sync manually" convention.

## Shared validation utility

Add `@turf/boolean-point-in-polygon` + `@turf/helpers` (not the full
`@turf/turf` bundle) to both repos. One utility per repo, same shape:

```ts
// utils/geofence.ts (frontend) / src/utils/geofence.ts (backend)
export function isInsideCordova(latitude: number, longitude: number): boolean
```

Loads the boundary JSON once at module scope, wraps
`booleanPointInPolygon`. Every check in both repos — map tap, live GPS
watch, pin-button tap, report submit, SOS trigger, backend middleware —
calls this one function. Boundary points count as inside (turf's
`booleanPointInPolygon` treats the boundary as part of the polygon by
default).

## Frontend: Incident Reporting Map (`app/(tabs)/map.tsx`)

### Boundary rendering

Add `showCordovaBoundary?: boolean` to `MapEngineProps`. Both engines
import the boundary JSON directly (not passed through props) and render it
when the flag is set:

- **Mapbox** (`MapboxMap.tsx`): `ShapeSource` + `FillLayer` (light blue,
  low opacity) + `LineLayer` (solid blue outline), per the ticket.
- **Leaflet** (`LeafletMap.tsx`, Expo Go dev fallback): `L.geoJSON` with
  matching fill/outline, so the boundary and the tap-gate are both
  testable in Expo Go, not just native builds.

Zoom/pan/rotation are untouched. Only `map.tsx` passes
`showCordovaBoundary` — Home, `PinnedLocationCard`, and Responder screens
don't.

### Tap-to-place-pin

`handleMapPress` runs `isInsideCordova(lat, lon)` on the tapped point:

- **Inside**: unchanged (haptic, `setPickedPoint`, `setReportLocation`).
- **Outside**: the pin is never placed — no marker left behind. A small
  auto-dismissing toast appears (new `components/common/GeofenceToast.tsx`
   — `COLORS.danger` pill, warning icon, ~2.5s auto-dismiss, controlled by
  local state in `map.tsx`, no global toast system needed for a single
  call site): **"Outside Cordova — Please select a location within
  Cordova."** The map stays fully interactive.

### Pin button — fresh-fix gate

Entering pin mode (`handleTogglePinMode`, off → on) first fetches a fresh,
one-shot, high-accuracy GPS fix and validates it — it does not trust the
continuous watch state, which can be a few seconds stale. While in flight:
- `PinButton` gets a new `loading?: boolean` prop (mirrors `LocateButton`'s
  `isLocating`): swaps its icon for a small `ActivityIndicator` and ignores
  taps.
- A small transient hint bubble appears near the button — reusing the
  existing `pinHint` BlurView-pill visual pattern already in `map.tsx` —
  reading **"Getting your accurate location..."**.

Result:
- Fix resolves inside Cordova → pin mode activates as today.
- Fix resolves outside Cordova, or can't be resolved at all (see "Fresh
  location fetch" below) → pin mode never activates; the
  **Reporting Not Available** modal shows.

Canceling pin mode (on → off) stays instant — no fetch needed.

### Live "physically outside Cordova" gating (ambient, while the screen is open)

The screen's existing `watchPositionAsync` callback also runs a **streak**
check on every update (this is the one place that uses the streak instead
of a fresh fix, precisely to absorb GPS jitter on a continuously-updating
value):

- Flips the ambient "citizen is outside Cordova" state to **true** only
  after **2 consecutive** watch updates land outside the polygon.
- Flips it back to **false** on a single inside reading (fast to recover,
  slow to give up — errs toward not blocking a genuine citizen over one
  noisy fix).

On the `false → true` transition:
- `PinButton` becomes `disabled` (separate from its `loading` prop) and
  stops responding to taps.
- If pin mode happens to be active already (citizen was inside, started
  pinning, then the ambient reading flips outside mid-session), pin mode
  exits and any `pickedPoint` is cleared — a report can't be completed
  from outside anyway.
- The **Reporting Not Available** modal shows once (a ref guards against
  re-showing on every subsequent watch update while still outside).

On `true → false`, the disabled state and modal-shown guard both clear.

The evacuation-center list/markers and general map viewing are never
affected by this state — only the reporting entry point.

### Permission denied

Same modal component (see below), **Location Permission Required** copy,
with **Open Settings** (`Linking.openSettings()`) and **Retry** actions.
Reporting stays disabled until permission is granted; evacuation-center
viewing is unaffected (this mirrors the screen's existing `locationDenied`
state, which already exists for that purpose).

## Frontend: fresh location fetch (`services/location.service.ts`)

The existing `getCurrentLocation()` collapses permission-denied and
GPS-failure into the same `undefined` return, and has no accuracy info —
not enough to drive the permission-vs-unavailable distinction this feature
needs. Rather than change its contract (it has several existing call
sites: `report.tsx`'s focus-effect prefill, `home.tsx`, `SosContext`, the
evacuation navigate screen), add a new function used only by the geofence
call sites:

```ts
export type VerifiedLocationResult =
  | { status: "granted"; coords: Coordinates }
  | { status: "denied" }
  | { status: "unavailable" };

export async function getVerifiedLocation(): Promise<VerifiedLocationResult>
```

Behavior: request foreground permission → `denied` if refused. Otherwise
one fresh `getCurrentPositionAsync` call requesting high accuracy, with a
dedicated 10s timeout (a bit more generous than the existing 8s constant,
since this result gates a real action rather than prefilling a field) →
`granted` with whatever fix comes back, or `unavailable` if it times out
with nothing.

This deliberately does **not** implement a multi-attempt accuracy-threshold
retry loop — a single high-accuracy request, trusted once it resolves.
Inventing a specific "poor accuracy" numeric threshold and retry count
without real device data seemed more likely to create a new class of bugs
(arbitrary threshold, compounding multi-attempt latency) than to help; the
loading copy ("Getting your accurate location...") is what the ticket
actually asks the user to see during this wait, and that's satisfied by
showing it for the duration of the one request. If real-world testing
shows single fixes are routinely too inaccurate near the boundary, this is
the one function to revisit.

Every "verified" call site (pin button, report submit, SOS confirm) calls
`getVerifiedLocation()`, not `getCurrentLocation()`.

## Frontend: Report submit (`app/(tabs)/report.tsx`)

`handleSubmit` becomes a small state machine —
`submitPhase: "idle" | "locating" | "submitting"`:

1. `locating`: `PrimaryButton`'s existing `loading` prop shows a spinner;
   a small caption line under the button reads **"Getting your accurate
   location..."**. Calls `getVerifiedLocation()`.
   - `denied` → **Location Permission Required** modal, back to `idle`.
   - `unavailable` → **Reporting Not Available** modal (an unverifiable
     location can't be confirmed inside Cordova, so it's treated the same
     as confirmed-outside for blocking purposes — the ticket doesn't ask
     for a fourth distinct message here), back to `idle`.
   - `granted` but outside Cordova → **Reporting Not Available** modal,
     back to `idle`.
   - `granted` and inside Cordova → continue.
2. Re-validates `activeLocation` (the pin, or the GPS-auto-detected
   fallback) via `isInsideCordova` — defense-in-depth mirroring the
   backend's exact rule; should already be guaranteed by the map screen's
   own gate, but catches a stale pin from much earlier in the session.
   Fails → same **Reporting Not Available** modal, back to `idle`.
3. `submitting`: caption clears, spinner continues; calls `createReport`
   with the existing fields **plus** the fresh fix as
   `reporterLatitude`/`reporterLongitude`.
4. On success, navigates to the confirmation screen as today; on failure,
   the existing `Alert.alert` error handling is unchanged.

## Frontend: SOS (`context/SosContext.tsx`, `components/sos/SosOverlay.tsx`)

`SosStage` gains a `"verifying"` value:
`"idle" | "confirm" | "verifying" | "active"`.

`confirmSOS` changes from "flip to active immediately, fire in the
background" to a gated sequence:

1. `"confirm"` → tapping **Send SOS** moves to `"verifying"`.
   `SosOverlay` shows a new view: pulsing icon + **"Getting your accurate
   location..."**.
2. Calls `getVerifiedLocation()`.
   - `denied` → **Location Permission Required** modal, back to `"idle"`.
   - `unavailable` or (`granted` but outside Cordova) → **SOS Not
     Available** modal ("This feature is only available within the
     Municipality of Cordova, Cebu."), back to `"idle"`. `triggerSOS` is
     **never called** in either case.
   - `granted` and inside Cordova → move to `"active"` and call
     `triggerSOS` with the verified coordinates, exactly as today.

This is a deliberate reversal of `SosContext`'s current "always fire, even
without location" safety design, done per explicit instruction earlier in
this conversation — flagged here in writing so it's a visible, considered
trade-off in the historical record, not a silent behavior change.

## Shared modal component (`components/common/GeofenceBlockedModal.tsx`)

One component, following `SosOverlay`'s existing backdrop+dialog visual
pattern (full-screen absolute overlay, centered card, icon, title,
message, 1-2 actions), parameterized by a `variant`:

| Variant | Title | Message | Actions |
|---|---|---|---|
| `reporting-unavailable` | Reporting Not Available | You must be physically within the Municipality of Cordova, Cebu to submit an incident report. | Dismiss |
| `permission-required` | Location Permission Required | CORDOVA RISKQ requires your location to verify that reports are submitted from within Cordova. | Open Settings, Retry |
| `sos-unavailable` | SOS Not Available | This feature is only available within the Municipality of Cordova, Cebu. | Dismiss |

Uses the app's existing `COLORS.danger` / `COLORS.warning` theme tokens for
icon/accent color (not the literal hex codes named in the ticket, which
don't match this app's actual theme tokens and would break dark-mode
theming and consistency with the rest of the app — the existing
`COLORS.danger`/`COLORS.warning` are this app's equivalent, already used
throughout).

## Backend (`CordovaRiskQ-Bacnkend`)

### Boundary + utility

Same GeoJSON (`src/constants/cordovaBoundary.geojson.json`) and same-shaped
`isInsideCordova(lat, lon)` in `src/utils/geofence.ts`, using the same
turf packages.

### Schema changes

- `validations/incident.validation.ts` — `createIncidentSchema` gains two
  new **required** fields: `reporterLatitude: z.number()`,
  `reporterLongitude: z.number()`. Existing `latitude`/`longitude` (the
  pin) are already required — unchanged.
- `validations/sos.validation.ts` — `latitude`/`longitude` change from
  `.optional()` to **required** `z.number()`. This is what makes "GPS
  cannot be verified → refuse the request" a server-enforced rule: a
  request with no coordinates now fails validation (400) before it can
  reach the geofence check at all.

### Geofence middleware (`src/middlewares/geofence.middleware.ts`)

Two exports, inserted after `validate(schema)` and before the controller
(trusting `validate` already enforced presence/type):

```ts
router.post("/incidents", authenticate, validate(createIncidentSchema), requireIncidentInsideCordova, incidentController.create);
router.post("/sos", authenticate, validate(triggerSosSchema), requireSosInsideCordova, sosController.trigger);
```

- `requireIncidentInsideCordova` — checks **both**
  `{reporterLatitude, reporterLongitude}` and `{latitude, longitude}`.
  Either failing → `next(new AppError("Incident reports are only allowed
  within the Municipality of Cordova, Cebu.", 403))`.
- `requireSosInsideCordova` — checks `{latitude, longitude}`. Failing →
  `next(new AppError("SOS is only available within the Municipality of
  Cordova, Cebu.", 403))`.

Both produce `{success:false, message}` with the right status code via the
existing `errorHandler.middleware.ts` — no new response plumbing.

### Persistence

The reporter's fresh GPS is **validation-only** — confirmed explicitly.
`incidentService.create` already whitelists exactly which fields it passes
to `prisma.incident.create` (`category`, `details`, `locationLabel`,
`latitude`, `longitude`); the extra `reporterLatitude`/`reporterLongitude`
on `req.body` pass through validation and middleware and are simply never
referenced. No Prisma migration. `Incident.latitude/longitude` (the pin)
and `SosAlert.latitude/longitude` are unchanged.

## Files touched

**Frontend**
- New: `constants/cordovaBoundary.geojson.json`, `utils/geofence.ts`,
  `components/common/GeofenceToast.tsx`,
  `components/common/GeofenceBlockedModal.tsx`
- Modified: `components/map/types.ts` (`showCordovaBoundary` prop),
  `components/map/MapboxMap.tsx`, `components/map/LeafletMap.tsx`,
  `components/map/PinButton.tsx` (`loading`/`disabled` props),
  `app/(tabs)/map.tsx`, `app/(tabs)/report.tsx`,
  `services/location.service.ts` (`getVerifiedLocation`),
  `services/report.service.ts` / wherever `createReport`'s payload type is
  defined (add `reporterLatitude`/`reporterLongitude`),
  `services/sos.service.ts` (`triggerSOS` sends verified coords),
  `context/SosContext.tsx`, `components/sos/SosOverlay.tsx`
- `package.json`: `@turf/boolean-point-in-polygon`, `@turf/helpers`

**Backend**
- New: `src/constants/cordovaBoundary.geojson.json`,
  `src/utils/geofence.ts`, `src/middlewares/geofence.middleware.ts`
- Modified: `src/validations/incident.validation.ts`,
  `src/validations/sos.validation.ts`, `src/routes/incident.routes.ts`,
  `src/routes/sos.routes.ts`, `src/services/sos.service.ts` (type
  annotation narrows `latitude?`/`longitude?` to required)
- `package.json`: `@turf/boolean-point-in-polygon`, `@turf/helpers`

## Testing

- `utils/geofence.ts` (both repos): unit tests for `isInsideCordova` —
  known-inside point (municipal center), known-outside points (Lapu-Lapu
  City center, Cebu City center, Mandaue City center), and a boundary
  vertex (should count as inside).
- Backend: request tests for both routes — inside/inside (201), pin
  outside only (403), reporter GPS outside only (403), both outside (403),
  missing reporter fields (400 from zod, before the geofence check ever
  runs).
- Frontend: manual verification per the ticket's three scenarios (inside
  tapping inside, inside tapping outside, physically outside), plus the
  permission-denied and SOS hard-block paths, on both the Mapbox
  (dev-client) and Leaflet (Expo Go) engines.
