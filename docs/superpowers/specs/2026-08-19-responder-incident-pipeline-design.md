# Responder Incident Pipeline — Design

**Date:** 2026-08-19
**Repos touched:** `CordovaRiskQ-Frontend` (this repo) and `CordovaRiskQ-Bacnkend` (sibling repo, `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend`).

## Purpose

Today, citizen reports and SOS triggers never reach the responder side. `services/report.service.ts`'s `createReport()` fakes a ref number and discards the payload; `app/responder/index.tsx` and `[id].tsx` read from `services/mockIncidents.ts`, a hardcoded array. `docs/PROGRESS.md` calls this out explicitly: *"no pipeline connects citizen reports to the responder side yet."* SOS is real end-to-end on the trigger side (`POST /api/sos`, `SosAlert` Prisma model) but is equally invisible to responders.

Separately, the responder flow has no way to reach a real responder identity: the backend's `User` model has no `role` column, `/api/auth/login|register|google` never return one, and `app/(auth)/login.tsx`'s `__DEV__`-only "Continue as Responder" link logs in with a fake local token (`"dev-responder-token"`) that isn't a valid JWT — so a dev-bypass session cannot call any authenticated endpoint. This spec closes that gap alongside the incident pipeline, since the pipeline is unusable end-to-end without it.

This spec covers: a new `Incident` backend resource that both the citizen report form and SOS trigger feed into, the responder dashboard and detail screens reading and updating real incidents instead of mock data, and giving responders a real, authenticatable identity.

## Scope

1. Backend: new `Incident` Prisma model + `incident.validation.ts` / `.service.ts` / `.controller.ts` / `.routes.ts`, following the existing four-file resource pattern.
2. Backend: `sos.service.ts`'s `trigger()` additionally creates a linked `Incident` row (dual-write) so responders only ever read from one table.
3. Backend: `User` model gains `role String @default("citizen")`; `/api/auth/login`, `/register`, `/google` responses include it.
4. Frontend: new `services/incident.service.ts` (`getIncidents`, `getIncidentById`, `acceptIncident`, `updateIncidentStatus`), replacing `mockIncidents.ts` as the data source for `app/responder/index.tsx` and `[id].tsx`.
5. Frontend: `services/report.service.ts`'s `createReport()` calls the real `POST /api/incidents` endpoint.
6. Frontend: `services/api.ts` gains an `apiPatch` helper (only `apiGet`/`apiPost`/`apiPut` exist today).
7. Frontend: `app/(auth)/login.tsx`'s `__DEV__` responder bypass is deleted.
8. One real responder test account, created via normal `POST /api/auth/register` and then hand-updated to `role = "responder"` directly in the DB (a single manual `UPDATE`, documented in Testing — not a seed script or admin UI).

## Out of scope

- **Team coordination backend.** `TeamMemberRow`, "Ring Team", multiple responders per incident, captain assignment — all stay exactly as they are today: local mock state inside `[id].tsx`'s `LobbyView`. There is no responder roster/accounts system to back this, and building one is a separate, much larger feature.
- **Push notifications.** The responder dashboard polls (`getIncidents()` every ~12s while focused, plus an immediate fetch on focus) rather than receiving real-time push. No websocket/push infrastructure exists on the backend today.
- **Responder self-registration.** No signup flow for responder accounts. The one test account needed for this feature is created manually (see Testing).
- **Photo upload.** `PhotoPicker` on the report form still only toggles a local boolean (`hasPhoto`); no file goes anywhere. Unrelated to this pipeline.
- **`SosAlert` table changes.** It keeps being written exactly as it is today (unchanged migration, unchanged shape) — the Admin repo or anything else reading it is unaffected. `Incident` is an additive table, not a replacement.
- **"Start Assistance," "Chat with Team," and "Navigate" backend behavior.** `Navigate` already just reads the incident's existing `responderCoords`/`incidentCoords` and needs no change. "Start Assistance" stays a `Alert.alert("Coming soon.")` stub — accepting and progressing an incident's status is in scope, but this specific action isn't. "Chat with Team" isn't touched by this spec at all.
- **Automated tests.** Neither repo has a test setup; verification is manual (see Testing below).

## Architecture

### Backend: `Incident` model

