# Active Incident Real-Time Updates (Socket.IO) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `app/responder/[id].tsx` (the active-incident detail screen) show team roster and incident status changes live, via a Socket.IO broadcast layer, instead of only reflecting whatever was fetched on mount.

**Architecture:** Responder actions (join/decline/head-out/arrive/cancel/complete) keep going through the existing REST endpoints unchanged. After each of the two backend endpoints that handle these actions succeeds, the server broadcasts a viewer-agnostic `incident:updated` event to a per-incident Socket.IO room. The frontend screen joins that room on mount and merges incoming events into its local state, never overwriting its own `myStatus` (which is per-viewer and only ever set from the REST response to the viewer's own action).

**Tech Stack:** Backend: Express 5, `socket.io`, Prisma, `node:test` (via `tsx --test`). Frontend: Expo/React Native, `socket.io-client`, Jest (`jest-expo` preset).

**Spec:** `docs/superpowers/specs/2026-09-08-active-incident-realtime-design.md`

## Global Constraints

- REST is the only write path. Socket.IO is receive-only on the frontend — no action becomes a socket emit.
- The `incident:updated` broadcast payload never includes `myStatus` — it's per-viewer, not shared across the room. Frontend merge logic must never write it.
- `join:incident` authorization mirrors `incidentService.getById`'s existing rule exactly: a `citizen` may only join the room for their own report (`incident.reporterId === requesterId`); any other role may join any incident's room.
- Scope is `app/responder/[id].tsx` only. `app/responder/index.tsx`'s 12s polling is unchanged.
- New dependencies: `socket.io` (backend only), `socket.io-client` (frontend only). No others.
- Repos: this repo is `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend`; the backend is the sibling repo at `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend`. Run backend commands from the backend path, frontend commands from the frontend path.

---

## Task 1: Backend — extract shared `canViewIncident` authorization helper

**Files:**
- Create: `src/services/incidentAuthorization.ts`
- Create: `src/services/incidentAuthorization.test.ts`
- Modify: `src/services/incident.service.ts:207-210`

**Interfaces:**
- Produces: `canViewIncident(role: string | undefined, reporterId: string, requesterId: string): boolean` — importable from `@/services/incidentAuthorization`. Task 2's `join:incident` handler consumes this.

- [ ] **Step 1: Write the failing test**

Create `src/services/incidentAuthorization.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { canViewIncident } from "@/services/incidentAuthorization";

test("a citizen can view only their own report", () => {
    assert.equal(canViewIncident("citizen", "reporter-1", "reporter-1"), true);
    assert.equal(canViewIncident("citizen", "reporter-1", "someone-else"), false);
});

test("a non-citizen role can view any incident", () => {
    assert.equal(canViewIncident("responder", "reporter-1", "someone-else"), true);
    assert.equal(canViewIncident(undefined, "reporter-1", "someone-else"), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend`): `npm test -- src/services/incidentAuthorization.test.ts`
