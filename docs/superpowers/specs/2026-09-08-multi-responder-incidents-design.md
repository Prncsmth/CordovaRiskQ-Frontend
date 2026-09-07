# Multi-Responder Incidents Design

**Goal:** Replace the exclusive, single-responder incident model
(`Incident.acceptedByResponderId`, first-accepter-wins, 409 on a second
accept) with a model where any number of responders can help the same
incident simultaneously, each moving through their own phase
(joined → on the way → arrived) independently, and where declining an
incident is a permanent, per-responder fact that never affects the
incident for anyone else.

**Why now:** The responder Dashboard's "Decline" button
(`app/responder/[id].tsx`) currently does nothing but `router.back()` —
by original design, since a still-`pending` incident already stays
visible to every other responder under the exclusive model, so nothing
needed to change server-side. Making Decline mean something requires
per-responder state that doesn't exist yet. Investigating that surfaced
that the exclusive accept model itself doesn't match the intended
product behavior: multiple responders should be able to help one
incident together, with visibility into how many are currently helping.

**Scope:** Two repos — `CordovaRiskQ-Bacnkend` (Express + Prisma +
Postgres/Neon) and `CordovaRiskQ-Frontend` (this repo). Both are
implemented as part of this effort. The `CordovaRiskQ- Admin` repo is
**not** touched — its existing "Assigned Responder" / "Unassigned"
display keeps working via a backward-compatible computed field (see
below), and giving it a real roster/count view is a separate future
task.

## Current state

`Incident.acceptedByResponderId` (Prisma) is a single nullable scalar.
`incidentService.accept()` throws a 409 ("Incident already accepted")
if it's already set — first responder to accept locks out everyone
else. `incidentService.updateStatus()` only allows the accepting
responder (`acceptedByResponderId === responderId`) to advance
`Incident.status` through `on_the_way → arrived → completed/cancelled`.
The frontend's `app/responder/[id].tsx` drives its 4-phase UI
(`PendingView` → `LobbyView` → `OnTheWayView` → `ArrivedView`) directly
off this single shared `incident.status`. `Incident.team: TeamMember[]`
already exists in `types/responder.ts` and is rendered by `LobbyView` /
`TeamMemberRow`, but `services/incident.service.ts`'s `toIncident()`
hardcodes it to `[]` (and `maxResponders` to `1`) because the backend
has never sent real roster data.

The `CordovaRiskQ- Admin` repo's `useEmergencies.ts` /
`EmergencyTable.tsx` / `EmergencyDetails.tsx` read
`acceptedByResponderId` directly off the API response and render it as
a single "Assigned Responder" (or "Unassigned").

## Data model (backend)

New table:

```prisma
model IncidentResponder {
  id          String   @id @default(uuid())
  incidentId  String
  incident    Incident @relation(fields: [incidentId], references: [id])
  responderId String
  responder   User     @relation(fields: [responderId], references: [id])
  status      String   // "joined" | "on_the_way" | "arrived" | "left" | "declined"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([incidentId, responderId])
}
```

One row per responder who has ever touched a given incident (joined,
declined, or later left). `status` is a plain `String`, validated at
the zod layer — matching how `Incident.status`/`category`/`urgency`
are already modeled in this codebase (no Prisma enums used anywhere).
The unique `(incidentId, responderId)` constraint means each responder
has exactly one row per incident, mutated over time (not append-only
history).

`Incident.acceptedByResponderId` and its `acceptedBy` relation are
**removed** as real columns. Any API response that needs an
`acceptedByResponderId`-shaped value (for Admin backward compatibility)
computes it on read: the `responderId` of the `IncidentResponder` row
with the earliest `createdAt` among rows whose `status` is `joined`,
`on_the_way`, or `arrived` — explicitly excluding `left` and
`declined`. If no such row exists, it's `null`. Ordered by `createdAt` ascending,
then by `id` ascending as a tiebreaker (in the event of an exact
`createdAt` collision) — fully deterministic, and the single source of
truth for that field everywhere it's produced (list, getById).

`Incident.status` (the existing column) stays a real, persisted
`String`, but is now written by the service layer rather than passed
through from a single responder's action. Every time the roster
changes (join, advance, leave, decline), the service recomputes it:

- No active (`joined`/`on_the_way`/`arrived`) responder → `"pending"`
- At least one `joined`, none further along → `"lobby"`
- At least one `on_the_way`, none `arrived` → `"on_the_way"`
- At least one `arrived` → `"arrived"`

This can regress (e.g. the only responder leaves → back to `pending`)
— that's intentional: a citizen should never see a stale "responder
assigned" state after every responder has backed out.
`"completed"`/`"cancelled"` are never derived this way; they're set
directly by the one new closing action below and are terminal.

`notifyStatusChange` (existing, unchanged) fires exactly when the
computed `Incident.status` actually changes value — matching the
existing no-op-on-unchanged-status guard already in `updateStatus`.

## Backend API

**`PATCH /incidents/:id/responders/me`** — replaces
`POST /incidents/:id/accept`. Body: `{ status: "joined" | "declined" |
"on_the_way" | "arrived" | "left" }`. Upserts the caller's own
`IncidentResponder` row, validated per target status against the
caller's *current* row (if any) for this incident:

| Target      | Allowed when                                          |
|-------------|--------------------------------------------------------|
| `joined`    | No existing row, or existing row is `left` (rejoin)     |
| `declined`  | No existing row at all (decline is a pre-join-only, permanent action — never allowed once any row exists) |
| `on_the_way`| Existing row is `joined` or `on_the_way`               |
| `arrived`   | Existing row is `on_the_way` or `arrived`               |
| `left`      | Existing row is `joined`, `on_the_way`, or `arrived`    |

Any other combination is rejected with 409 and a message identifying
why (e.g. "You already declined this incident", "You haven't joined
this incident yet"). On success, the service recomputes and persists
`Incident.status` per the rules above and fires the reporter
notification if it changed.

**`PATCH /incidents/:id/status`** — narrowed from today's
`"on_the_way" | "arrived" | "completed" | "cancelled"` to just
`{ status: "completed" | "cancelled" }`. Requires the caller to have
an `arrived` `IncidentResponder` row for this incident (403 otherwise)
— matches today's UI, where the only entry point (`ArrivedView`'s
Cancel Incident) already implies the caller is on-scene. Sets
`Incident.status` directly (not derived) and fires the reporter
notification. Does not touch other responders' roster rows — their
history stays as-is for the record.

**`GET /incidents`** (dashboard list) — gains a `responderId` filter:
excludes any incident where the caller has a `declined` row. Each
returned incident gains `respondersCount` (count of active roster
rows) and `myStatus` (the caller's own roster status, or `"pending"`
if no row exists yet) alongside the existing fields and the computed
`acceptedByResponderId`.

**`GET /incidents/:id`** — branches by requester role, same pattern as
today's ownership check. A citizen (the reporter) gets the existing
shape plus `respondersCount` only (no names). A responder gets the
existing shape plus the full active roster (`id`, `name`, `status` —
`joined`/`on_the_way`/`arrived` only, `left`/`declined` rows never
surface here) and `myStatus`. This endpoint does **not** filter out
declined incidents — a responder reaching one via a stale link still
gets a response, with `myStatus: "declined"`, so the frontend can show
an appropriate message rather than erroring.

## Frontend changes