```prisma
model Incident {
  id                    String    @id @default(uuid())
  source                String    // "report" | "sos"
  reporterId            String
  reporter              User      @relation("ReportedIncidents", fields: [reporterId], references: [id])
  sosAlertId            String?   // set only when source = "sos"
  category              String    // flood | fire | medical | road-accident | other | sos
  details               String?   // citizen's free-text details; null for SOS
  locationLabel         String
  latitude              Float
  longitude             Float
  urgency               String    // high | medium | low
  status                String    @default("pending") // pending | lobby | on_the_way | arrived | completed | cancelled — matches the frontend's existing IncidentStatus literals exactly (see Architecture note below)
  acceptedByResponderId String?
  acceptedBy            User?     @relation("AcceptedIncidents", fields: [acceptedByResponderId], references: [id])
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

`User` gains two back-relations (`reportedIncidents Incident[] @relation("ReportedIncidents")`, `acceptedIncidents Incident[] @relation("AcceptedIncidents")`) and the new `role String @default("citizen")` column.

Per [[project-shared-neon-db-drift]]: this migration is hand-written SQL applied with `npx prisma db execute --file <path>`, then recorded with `npx prisma migrate resolve --applied <folder>`, then `npx prisma generate` — never `prisma migrate dev`/`reset` or `db push --accept-data-loss`, since those detect the Admin repo's `Admin` table as drift and offer to drop it.

`src/services/incident.service.ts` (mirrors `sos.service.ts`'s and `user.service.ts`'s style):

- `create(reporterId, data)` — `data: { category, details?, locationLabel, latitude, longitude }`. Maps `category` → `urgency` (`fire`/`medical` → `"high"`, `flood`/`road-accident` → `"medium"`, `other` → `"low"`) and creates the row with `source: "report"`.
- `createFromSos(reporterId, sosAlertId, data: { latitude?, longitude? })` — creates a row with `source: "sos"`, `category: "sos"`, `urgency: "high"`, `locationLabel: "SOS Alert"` (no barangay lookup available at this layer — matches what `sos.service.ts` already receives). Called by `sosService.trigger()` right after it creates the `SosAlert` row, both awaited sequentially in the same request (no `$transaction` needed — a failure to create the linked `Incident` row after a successful `SosAlert` write is logged but doesn't fail the SOS trigger itself, since the trigger's primary job — recording the SOS — already succeeded).
- `list()` — `prisma.incident.findMany({ where: { status: { notIn: ["completed", "cancelled"] } }, orderBy: { createdAt: "desc" } })`.
- `getById(id)` — throws `AppError("Incident not found", 404)` if missing.
- `accept(id, responderId)` — throws 404 if missing, throws `AppError("Incident already accepted", 409)` if `status !== "pending"`; otherwise sets `status: "lobby"` (not `"accepted"` — `app/responder/[id].tsx`'s own file header says the real status field should replace its local `phase` state "1:1", and that local type already uses `"lobby"` for this exact transition — using the same literal on both sides means `incident.service.ts` on the frontend needs zero status-name translation), `acceptedByResponderId: responderId`.
- `updateStatus(id, responderId, status)` — throws 404 if missing, throws `AppError("Not your incident", 403)` if `acceptedByResponderId !== responderId`, throws `AppError("Invalid status", 400)` if `status` isn't one of `on_the_way | arrived | completed | cancelled`.

`src/validations/incident.validation.ts`: `createIncidentSchema` (`category` enum, `details` optional string, `locationLabel` string, `latitude`/`longitude` numbers), `updateStatusSchema` (`status` enum of the four transition values).

`src/routes/incident.routes.ts`, mounted at `/api/incidents`:

```
POST   /api/incidents            authenticate, validate(createIncidentSchema)
GET    /api/incidents            authenticate
GET    /api/incidents/:id        authenticate
PATCH  /api/incidents/:id/accept authenticate
PATCH  /api/incidents/:id/status authenticate, validate(updateStatusSchema)
```

All routes require `authenticate` (matches every other resource in this backend) — `GET` isn't opened up publicly even though any responder can see any pending incident, since there's no anonymous access anywhere else in this API either.

`incident.controller.ts` wraps every response the same way `sos.controller.ts` does (`{success: true, alert}`): `POST`/`GET :id`/`PATCH :id/accept`/`PATCH :id/status` each respond `{success: true, incident}`; `GET /api/incidents` responds `{success: true, incidents}` (plural, array).

### Backend: role on auth responses

`src/services/auth.service.ts`'s three methods (`register`, `login`, `loginWithGoogle`) each add `role: user.role` to their returned `user: {...}` object — one-line addition to each, no new logic. Controllers are unchanged (`asyncHandler` wrappers already spread the service's return value into the JSON response).

### Frontend: `services/incident.service.ts` (new)

```ts
export type IncidentDto = { /* mirrors the Prisma model's JSON shape */ };