Expected: FAIL — `Cannot find module '@/services/incidentAuthorization'` (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/services/incidentAuthorization.ts`:

```ts
// src/services/incidentAuthorization.ts
// Pure authorization rule for "can this user see this incident's
// responder-facing detail (and, by extension, join its realtime room)".
// Mirrors incidentService.getById's citizen/reporter check -- extracted so
// both REST and the Socket.IO join:incident handler use the same rule
// instead of duplicating it. See
// docs/superpowers/specs/2026-09-08-active-incident-realtime-design.md.
export function canViewIncident(
    role: string | undefined,
    reporterId: string,
    requesterId: string,
): boolean {
    if (role === "citizen") return reporterId === requesterId;
    return true;
}
```

Then update `src/services/incident.service.ts:207-210`, replacing:

```ts
        const requester = await prisma.user.findUnique({ where: { id: requesterId } });
        if (requester?.role === "citizen" && incident.reporterId !== requesterId) {
            throw new AppError("Not your report", 403);
        }
```

with:

```ts
        const requester = await prisma.user.findUnique({ where: { id: requesterId } });
        if (!canViewIncident(requester?.role, incident.reporterId, requesterId)) {
            throw new AppError("Not your report", 403);
        }
```

Add the import at the top of `src/services/incident.service.ts` (alongside the existing `@/services/incidentRoster` import):

```ts
import { canViewIncident } from "@/services/incidentAuthorization";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/services/incidentAuthorization.test.ts`
Expected: PASS (2 tests).

Then run the full backend suite to confirm the `getById` refactor didn't break anything already covered: `npm test`
Expected: all existing tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/incidentAuthorization.ts src/services/incidentAuthorization.test.ts src/services/incident.service.ts
git commit -m "refactor: extract canViewIncident authorization helper from incidentService.getById"
```

---

## Task 2: Backend — Socket.IO server, connection auth, and `join:incident`

**Files:**
- Create: `src/realtime/emit.ts`
- Create: `src/realtime/socket.ts`
- Modify: `src/server.ts`
- Modify: `package.json` (add `socket.io` dependency)

**Interfaces:**
- Consumes: `canViewIncident` from `@/services/incidentAuthorization` (Task 1); `verifyToken` from `@/utils/jwt`; `prisma` from `@/lib/prisma`.
- Produces: `initRealtime(httpServer: http.Server): void` from `@/realtime/socket`, called once from `server.ts`. `setIo(server: Server): void` and `emitIncidentUpdate(incidentId: string, payload: IncidentBroadcastPayload): void` from `@/realtime/emit` — Task 3 consumes `emitIncidentUpdate` and `IncidentBroadcastPayload`.

- [ ] **Step 1: Add the dependency**

Run (from `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend`): `npm install socket.io`

- [ ] **Step 2: Create the emit module**

Create `src/realtime/emit.ts`:

```ts
// src/realtime/emit.ts
// Holds the live Socket.IO server instance (set once at boot by
// src/realtime/socket.ts) and exposes a narrow emit helper so controllers
// don't need to import the socket server directly. See
// docs/superpowers/specs/2026-09-08-active-incident-realtime-design.md.
import type { Server } from "socket.io";

let ioInstance: Server | null = null;

export function setIo(server: Server): void {
    ioInstance = server;
}

// Deliberately omits myStatus -- it's per-requester
// (buildResponderFacingIncident computes it per viewer), so it can't be
// broadcast as one shared payload without leaking one responder's phase
// into another's screen.
export interface IncidentBroadcastPayload {
    id: string;
    status: string;
    responders: { id: string; name: string; status: string }[];
    respondersCount: number;
    acceptedByResponderId: string | null;
    updatedAt: string;
}

export function emitIncidentUpdate(incidentId: string, payload: IncidentBroadcastPayload): void {
    ioInstance?.to(`incident:${incidentId}`).emit("incident:updated", payload);
}
```

- [ ] **Step 3: Create the socket server and `join:incident` handler**

Create `src/realtime/socket.ts`:

```ts
// src/realtime/socket.ts
// Boots the Socket.IO server: authenticates connections with the same JWT
// used by REST, and handles join:incident (a socket joining the room for
// one incident's live updates). See
// docs/superpowers/specs/2026-09-08-active-incident-realtime-design.md.
import type { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

import { prisma } from "@/lib/prisma";
import { canViewIncident } from "@/services/incidentAuthorization";
import { setIo } from "@/realtime/emit";
import { verifyToken } from "@/utils/jwt";

interface AuthenticatedSocket extends Socket {
    userId?: string;
}

export function initRealtime(httpServer: HttpServer): void {
    const io = new Server(httpServer, {
        cors: { origin: true, credentials: true },
    });

    io.use((socket: AuthenticatedSocket, next) => {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) {
            next(new Error("Missing or invalid Authorization"));
            return;
        }
        try {
            const payload = verifyToken(token) as { userId?: string };
            if (!payload.userId) {
                next(new Error("Missing or invalid Authorization"));
                return;
            }
            socket.userId = payload.userId;
            next();
        } catch {
            next(new Error("Missing or invalid Authorization"));
        }
    });

    io.on("connection", (socket: AuthenticatedSocket) => {
        socket.on("join:incident", async (data: { incidentId?: string }) => {
            const incidentId = data?.incidentId;
            if (!socket.userId || typeof incidentId !== "string") {
                socket.emit("error", { message: "Cannot join this incident" });
                return;
            }

            const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
            if (!incident) {
                socket.emit("error", { message: "Cannot join this incident" });
                return;
            }

            const requester = await prisma.user.findUnique({ where: { id: socket.userId } });
            if (!canViewIncident(requester?.role, incident.reporterId, socket.userId)) {
                socket.emit("error", { message: "Cannot join this incident" });
                return;
            }

            socket.join(`incident:${incidentId}`);
        });
    });

    setIo(io);
}
```

- [ ] **Step 4: Wire it into the server bootstrap**

Replace the full contents of `src/server.ts`:

```ts
import http from "http";

import app from "./app";
import { startTidePolling } from "@/lib/tidePolling";
import { initRealtime } from "@/realtime/socket";

const PORT = process.env.PORT || 8000;

const httpServer = http.createServer(app);
initRealtime(httpServer);

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startTidePolling();
});
```

- [ ] **Step 5: Verify it builds and boots**

Run: `npm run build`
Expected: PASS, no TypeScript errors.

Run: `npm run dev` (leave it running a few seconds, then stop it with Ctrl+C)
Expected: console prints `Server running on port 8000` with no thrown errors — confirms `http.createServer` + `initRealtime` didn't break the existing boot path. (Full connect/auth/join behavior is verified end-to-end in Task 7, once the frontend client exists to drive it.)

- [ ] **Step 6: Commit**

```bash
git add src/realtime/emit.ts src/realtime/socket.ts src/server.ts package.json package-lock.json
git commit -m "feat: add Socket.IO server with authenticated connections and join:incident"
```

---

## Task 3: Backend — broadcast `incident:updated` on roster/status mutations

**Files:**
- Modify: `src/controllers/incident.controller.ts:27-43`

**Interfaces:**
- Consumes: `emitIncidentUpdate`, `IncidentBroadcastPayload` from `@/realtime/emit` (Task 2).

- [ ] **Step 1: Add the emit calls**

In `src/controllers/incident.controller.ts`, add the import:

```ts
import { emitIncidentUpdate } from "@/realtime/emit";
```

Replace the `updateMyResponderStatus` and `updateStatus` handlers (currently lines 27-43):

```ts
    updateMyResponderStatus: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const incident = await incidentService.updateMyResponderStatus(
            req.params.id as string,
            req.userId!,
            req.body.status,
        );
        emitIncidentUpdate(incident.id, {
            id: incident.id,
            status: incident.status,
            responders: incident.responders,
            respondersCount: incident.respondersCount,
            acceptedByResponderId: incident.acceptedByResponderId,
            updatedAt: incident.updatedAt.toISOString(),
        });
        res.status(200).json({ success: true, incident });
    }),

    updateStatus: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const incident = await incidentService.updateStatus(
            req.params.id as string,
            req.userId!,
            req.body.status
        );
        emitIncidentUpdate(incident.id, {
            id: incident.id,
            status: incident.status,
            responders: incident.responders,
            respondersCount: incident.respondersCount,
            acceptedByResponderId: incident.acceptedByResponderId,
            updatedAt: incident.updatedAt.toISOString(),
        });
        res.status(200).json({ success: true, incident });
    }),
```

- [ ] **Step 2: Verify it builds**

Run (from `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend`): `npm run build`
Expected: PASS, no TypeScript errors. (`incident.responders`, `incident.respondersCount`, `incident.acceptedByResponderId`, `incident.updatedAt` all come from `buildResponderFacingIncident`'s existing return shape in `src/services/incident.service.ts` — if any of those field names don't line up, this is where it'll surface as a type error.)

- [ ] **Step 3: Commit**

```bash
git add src/controllers/incident.controller.ts
git commit -m "feat: broadcast incident:updated after responder/status mutations"
```

---

## Task 4: Frontend — Socket.IO client service

**Files:**
- Create: `services/incidentSocket.service.ts`
- Modify: `package.json` (add `socket.io-client` dependency)

**Interfaces:**
- Consumes: `API_BASE_URL` from `./api` (already exported by `services/api.ts:20`); `IncidentStatus`, `ResponderStatus` from `@/types/responder`.
- Produces: `connectToIncidentSocket(token: string, incidentId: string, onUpdate: (update: IncidentRealtimeUpdate) => void): () => void` and the `IncidentRealtimeUpdate` type, both from `@/services/incidentSocket.service`. Task 5 and Task 6 consume both.

- [ ] **Step 1: Add the dependency**

Run (from `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend`): `npm install socket.io-client`

- [ ] **Step 2: Create the service**

Create `services/incidentSocket.service.ts`:

```ts
// services/incidentSocket.service.ts
// Receive-only Socket.IO client for one incident's live roster/status
// updates. Actions (join/decline/head-out/arrive/cancel) stay on REST --
// this only listens for what other responders do. See
// docs/superpowers/specs/2026-09-08-active-incident-realtime-design.md.
import { io, type Socket } from "socket.io-client";

import { API_BASE_URL } from "./api";
import type { IncidentStatus, ResponderStatus } from "@/types/responder";

// Deliberately has no myStatus field -- the server never broadcasts it,
// since it's per-viewer. See emitIncidentUpdate on the backend.
export interface IncidentRealtimeUpdate {
  id: string;
  status: IncidentStatus;
  responders: { id: string; name: string; status: ResponderStatus }[];
  respondersCount: number;
  acceptedByResponderId: string | null;
  updatedAt: string;
}

export function connectToIncidentSocket(
  token: string,
  incidentId: string,
  onUpdate: (update: IncidentRealtimeUpdate) => void,
): () => void {
  const socket: Socket = io(API_BASE_URL, {
    auth: { token },
  });

  const join = () => socket.emit("join:incident", { incidentId });

  socket.on("connect", join);
  socket.on("incident:updated", onUpdate);

  return () => {
    socket.off("connect", join);
    socket.off("incident:updated", onUpdate);
    socket.disconnect();
  };
}
```

- [ ] **Step 3: Verify it type-checks**

Run (from `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend`): `npx tsc --noEmit`
Expected: PASS, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add services/incidentSocket.service.ts package.json package-lock.json
git commit -m "feat: add Socket.IO client service for incident live updates"
```

---

## Task 5: Frontend — pure merge function for incoming updates

**Files:**
- Create: `components/responder/mergeIncidentUpdate.ts`
- Test: `components/responder/mergeIncidentUpdate.test.ts`

**Interfaces:**
- Consumes: `IncidentRealtimeUpdate` from `@/services/incidentSocket.service` (Task 4); `Incident` from `@/types/responder`.
- Produces: `mergeIncidentUpdate(current: Incident, update: IncidentRealtimeUpdate): Incident` from `@/components/responder/mergeIncidentUpdate`. Task 6 consumes this.

- [ ] **Step 1: Write the failing test**

Create `components/responder/mergeIncidentUpdate.test.ts`:

```ts
import { mergeIncidentUpdate } from "./mergeIncidentUpdate";
import type { Incident } from "@/types/responder";

const baseIncident: Incident = {
  id: "inc-1",
  type: "Fire",
  location: "Near the market",
  urgency: "high",
  status: "lobby",
  team: [{ id: "r1", name: "Alice", status: "joined" }],
  myStatus: "on_the_way",
  distanceKm: 2.4,
};

describe("mergeIncidentUpdate", () => {
  it("merges status and team from the update, preserving myStatus and distanceKm", () => {
    const merged = mergeIncidentUpdate(baseIncident, {
      id: "inc-1",
      status: "on_the_way",
      responders: [
        { id: "r1", name: "Alice", status: "on_the_way" },
        { id: "r2", name: "Bob", status: "joined" },
      ],
      respondersCount: 2,
      acceptedByResponderId: "r1",
      updatedAt: "2026-09-08T00:00:00.000Z",
    });

    expect(merged.status).toBe("on_the_way");
    expect(merged.team).toEqual([
      { id: "r1", name: "Alice", status: "on_the_way" },
      { id: "r2", name: "Bob", status: "joined" },
    ]);
    expect(merged.myStatus).toBe("on_the_way");
    expect(merged.distanceKm).toBe(2.4);
  });

  it("ignores an update for a different incident id", () => {
    const merged = mergeIncidentUpdate(baseIncident, {
      id: "inc-2",
      status: "arrived",
      responders: [],
      respondersCount: 0,
      acceptedByResponderId: null,
      updatedAt: "2026-09-08T00:00:00.000Z",
    });

    expect(merged).toBe(baseIncident);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend`): `npm test -- components/responder/mergeIncidentUpdate.test.ts`
Expected: FAIL — `Cannot find module './mergeIncidentUpdate'`.

- [ ] **Step 3: Write minimal implementation**

Create `components/responder/mergeIncidentUpdate.ts`:

```ts
// components/responder/mergeIncidentUpdate.ts
// Merges a live Socket.IO incident:updated payload into local Incident
// state. Deliberately never touches myStatus or distanceKm -- neither is
// present in the broadcast payload (myStatus is per-viewer; distanceKm is
// computed client-side from the responder's own location). Pure so it's
// unit-testable without mounting the screen, same pattern as
// phaseForMyStatus.
import type { Incident } from "@/types/responder";
import type { IncidentRealtimeUpdate } from "@/services/incidentSocket.service";

export function mergeIncidentUpdate(
  current: Incident,
  update: IncidentRealtimeUpdate,
): Incident {
  if (update.id !== current.id) return current;
  return {
    ...current,
    status: update.status,
    team: update.responders,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- components/responder/mergeIncidentUpdate.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/responder/mergeIncidentUpdate.ts components/responder/mergeIncidentUpdate.test.ts
git commit -m "feat: add pure mergeIncidentUpdate for live incident updates"
```

---

## Task 6: Frontend — wire the socket into the active incident screen

**Files:**
- Modify: `app/responder/[id].tsx`

**Interfaces:**
- Consumes: `connectToIncidentSocket` from `@/services/incidentSocket.service` (Task 4); `mergeIncidentUpdate` from `@/components/responder/mergeIncidentUpdate` (Task 5).

- [ ] **Step 1: Add the imports**

In `app/responder/[id].tsx`, add alongside the existing imports (near the `incident.service` import block, currently lines 21-27):

```ts
import { connectToIncidentSocket } from "@/services/incidentSocket.service";
import { mergeIncidentUpdate } from "@/components/responder/mergeIncidentUpdate";
```

- [ ] **Step 2: Add the socket effect**

In `app/responder/[id].tsx`, immediately after the existing fetch effect (currently lines 50-56):

```ts
  useEffect(() => {
    if (!token || !id) return;

    getIncidentById(token, id)
      .then(setIncident)
      .finally(() => setIsLoading(false));
  }, [token, id]);
```

add:

```ts
  useEffect(() => {
    if (!token || !id) return;

    const disconnect = connectToIncidentSocket(token, id, (update) => {
      setIncident((prev) => (prev ? mergeIncidentUpdate(prev, update) : prev));
    });

    return disconnect;
  }, [token, id]);
```

- [ ] **Step 3: Verify it type-checks**

Run (from `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend`): `npx tsc --noEmit`
Expected: PASS, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add app/responder/[id].tsx
git commit -m "feat: show live roster and status updates on the active incident screen"
```

---

## Task 7: Manual end-to-end verification

**Files:** none (manual QA only — no code changes in this task).

- [ ] **Step 1: Start both backends/apps**

In `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend`: `npm run dev`
In `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend`: `npm start`, then open the app on two devices/simulators (or one device + one simulator), logged in as two different responder accounts.

- [ ] **Step 2: Verify live roster updates**

On both devices, navigate into the same open incident's detail screen (`/responder/[id]`) so both land on `[id].tsx` (Pending or Lobby view, whichever applies). On device A, accept/join the incident (or advance status: Head Out / Arrive). On device B — without backing out or refreshing — confirm the roster/team list and displayed phase update within a couple seconds, matching what device A just did.

Expected: device B's screen reflects device A's action live, and device B's own `myStatus`/phase is unaffected by device A's action (each device shows its own phase correctly, not the other's).

- [ ] **Step 3: Verify status changes**

From whichever device has `myStatus: "arrived"`, cancel or complete the incident. Confirm the other device sees the incident's status change live.

- [ ] **Step 4: Verify graceful degradation**

Turn off Wi-Fi/network on device B briefly, perform an action on device A, then restore device B's network. Confirm device B either catches up automatically (socket reconnects and a subsequent event arrives) or, at worst, isn't broken — no crash, the screen still works from its last-known REST/socket state.

- [ ] **Step 5: Note results**

If any step fails, stop and fix the relevant task before proceeding — do not commit further work on top of a broken realtime path. If all steps pass, this plan is complete.

---

## Self-Review Notes

- **Spec coverage:** event contract (Tasks 2-3, 4-5), `join:incident` authorization per the user's required change (Task 1, consumed in Task 2), viewer-agnostic broadcast payload omitting `myStatus` (Task 2's `IncidentBroadcastPayload` / Task 4's `IncidentRealtimeUpdate`, both explicitly typed without it), REST-stays-the-write-path (no task touches the join/decline/updateMyResponderStatus/updateIncidentStatus call sites in `services/incident.service.ts`), reconnection re-joins the room (`connectToIncidentSocket`'s `join` handler is bound to the `connect` event, which fires again on reconnect), silent failure on socket errors (no `connect_error` handler added — a socket that fails to connect simply never updates the screen, which already works from the initial REST fetch), scope limited to `[id].tsx` (no changes to `app/responder/index.tsx`) — all covered.
- **Testing scope note:** the spec's plan-level testing section anticipated a live integration test hitting a real server/DB for the socket auth + emit path. This codebase's existing backend tests (`incidentRoster.test.ts`, `AppError.test.ts`) are all pure-function, DB-free `node:test` — there's no Prisma-mocking or test-DB infrastructure to build on, and the project's shared Neon DB (see `project_shared_neon_db_drift` memory) is not something to start writing test data into as a side effect of this feature. Task 1 covers what's genuinely extractable and pure (the authorization rule); the actual socket wiring is verified by boot-check (Task 2) and by the end-to-end manual pass (Task 7), which is also the more realistic verification for this feature regardless (it needs two real clients on one incident to mean anything).
- **Placeholder scan:** none found — every step has real, complete code.
- **Type consistency:** `IncidentBroadcastPayload` (backend, Task 2) and `IncidentRealtimeUpdate` (frontend, Task 4) share the same field set (`id`, `status`, `responders`/`respondersCount`/`acceptedByResponderId`, `updatedAt`) and both omit `myStatus`. `emitIncidentUpdate`'s call sites (Task 3) supply exactly those fields from `buildResponderFacingIncident`'s existing return shape. `mergeIncidentUpdate` (Task 5) and the `[id].tsx` wiring (Task 6) consume `IncidentRealtimeUpdate` and `connectToIncidentSocket` with matching names/signatures throughout.
