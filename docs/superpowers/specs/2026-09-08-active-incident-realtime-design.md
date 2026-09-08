# Active Incident Real-Time Updates (Socket.IO)

## Problem

`app/responder/[id].tsx` (the active-incident detail screen — Pending →
Lobby → On the Way → Arrived) fetches the incident once via
`getIncidentById` on mount and never refreshes. If another responder
joins the roster, advances their own status, or the incident is
cancelled/completed while a responder is viewing this screen, they
don't see it until they back out and re-enter. The incident **list**
screen (`app/responder/index.tsx`) already polls every 12s and is
explicitly out of scope for this change.

## Goals

- Team roster changes (join/decline/on_the_way/arrived) and incident
  status changes (cancelled/completed) appear live on the active
  incident screen, across both repos:
  `CordovaRiskQ-Frontend` (this repo) and `CordovaRiskQ-Bacnkend`.
- Responder actions (join, decline, head out, arrive, cancel) keep
  going through the existing REST endpoints. Socket.IO is a
  receive-only broadcast layer on the frontend — not a write path.
- Socket connectivity is additive: if it fails or never connects, the
  screen still works from the initial REST fetch.

## Non-goals

- No changes to the incident list screen's polling.
- No socket-based writes/acks for any responder action.
- No offline queue or missed-event replay — worst case on a dropped
  connection is brief staleness until reconnect.

## Event contract

**Transport:** `socket.io` / `socket.io-client`, connecting to the
same host `services/api.ts` already resolves for REST calls.

**Auth:** the client passes the existing bearer JWT via
`socket.handshake.auth.token`. A connection middleware on the server
verifies it with the same `verifyToken` used by
`authenticate.middleware.ts` and rejects the connection if it's
missing or invalid — mirroring REST's `authenticate` middleware.

**Rooms:** one room per incident, named `incident:${incidentId}`.

**Client → server events:**

- `join:incident` — payload `{ incidentId: string }`. Sent once,
  right after connecting. Server authorizes and joins the socket to
  `incident:${incidentId}`, or emits an `error` event and refuses the
  join.

**Authorization for `join:incident`:** mirrors
`incidentService.getById`'s existing rule, not just existence — a
`citizen` may only join the room for an incident they reported
(`incident.reporterId === socket.userId`); any other role (i.e.
`responder`) may join any incident's room. An incident that doesn't
exist, or a citizen requesting a room for someone else's report, both
result in the same refusal (no room join, `error` event with a
generic message — don't leak whether the incident exists to an
unauthorized citizen).

**Server → client events:**

- `incident:updated` — broadcast to `incident:${id}` after either
  mutation below succeeds. Payload:

  ```ts
  {
    id: string;
    status: IncidentStatus;
    responders: TeamMember[]; // same shape as Incident.team today
    respondersCount: number;
    acceptedByResponderId: string | null;
    updatedAt: string; // ISO
  }
  ```

  **Deliberately omits `myStatus`.** `buildResponderFacingIncident`
  computes `myStatus` per requester — it is not the same value for
  every viewer in the room. Broadcasting it as one shared payload
  would let one responder's screen show another responder's phase.
  The frontend merges every field above into local state but never
  touches its own `myStatus` from this event; that field only changes
  via the direct REST response to the viewer's own action.

## Backend changes (`CordovaRiskQ-Bacnkend`)

- **`src/server.ts`**: replace `app.listen(PORT, ...)` with
  `const httpServer = http.createServer(app)` +
  `httpServer.listen(PORT, ...)`, so `socket.io` has an HTTP server to
  attach to.
- **New `src/realtime/socket.ts`**: creates the `Server(httpServer,
  { cors: ... })` instance (same CORS policy as `app.ts`), registers
  the auth middleware (`io.use`) and the `connection` handler with the
  `join:incident` listener described above (reusing the existing
  `getById`-style authorization — extract that citizen/reporter check
  into a small shared helper if it isn't already isolated, rather than
  duplicating the inline logic).
- **New `src/realtime/emit.ts`**: holds the `io` instance (set once at
  boot from `socket.ts`) and exports `emitIncidentUpdate(incidentId,
  payload)`, so controllers don't need to import the socket server
  directly.
- **`src/controllers/incident.controller.ts`**: after
  `incidentService.updateMyResponderStatus` and
  `incidentService.updateStatus` each return their (per-requester)
  `incident`, call `emitIncidentUpdate` with the viewer-agnostic subset
  of fields (everything in the payload above, i.e. the same object
  minus `myStatus`) to `incident:${incident.id}`.
- New dependency: `socket.io`.

## Frontend changes (this repo)

- New dependency: `socket.io-client`.
- **New `services/incidentSocket.service.ts`**: exposes a connect
  function, e.g. `connectToIncidentSocket(token, incidentId, onUpdate)`,
  that opens the socket (reusing `services/api.ts`'s base-URL
  resolution), emits `join:incident` on connect (and on every
  reconnect, since socket.io rooms don't survive a fresh connection),
  listens for `incident:updated` and calls `onUpdate` with the payload,
  and returns a cleanup function that disconnects.
- **`app/responder/[id].tsx`**: a second `useEffect`, alongside the
  existing fetch effect, opens the socket once `token`/`id` are
  available and merges each `incident:updated` payload into the local
  `incident` state (spread over the existing object, explicitly
  preserving `myStatus` and `distanceKm` — neither is present in the
  socket payload). Disconnects on unmount. The merge itself should be
  a small pure function (same pattern as `phaseForMyStatus`) so it's
  unit-testable without mounting the screen.
- Socket errors/`connect_error` are swallowed — the screen keeps
  working off the REST-fetched `incident` state either way.

## Testing

- **Backend:** unit test for the connection auth middleware (valid
  token connects, missing/invalid token is rejected); an integration
  test using `socket.io-client` against a test server instance
  asserting `incident:updated` fires with the right payload after
  `PATCH /incidents/:id/responders/me` and `PATCH /incidents/:id/status`;
  a test that a citizen's `join:incident` for another user's report is
  refused while the reporter's own succeeds.
- **Frontend:** unit test for the merge function (payload merges in
  without clobbering `myStatus`/`distanceKm`).
- **Manual:** two devices/simulators on the same incident — join as
  one, confirm the other's screen updates roster and status live.