export async function getIncidents(token: string): Promise<IncidentDto[]>;
export async function getIncidentById(token: string, id: string): Promise<IncidentDto | undefined>;
export async function acceptIncident(token: string, id: string): Promise<IncidentDto>;
export async function updateIncidentStatus(
  token: string,
  id: string,
  status: "on_the_way" | "arrived" | "completed" | "cancelled",
): Promise<IncidentDto>;
```

Following `user.service.ts`'s exact pattern: `token` is an explicit first/second parameter (not read from context), and each function unwraps the controller's `{success, ...}` envelope — e.g. `getIncidents` calls `apiGet<{ success: true; incidents: IncidentDto[] }>("/api/incidents", token)` and returns `response.incidents`; `acceptIncident`/`updateIncidentStatus` unwrap `{success, incident}` the same way `updateProfile` unwraps `{success, user}`. `services/api.ts` gains:

```ts
export async function apiPatch<T>(path: string, body: Record<string, unknown>, token?: string): Promise<T>
```

— identical shape to the existing `apiPut`, just a different HTTP method.

`mockIncidents.ts` is deleted. Its `getIncidentById(id)` helper (synchronous, mock-array lookup) is replaced by the new service's async `getIncidentById(token, id)`.

### Frontend: `app/responder/index.tsx`

Replaces `import { mockIncidents } from "@/services/mockIncidents"` with local state (`incidents`, `IncidentDto[]`) populated by `getIncidents(token)`. Fetches on `useFocusEffect` (immediate) and on a `setInterval(12000)` that's cleared on blur/unmount — matches the polling decision made earlier in this design. `highUrgencyCount`, `mockIncidents.length` references become `incidents.filter(...)`, `incidents.length` against the new state. Everything else (duty toggle, stats row, offline state, `IncidentCard`) is unchanged — it already only touches `Incident`-shaped fields, none of which change shape.

### Frontend: `app/responder/[id].tsx`

`getIncidentById(id)` (synchronous, from mock) becomes an async fetch on mount (`useEffect`, not `useMemo` — network call, not a pure derivation) storing the result in state, with a loading state shown while `incident` is `null`. `handleAccept` (currently just `setPhase("lobby")`) now calls `acceptIncident(token, incident.id)` first, and only advances `phase` on success — on failure, an `Alert.alert` matching the pattern in `phone-number.tsx`/`user-profile/index.tsx`. `onHeadOut`, `onArrive`, and `handleCancelIncident` each call `updateIncidentStatus(token, id, ...)` before (or alongside) their existing local `setPhase`/`router.back()` calls. `handleDecline` is unchanged — still just `router.back()`, no server call (any responder can still see and accept a still-`pending` incident).

The 4-phase local `Phase` state machine is unchanged in shape; it's driven by fetched data instead of mock data, and each transition now also patches the server.

### Frontend: `services/report.service.ts`

```ts
export async function createReport(token: string, payload: {
  category: CategoryId;
  details: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
}) {
  const response = await apiPost<{ success: true; incident: IncidentDto }>(
    "/api/incidents",
    payload,
    token,
  );
  return { success: true, ref: response.incident.id.slice(0, 8).toUpperCase() };
}
```

`app/(tabs)/report.tsx`'s `handleSubmit` passes `category`, `details`, and the existing `location`/`coords` state (already real device GPS as of the earlier fix) — `location` (the barangay label string) maps to `locationLabel`. The return shape (`{ success, ref }`) is unchanged, so `report-confirmation`'s params don't need to change.

`getReportHistory()` is unchanged — history is out of scope here (still returns the local, currently-always-empty `HISTORY` array).

## Data flow

1. **Citizen submits a report:** `report.tsx` → `createReport(token, {...})` → `POST /api/incidents` → `incidentService.create()` maps category→urgency, creates the row with `source: "report"` → responds with the created incident → frontend shows the confirmation screen with a ref derived from the new id.
2. **Citizen triggers SOS:** `SosContext.tsx` → `sos.service.ts` → `POST /api/sos` → `sosService.trigger()` creates the `SosAlert` row (unchanged), then calls `incidentService.createFromSos()` to create a linked `Incident` row (`source: "sos"`) → both ids returned in the response (unchanged shape, `incident` is additive on the response object, ignored by existing frontend consumers that don't look for it).
3. **Responder sees it:** `app/responder/index.tsx`'s poll/focus fetch → `GET /api/incidents` → `incidentService.list()` returns all non-terminal incidents (both sources, indistinguishable in the query — `source` is just a field on the same row) → rendered by the existing `IncidentCard`/`getIncidentVisual` (category `"sos"` falls through to the existing default case in `getIncidentVisual`, showing the generic alert-circle icon).
4. **Responder accepts:** `[id].tsx` Accept button → `acceptIncident(token, id)` → `PATCH /api/incidents/:id/accept` → 409 if someone else already took it (surfaced via `Alert.alert`, stays on the pending screen) → 200 advances local `phase` to `"lobby"`.
5. **Responder progresses the incident:** Head Out / Arrived / Cancel → `updateIncidentStatus(token, id, "on_the_way" | "arrived" | "cancelled")` → `PATCH /api/incidents/:id/status` → 403 if this responder didn't accept it (shouldn't happen in normal use since only the accepting responder reaches these screens, but guards against a stale client) → 200 advances local `phase`/navigates back.
6. **Responder logs in for real:** `login.tsx` → `loginUser()` → backend now returns `role` → `AuthContext.login()` stores it on `AuthUser` (already typed, already threaded through `app/_layout.tsx`'s redirect logic from the earlier frontend-only work) → routed to `/responder` with a real JWT that all of the above calls can use.

## Error handling

- **`acceptIncident` 409 (already accepted):** `Alert.alert("Already taken", "Another responder accepted this incident.")`, then `router.back()` — matches `handleDecline`'s existing pattern of just leaving the screen.
- **`updateIncidentStatus` 403 (not your incident):** same `Alert.alert` + `router.back()` treatment — this is a defensive case, not expected to occur through normal navigation.
- **Network/other failures on any of the four service calls:** caught at the call site, `Alert.alert("Something went wrong", error.message)`, no navigation — stays on the current screen so the responder can retry (matches `phone-number.tsx`'s retry-in-place pattern).
- **Polling failures on the Dashboard:** silently caught and skipped (matches `getNotifications().catch(() => {})` and the existing evacuation-center/location fetch pattern in `home.tsx`) — a single failed poll shouldn't clear or disrupt the currently-shown incident list; the next interval tick retries.
- **SOS's dual-write failure:** `incidentService.createFromSos()`'s failure is caught inside `sosService.trigger()` and logged (`console.error`), not re-thrown — the SOS trigger itself must still succeed and return 201 even if the responder-visible mirror row fails to write, since losing the primary `SosAlert` record over a secondary write is a strictly worse outcome for a citizen in an emergency.

## Testing

Manual verification (neither repo has an automated test setup):

**Setup:**
- Register a normal account through the app, then run one manual SQL update against the Neon DB: `UPDATE "User" SET role = 'responder' WHERE email = '<that account's email>';` — this is the one responder test account for the rest of this list.
- Remove/confirm removal of the `__DEV__` bypass link from `login.tsx`.