`types/responder.ts`:
- Drop `Incident.maxResponders` (no cap was ever specified for this
  work — YAGNI; `incident.team.length` is now the real "how many are
  helping" count with no denominator).
- `ResponderStatus` narrows to `"joined" | "on_the_way" | "arrived"` —
  the only statuses that ever appear in `team` (`TeamMemberRow`'s
  `getStatusMeta` gets these three labels; `"joined"` reads as
  "Preparing" to match the existing friendly copy).
- Add `Incident.myStatus: "pending" | "declined" | "joined" |
  "on_the_way" | "arrived" | "left"`.

`services/incident.service.ts`:
- `acceptIncident` → `joinIncident`, calls the new
  `PATCH /incidents/:id/responders/me` with `{ status: "joined" }`.
- New `declineIncident(token, id)` — same endpoint, `{ status:
  "declined" }`.
- New `updateMyResponderStatus(token, id, status)` — same endpoint,
  for `"on_the_way" | "arrived" | "left"`.
- `updateIncidentStatus` narrows to only `"completed" | "cancelled"`,
  matching the backend's narrowed endpoint.
- `toIncident()` maps `team`/`myStatus`/`respondersCount` from the
  real response instead of hardcoding `team: []`.

`app/responder/[id].tsx`: the `Phase` state machine switches from
being driven by `incident.status` to `incident.myStatus` — this is the
core of "independent per-responder phase." `handleAccept` becomes
`handleJoin` (calls `joinIncident`); `handleDecline` calls the real
`declineIncident` and only backs out on success (shows an alert and
stays on the pending offer if the call fails, rather than silently
leaving as before); `handleHeadOut`/`handleArrive` call
`updateMyResponderStatus`. If `myStatus === "declined"` on load (only
reachable via a stale link, since declined incidents are already
filtered out of the dashboard list), the screen shows an alert
("You already declined this incident") and backs out — no new view
component for this edge case.

`LobbyView`: "Responders Joined (X/Y)" drops the `/Y` denominator —
just `incident.team.length`, since there's no cap.

## Explicitly out of scope

- Updating `CordovaRiskQ- Admin` to show the real roster/count instead
  of a single assigned responder — it keeps working unchanged via the
  computed `acceptedByResponderId` field.
- A "Leave" button in the frontend UI for an already-joined responder
  to back out mid-incident. The `left` status is modeled on the
  backend (and the roster endpoint accepts it) so it's not a future
  schema change, but no UI affordance is added for it in this work.
- Any cap on how many responders can join one incident.
- Reversing a decline (confirmed permanent, per-responder,
  per-incident).
- Any change to how citizens report incidents, or to SOS-sourced
  incident creation.

## Migration

One-time backfill, run once against the shared Neon DB: for every
existing `Incident` row with `acceptedByResponderId` set, create one
`IncidentResponder` row `{ incidentId, responderId:
acceptedByResponderId, status: <mapped below>, createdAt:
incident.updatedAt }`. Status mapping from the incident's current
`status` at migration time: `lobby → joined`, `on_the_way →
on_the_way`, `arrived → arrived`, `completed`/`cancelled` → `arrived`
(best-effort guess — the exact last live phase before closing isn't
recoverable, but a closed incident almost always had someone arrive).
This is historical data only; it never drives live UI once an incident
is closed. After backfill, the `acceptedByResponderId` column and
`acceptedBy` relation are dropped from `Incident` in the same
migration.

Per the project's standing rule on the shared Neon DB (used by both
this backend and the Admin repo): this is an additive-then-backfill-
then-drop migration, applied with a normal `prisma migrate deploy` —
never `migrate reset` or any `--accept-data-loss` push.

## Error handling

- Joining twice (double-tap): second call has `status: "joined"` while
  the existing row is already `joined`/`on_the_way`/`arrived` — falls
  outside the allowed-transition table, so it's rejected 409. The
  frontend treats this as a benign race (already joined) and proceeds
  to the Lobby rather than surfacing an error.
- Declining after any prior action: rejected 409 with a clear message;
  the frontend's `PendingView` is the only place Decline is ever
  offered, and it's not reachable once a row exists, so this is
  defense-in-depth rather than an expected path.
- Completing/cancelling without having arrived: rejected 403; not
  reachable from the current UI (the button only exists on
  `ArrivedView`), same defense-in-depth reasoning.
- Network failure on any roster action: existing `Alert.alert` pattern
  (see `handleAccept`/`handleHeadOut`/`handleArrive` today) — show the
  error, don't advance local phase state.

## Testing

Backend (new): unit tests on `incidentService`'s roster-transition
validation table (each disallowed combination rejects, each allowed
one succeeds), the `Incident.status` recompute rules (derives
correctly from a given active-roster snapshot, including the
regression-to-`pending` case), and the `acceptedByResponderId`
computation (earliest `createdAt` among active-only rows, `null` when
none, `id` as the tiebreaker).

Frontend (new): unit tests for the `myStatus`-driven phase selection
in `app/responder/[id].tsx` (each `myStatus` value maps to the right
view, `"declined"` triggers the alert-and-back path), and for
`toIncident()`'s mapping of the new roster/`myStatus` fields.
Existing `filterIncidents`/`groupIncidentsByBarangay` tests are
unaffected (they operate on the already-shaped `Incident` type, whose
relevant fields — `id`, `type`, `urgency`, `status`, coords — don't
change shape).