**Backend**, via curl against the running dev server:
- `POST /api/incidents` (authenticated as the citizen account) with a `category: "fire"` payload → 201, response has `urgency: "high"`, `source: "report"`.
- `POST /api/sos` (authenticated as any account) → 201, then `GET /api/incidents` (as the responder account) shows a matching `source: "sos"` row.
- `GET /api/incidents` as the responder account → both incidents from above appear, `pending`.
- `PATCH /api/incidents/:id/accept` twice in a row (same id) → first call 200, second call 409.
- `PATCH /api/incidents/:id/status` with `{"status":"on_the_way"}` as a *different* authenticated account than the one that accepted it → 403.

**Frontend**, running the app against the local backend:
- Log in as the citizen account, submit a report (any category) → confirm the confirmation screen shows a ref.
- Log in as the responder account (real login, not a dev bypass — it no longer exists) → confirm the just-submitted report appears in the Dashboard's incident list within one poll cycle (~12s) without manually refreshing.
- Tap into it, Accept → confirm it advances to the Team Lobby phase.
- Head Out → Arrived → confirm each phase renders and the incident's status updates (re-check via `GET /api/incidents/:id` or by re-opening the Dashboard, which should no longer list it once `arrived`/`completed`... note: this feature doesn't add a "complete" action beyond "Start Assistance," which stays a stub — so for this test, `arrived` is the practical end state to verify).
- From a second responder session (or the same one, testing the conflict path), try accepting an already-accepted incident → confirm the "Already taken" alert.
- Trigger SOS from the citizen account → confirm it also appears in the responder Dashboard, with a generic/alert-circle icon (no specific category).
