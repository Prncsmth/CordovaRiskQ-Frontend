# Multi-Responder Incidents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the exclusive single-responder incident-accept model with a per-responder roster (a new `IncidentResponder` table) so any number of responders can help one incident simultaneously, each moving through their own phase independently, with a real, permanent, per-responder Decline.

**Architecture:** A new `IncidentResponder` join table (`incidentId`, `responderId`, `status`) replaces `Incident.acceptedByResponderId`. A pure, DB-free logic module (`incidentRoster.ts`) owns the roster-transition rules and status derivation, unit-tested directly. The backend's `incidentService` upserts one `IncidentResponder` row per responder action and recomputes `Incident.status` from the active roster. The frontend's `app/responder/[id].tsx` switches from a locally-mirrored `phase` state to a value *derived* from the incident's `myStatus` field on every fetch, eliminating the phase/status drift that was possible before.

**Tech Stack:** Backend: Express 5, Prisma 7 (Postgres/Neon), Zod, TypeScript (ESM, `tsx`). Frontend: Expo Router, TypeScript, Jest (`jest-expo`).

**Spec:** `docs/superpowers/specs/2026-09-08-multi-responder-incidents-design.md`

## Global Constraints

- `CordovaRiskQ- Admin` (the separate admin repo) is not touched. It must keep working via a computed `acceptedByResponderId` field in every API response that previously had one.
- Decline is permanent per (responder, incident) pair — never reversible, never re-offered.
- No cap on how many responders can join one incident.
- No "Leave" button is added to the frontend UI in this plan. The backend models `left` as a valid roster status (so it's not a future schema change), but no UI triggers it.
- `IncidentResponder.status` is a plain Prisma `String` column, validated at the Zod layer — matches how `Incident.status`/`category`/`urgency` are already modeled (no Prisma enums anywhere in this codebase).
- Never run `prisma migrate reset` or any `--accept-data-loss` command against the shared Neon DB (used by both the backend and the Admin repo). This plan's migration only ever adds/backfills/then drops one already-redundant column, via ordinary `prisma migrate dev`.
- Backend repo path: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend`. Frontend repo path (this repo): `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend`. Tasks 1-6 run in the backend repo; Tasks 7-10 run in this frontend repo.

---

### Task 1: Add backend test infrastructure

The backend currently has zero test tooling (no test runner, no test script, no test files). This task adds the minimum needed to unit-test the pure roster logic in Task 3, using Node's built-in test runner (no new dependency needed — `tsx` and TypeScript are already present, and the backend is already ESM (`"type": "module"` in `package.json`)).

**Files:**
- Create: `src/utils/AppError.test.ts`
- Modify: `package.json` (add `test` script)

**Interfaces:**
- Produces: a working `npm test` command that Task 3's tests run under.

- [ ] **Step 1: Add the `test` script**

In `package.json`, add to `"scripts"` (alongside the existing `"dev"`/`"build"` lines):

```json
"test": "tsx --test src/**/*.test.ts"
```

- [ ] **Step 2: Write a smoke test for the existing `AppError` utility**

Create `src/utils/AppError.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { AppError } from "@/utils/AppError";

test("AppError defaults to a 500 status code", () => {
    const err = new AppError("boom");
    assert.equal(err.statusCode, 500);
    assert.equal(err.isOperational, true);
    assert.equal(err.message, "boom");
});

test("AppError accepts an explicit status code", () => {
    const err = new AppError("not found", 404);
    assert.equal(err.statusCode, 404);
});
```

- [ ] **Step 3: Run the tests to verify the harness works**

Run: `npm test`
Expected: both tests in `AppError.test.ts` pass (2 passed, 0 failed).

- [ ] **Step 4: Commit**

```bash
git add package.json src/utils/AppError.test.ts
git commit -m "chore: add minimal test infrastructure via node:test"
```

---

### Task 2: Prisma migration — add `IncidentResponder`, backfill, drop `acceptedByResponderId`

Uses the standard "expand, migrate data, contract" pattern so no raw hand-written SQL is needed and no assumption is made about which Postgres extensions are enabled on Neon — the backfill runs through Prisma Client (which already generates every other model's `id` client-side, not via a DB default) exactly like the rest of this codebase.

**This step writes to the shared Neon DB used by both this backend and the Admin repo. Confirm with the user before running Step 3 and Step 6 against it if this is being executed against the real dev database rather than a local/branch database.**

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/backfillIncidentResponders.ts`

**Interfaces:**
- Produces: `IncidentResponder` Prisma model (`id`, `incidentId`, `responderId`, `status`, `createdAt`, `updatedAt`, unique on `(incidentId, responderId)`), used by every later backend task. `Incident.acceptedByResponderId`/`acceptedBy` and `User.acceptedIncidents` no longer exist.

- [ ] **Step 1: Add the `IncidentResponder` model (expand phase — keep `acceptedByResponderId` for now)**

In `prisma/schema.prisma`, add `respondedIncidents IncidentResponder[]` to `User` (alongside the existing `acceptedIncidents` line, which stays for now):

```prisma
model User {
  id                 String     @id @default(uuid())
  email              String     @unique
  password           String?
  googleId           String?    @unique
  name               String?
  mobile             String?
  role               String     @default("citizen")
  pushToken          String?
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt
  sosAlerts          SosAlert[]
  reportedIncidents  Incident[] @relation("ReportedIncidents")
  acceptedIncidents  Incident[] @relation("AcceptedIncidents")
  respondedIncidents IncidentResponder[]
  announcements      Announcement[]
  notifications      Notification[]
}
```

Add the new model after `Incident`:

```prisma
model IncidentResponder {
  id          String   @id @default(uuid())
  incidentId  String
  incident    Incident @relation(fields: [incidentId], references: [id])
  responderId String
  responder   User     @relation(fields: [responderId], references: [id])
  status      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([incidentId, responderId])
}
```

Add the back-relation to `Incident` (it needs a relation field to satisfy Prisma's requirement that both sides of a relation are declared):

```prisma
model Incident {
  id                     String   @id @default(uuid())
  source                 String
  reporterId             String
  reporter               User     @relation("ReportedIncidents", fields: [reporterId], references: [id])
  sosAlertId             String?
  category               String
  details                String?
  locationLabel          String
  latitude               Float?
  longitude              Float?
  urgency                String
  status                 String   @default("pending")
  acceptedByResponderId  String?
  acceptedBy             User?    @relation("AcceptedIncidents", fields: [acceptedByResponderId], references: [id])
  responders             IncidentResponder[]
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}
```

- [ ] **Step 2: Generate the expand migration**

Run: `npx prisma migrate dev --name add_incident_responder`
Expected: a new folder under `prisma/migrations/` containing a `CreateTable "IncidentResponder"`, a `CreateIndex` for the unique constraint, and two `AddForeignKey` statements. No `DROP` statements — this migration is purely additive. Prisma applies it automatically.

- [ ] **Step 3: Write and run the backfill script**

Create `prisma/backfillIncidentResponders.ts`:

```ts
import { prisma } from "@/lib/prisma";

const STATUS_MAP: Record<string, string> = {
    lobby: "joined",
    on_the_way: "on_the_way",
    arrived: "arrived",
    completed: "arrived",
    cancelled: "arrived",
};

async function main() {
    const incidents = await prisma.incident.findMany({
        where: { acceptedByResponderId: { not: null } },
        select: { id: true, acceptedByResponderId: true, status: true, updatedAt: true },
    });

    let created = 0;
    for (const incident of incidents) {
        if (!incident.acceptedByResponderId) continue;
        await prisma.incidentResponder.upsert({
            where: {
                incidentId_responderId: {
                    incidentId: incident.id,
                    responderId: incident.acceptedByResponderId,
                },
            },
            update: {},
            create: {
                incidentId: incident.id,
                responderId: incident.acceptedByResponderId,
                status: STATUS_MAP[incident.status] ?? "joined",
                createdAt: incident.updatedAt,
                updatedAt: incident.updatedAt,
            },
        });
        created++;
    }

    console.log(`Backfilled ${created} IncidentResponder row(s).`);
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();
        process.exit(1);
    });
```

Run: `npx tsx prisma/backfillIncidentResponders.ts`
Expected: logs `Backfilled N IncidentResponder row(s).` where N is the count of previously-accepted incidents in the database (0 is a valid result on a fresh/empty dev database).

- [ ] **Step 4: Verify the backfill**

Run: `npx prisma studio` (or a one-off `npx tsx -e "..."` query) and confirm every `Incident` row that had `acceptedByResponderId` set now has a matching `IncidentResponder` row with the same `responderId`.

- [ ] **Step 5: Remove `acceptedByResponderId` (contract phase)**

In `prisma/schema.prisma`, remove `acceptedIncidents` from `User`:

```prisma
  reportedIncidents  Incident[] @relation("ReportedIncidents")
  respondedIncidents IncidentResponder[]
```

Remove `acceptedByResponderId`/`acceptedBy` from `Incident`:

```prisma
model Incident {
  id                     String   @id @default(uuid())
  source                 String
  reporterId             String
  reporter               User     @relation("ReportedIncidents", fields: [reporterId], references: [id])
  sosAlertId             String?
  category               String
  details                String?
  locationLabel          String
  latitude               Float?
  longitude              Float?
  urgency                String
  status                 String   @default("pending")
  responders             IncidentResponder[]
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}
```

- [ ] **Step 6: Generate and apply the contract migration**

Run: `npx prisma migrate dev --name drop_accepted_by_responder_id`
Expected: a new migration folder with a `DropForeignKey` for `Incident_acceptedByResponderId_fkey` and an `AlterTable ... DROP COLUMN "acceptedByResponderId"`. By this point every row's data is already preserved in `IncidentResponder` from Step 3, so this is safe.

- [ ] **Step 7: Generate the Prisma client and typecheck**

Run: `npx prisma generate && npx tsc --noEmit`
Expected: no errors (later tasks will introduce the code that uses the new model — this step just confirms the schema itself compiles).

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/backfillIncidentResponders.ts
git commit -m "feat: add IncidentResponder table, backfill from acceptedByResponderId, drop the column"
```

---

### Task 3: Roster transition + status-derivation pure logic, with unit tests

The core business rules as pure functions — no Prisma, no Express, fully unit-testable. This is the module every later backend task depends on.

**Files:**
- Create: `src/services/incidentRoster.ts`
- Test: `src/services/incidentRoster.test.ts`

**Interfaces:**
- Produces:
  - `export type ResponderRosterStatus = "joined" | "on_the_way" | "arrived" | "left" | "declined"`
  - `export type IncidentAggregateStatus = "pending" | "lobby" | "on_the_way" | "arrived"`
  - `export function isActiveStatus(status: ResponderRosterStatus): boolean`
  - `export function isRosterTransitionAllowed(currentStatus: ResponderRosterStatus | null, targetStatus: ResponderRosterStatus): boolean`
  - `export function deriveIncidentStatus(activeStatuses: ResponderRosterStatus[]): IncidentAggregateStatus`
  - `export function pickAcceptedByResponderId(rows: { id: string; responderId: string; status: ResponderRosterStatus; createdAt: Date }[]): string | null`
  - Used by Task 4 (`isRosterTransitionAllowed`, `isActiveStatus`, `deriveIncidentStatus`) and Task 6 (`isActiveStatus`, `pickAcceptedByResponderId`).

- [ ] **Step 1: Write the failing tests**

Create `src/services/incidentRoster.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
    deriveIncidentStatus,
    isActiveStatus,
    isRosterTransitionAllowed,
    pickAcceptedByResponderId,
} from "@/services/incidentRoster";

test("isActiveStatus is true only for joined/on_the_way/arrived", () => {
    assert.equal(isActiveStatus("joined"), true);
    assert.equal(isActiveStatus("on_the_way"), true);
    assert.equal(isActiveStatus("arrived"), true);
    assert.equal(isActiveStatus("left"), false);
    assert.equal(isActiveStatus("declined"), false);
});

test("isRosterTransitionAllowed: joining is allowed with no prior row or after leaving", () => {
    assert.equal(isRosterTransitionAllowed(null, "joined"), true);
    assert.equal(isRosterTransitionAllowed("left", "joined"), true);
    assert.equal(isRosterTransitionAllowed("joined", "joined"), false);
    assert.equal(isRosterTransitionAllowed("declined", "joined"), false);
});

test("isRosterTransitionAllowed: declining is only allowed with no prior row", () => {
    assert.equal(isRosterTransitionAllowed(null, "declined"), true);
    assert.equal(isRosterTransitionAllowed("joined", "declined"), false);
    assert.equal(isRosterTransitionAllowed("left", "declined"), false);
    assert.equal(isRosterTransitionAllowed("declined", "declined"), false);
});

test("isRosterTransitionAllowed: advancing on_the_way/arrived requires an active row", () => {
    assert.equal(isRosterTransitionAllowed("joined", "on_the_way"), true);
    assert.equal(isRosterTransitionAllowed("on_the_way", "arrived"), true);
    assert.equal(isRosterTransitionAllowed(null, "on_the_way"), false);
    assert.equal(isRosterTransitionAllowed("declined", "arrived"), false);
    assert.equal(isRosterTransitionAllowed("joined", "arrived"), false);
});

test("isRosterTransitionAllowed: leaving requires an active row", () => {
    assert.equal(isRosterTransitionAllowed("joined", "left"), true);
    assert.equal(isRosterTransitionAllowed("on_the_way", "left"), true);
    assert.equal(isRosterTransitionAllowed("arrived", "left"), true);
    assert.equal(isRosterTransitionAllowed(null, "left"), false);
    assert.equal(isRosterTransitionAllowed("declined", "left"), false);
});

test("deriveIncidentStatus picks the highest-progress active status", () => {
    assert.equal(deriveIncidentStatus([]), "pending");
    assert.equal(deriveIncidentStatus(["joined"]), "lobby");
    assert.equal(deriveIncidentStatus(["joined", "on_the_way"]), "on_the_way");
    assert.equal(deriveIncidentStatus(["on_the_way", "arrived"]), "arrived");
});

test("pickAcceptedByResponderId picks the earliest-created active row", () => {
    const result = pickAcceptedByResponderId([
        { id: "r1", responderId: "alice", status: "left", createdAt: new Date("2026-01-01T00:00:00Z") },
        { id: "r2", responderId: "bob", status: "joined", createdAt: new Date("2026-01-02T00:00:00Z") },
        { id: "r3", responderId: "carol", status: "on_the_way", createdAt: new Date("2026-01-03T00:00:00Z") },
    ]);
    assert.equal(result, "bob");
});

test("pickAcceptedByResponderId returns null when nobody is active", () => {
    const result = pickAcceptedByResponderId([
        { id: "r1", responderId: "alice", status: "declined", createdAt: new Date("2026-01-01T00:00:00Z") },
        { id: "r2", responderId: "bob", status: "left", createdAt: new Date("2026-01-02T00:00:00Z") },
    ]);
    assert.equal(result, null);
});

test("pickAcceptedByResponderId breaks an exact createdAt tie by id", () => {
    const tiedTime = new Date("2026-01-01T00:00:00.000Z");
    const result = pickAcceptedByResponderId([
        { id: "r2", responderId: "bob", status: "joined", createdAt: tiedTime },
        { id: "r1", responderId: "alice", status: "joined", createdAt: tiedTime },
    ]);
    assert.equal(result, "alice");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find package '@/services/incidentRoster'` (the implementation file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/services/incidentRoster.ts`:

```ts
// src/services/incidentRoster.ts
// Pure roster-transition and status-derivation rules for multi-responder
// incidents. No Prisma, no Express -- unit-tested directly. See
// docs/superpowers/specs/2026-09-08-multi-responder-incidents-design.md.

export type ResponderRosterStatus =
    | "joined"
    | "on_the_way"
    | "arrived"
    | "left"
    | "declined";

export type IncidentAggregateStatus = "pending" | "lobby" | "on_the_way" | "arrived";

const ACTIVE_STATUSES: ResponderRosterStatus[] = ["joined", "on_the_way", "arrived"];

export function isActiveStatus(status: ResponderRosterStatus): boolean {
    return ACTIVE_STATUSES.includes(status);
}

// Allowed (currentStatus | null) -> targetStatus transitions for a single
// responder's own IncidentResponder row. `null` currentStatus means the
// responder has no row yet for this incident.
export function isRosterTransitionAllowed(
    currentStatus: ResponderRosterStatus | null,
    targetStatus: ResponderRosterStatus,
): boolean {
    switch (targetStatus) {
        case "joined":
            return currentStatus === null || currentStatus === "left";
        case "declined":
            return currentStatus === null;
        case "on_the_way":
            return currentStatus === "joined" || currentStatus === "on_the_way";
        case "arrived":
            return currentStatus === "on_the_way" || currentStatus === "arrived";
        case "left":
            return (
                currentStatus === "joined" ||
                currentStatus === "on_the_way" ||
                currentStatus === "arrived"
            );
        default:
            return false;
    }
}

// Derives the citizen-facing aggregate Incident.status from the set of
// currently-active (joined/on_the_way/arrived) roster statuses for one
// incident. Highest-progress-wins; an empty set means nobody is helping.
export function deriveIncidentStatus(
    activeStatuses: ResponderRosterStatus[],
): IncidentAggregateStatus {
    if (activeStatuses.includes("arrived")) return "arrived";
    if (activeStatuses.includes("on_the_way")) return "on_the_way";
    if (activeStatuses.includes("joined")) return "lobby";
    return "pending";
}

// Picks the acceptedByResponderId-shaped value for backward compatibility
// with the Admin repo: the responder with the earliest createdAt among
// active-only rows (never left/declined), id as a deterministic tiebreaker
// for an exact createdAt collision. Returns null if nobody is active.
export function pickAcceptedByResponderId(
    rows: { id: string; responderId: string; status: ResponderRosterStatus; createdAt: Date }[],
): string | null {
    const active = rows.filter((r) => isActiveStatus(r.status));
    if (active.length === 0) return null;

    const earliest = [...active].sort((a, b) => {
        const diff = a.createdAt.getTime() - b.createdAt.getTime();
        if (diff !== 0) return diff;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })[0];

    return earliest.responderId;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests in `incidentRoster.test.ts` green, plus the `AppError.test.ts` tests from Task 1.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/incidentRoster.ts src/services/incidentRoster.test.ts
git commit -m "feat: add roster transition and status derivation logic"
```

---

### Task 4: `PATCH /incidents/:id/responders/me` — join/decline/advance/leave

Replaces `POST /incidents/:id/accept`. One endpoint for every self-service roster action.

**Files:**
- Modify: `src/validations/incident.validation.ts`
- Modify: `src/services/incident.service.ts`
- Modify: `src/controllers/incident.controller.ts`
- Modify: `src/routes/incident.routes.ts`

**Interfaces:**
- Consumes: `isRosterTransitionAllowed`, `isActiveStatus`, `deriveIncidentStatus`, `pickAcceptedByResponderId`, `type ResponderRosterStatus` from `@/services/incidentRoster` (Task 3).
- Produces: `shapeResponders(rows)` and `buildResponderFacingIncident(incident, responderRows, requesterId)` — internal helpers in `incident.service.ts`, reused by Task 5 and Task 6 (not exported outside the module; every backend task that needs them lives in this same file). `incidentService.updateMyResponderStatus(id: string, responderId: string, targetStatus: ResponderRosterStatus)` — returns the full responder-facing shape (`id`, `category`, `details`, `locationLabel`, `latitude`, `longitude`, `urgency`, `status`, `createdAt`, `updatedAt`, `respondersCount`, `acceptedByResponderId`, `responders`, `myStatus`), **not** a raw Prisma row — this matters because the frontend (Task 8/9) derives its next UI phase directly from this response's `myStatus`, so every endpoint a responder calls must return it freshly computed.

- [ ] **Step 1: Add the request-body schema, remove the old accept schema's need**

In `src/validations/incident.validation.ts`, add:

```ts
export const updateMyResponderStatusSchema = z.object({
    status: z.enum(["joined", "declined", "on_the_way", "arrived", "left"]),
});
```

(Leave `createIncidentSchema` and `updateIncidentStatusSchema` as they are for now — `updateIncidentStatusSchema` is narrowed in Task 5.)

- [ ] **Step 2: Add the import, the shaping helpers, remove `accept`, add `updateMyResponderStatus`, in `incident.service.ts`**

Add to the top imports (alongside the existing `AppError`/`notificationService` imports):

```ts
import {
    deriveIncidentStatus,
    isActiveStatus,
    isRosterTransitionAllowed,
    pickAcceptedByResponderId,
    type ResponderRosterStatus,
} from "@/services/incidentRoster";
```

Add these two helpers above `export const incidentService = {` (they read from an `IncidentResponder` row that has its `responder` relation included for the display name):

```ts
type ResponderRowWithName = {
    id: string;
    responderId: string;
    status: string;
    createdAt: Date;
    responder: { name: string | null };
};

function shapeResponders(rows: ResponderRowWithName[]) {
    const activeRows = rows.filter((r) => isActiveStatus(r.status as ResponderRosterStatus));
    return {
        respondersCount: activeRows.length,
        acceptedByResponderId: pickAcceptedByResponderId(
            rows.map((r) => ({
                id: r.id,
                responderId: r.responderId,
                status: r.status as ResponderRosterStatus,
                createdAt: r.createdAt,
            })),
        ),
        activeResponders: activeRows.map((r) => ({
            id: r.responderId,
            name: r.responder.name ?? "Responder",
            status: r.status,
        })),
    };
}

// The full shape any responder-facing endpoint returns for one incident:
// the citizen-safe fields plus the roster summary and the caller's own
// status. Used by updateMyResponderStatus/updateStatus (this file, below)
// and by list()/getById() (Task 6) so every endpoint a responder hits
// returns a consistent, fully-populated shape -- critical for
// updateMyResponderStatus specifically, since the frontend derives its
// next UI phase directly from this response's `myStatus`.
function buildResponderFacingIncident(
    incident: {
        id: string;
        category: string;
        details: string | null;
        locationLabel: string;
        latitude: number | null;
        longitude: number | null;
        urgency: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    },
    responderRows: ResponderRowWithName[],
    requesterId: string,
) {
    const shaped = shapeResponders(responderRows);
    const myRow = responderRows.find((r) => r.responderId === requesterId);
    return {
        id: incident.id,
        category: incident.category,
        details: incident.details,
        locationLabel: incident.locationLabel,
        latitude: incident.latitude,
        longitude: incident.longitude,
        urgency: incident.urgency,
        status: incident.status,
        createdAt: incident.createdAt,
        updatedAt: incident.updatedAt,
        respondersCount: shaped.respondersCount,
        acceptedByResponderId: shaped.acceptedByResponderId,
        responders: shaped.activeResponders,
        myStatus: myRow?.status ?? "pending",
    };
}
```

Delete the entire `accept` method:

```ts
    async accept(id: string, responderId: string) {
        const incident = await prisma.incident.findUnique({ where: { id } });
        if (!incident) throw new AppError("Incident not found", 404);
        if (incident.status !== "pending") {
            throw new AppError("Incident already accepted", 409);
        }

        const updated = await prisma.incident.update({
            where: { id },
            data: { status: "lobby", acceptedByResponderId: responderId },
        });

        await notifyStatusChange(updated.reporterId, updated.id, updated.status, updated.source);
        return updated;
    },
```

Add this method in its place:

```ts
    async updateMyResponderStatus(
        id: string,
        responderId: string,
        targetStatus: ResponderRosterStatus,
    ) {
        const incident = await prisma.incident.findUnique({ where: { id } });
        if (!incident) throw new AppError("Incident not found", 404);

        const existingRow = await prisma.incidentResponder.findUnique({
            where: { incidentId_responderId: { incidentId: id, responderId } },
        });
        const currentStatus = (existingRow?.status as ResponderRosterStatus | undefined) ?? null;

        if (!isRosterTransitionAllowed(currentStatus, targetStatus)) {
            throw new AppError(
                `Cannot move from ${currentStatus ?? "no status"} to ${targetStatus}`,
                409,
            );
        }

        await prisma.incidentResponder.upsert({
            where: { incidentId_responderId: { incidentId: id, responderId } },
            update: { status: targetStatus },
            create: { incidentId: id, responderId, status: targetStatus },
        });

        const allRows = await prisma.incidentResponder.findMany({
            where: { incidentId: id },
            include: { responder: { select: { name: true } } },
        });
        const activeStatuses = allRows
            .filter((r) => isActiveStatus(r.status as ResponderRosterStatus))
            .map((r) => r.status as ResponderRosterStatus);
        const newStatus = deriveIncidentStatus(activeStatuses);

        let updatedIncident = incident;
        if (newStatus !== incident.status) {
            updatedIncident = await prisma.incident.update({ where: { id }, data: { status: newStatus } });
            await notifyStatusChange(
                updatedIncident.reporterId,
                updatedIncident.id,
                updatedIncident.status,
                updatedIncident.source,
            );
        }

        return buildResponderFacingIncident(updatedIncident, allRows, responderId);
    },
```

- [ ] **Step 3: Replace the `accept` controller with `updateMyResponderStatus`**

In `src/controllers/incident.controller.ts`, replace:

```ts
    accept: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const incident = await incidentService.accept(req.params.id as string, req.userId!);
        res.status(200).json({ success: true, incident });
    }),
```

with:

```ts
    updateMyResponderStatus: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const incident = await incidentService.updateMyResponderStatus(
            req.params.id as string,
            req.userId!,
            req.body.status,
        );
        res.status(200).json({ success: true, incident });
    }),
```

- [ ] **Step 4: Replace the route**

In `src/routes/incident.routes.ts`, replace:

```ts
router.patch("/incidents/:id/accept", authenticate, incidentController.accept);
```

with:

```ts
router.patch(
    "/incidents/:id/responders/me",
    authenticate,
    validate(updateMyResponderStatusSchema),
    incidentController.updateMyResponderStatus,
);
```

Add `updateMyResponderStatusSchema` to the existing import from `@/validations/incident.validation` at the top of the file.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manually verify against a running server**

Start the server: `npm run dev`

With a valid responder JWT (`$TOKEN`) and an existing pending incident id (`$ID`):

```bash
curl -X PATCH http://localhost:8000/api/incidents/$ID/responders/me \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"joined"}'
```

Expected: `200` with `{"success":true,"incident":{...,"status":"lobby","myStatus":"joined","respondersCount":1,"responders":[{"id":"<responder id>","name":"...","status":"joined"}]}}` — `myStatus` and `responders` must be present and correct, not just `status`. Repeating the same call again is expected to return `409` (already joined). Then:

```bash
curl -X PATCH http://localhost:8000/api/incidents/$ID/responders/me \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"declined"}'
```

Expected: `409` (a row already exists from the join above — declining after joining is correctly rejected).

- [ ] **Step 7: Commit**

```bash
git add src/validations/incident.validation.ts src/services/incident.service.ts src/controllers/incident.controller.ts src/routes/incident.routes.ts
git commit -m "feat: replace exclusive accept with per-responder join/decline/advance/leave"
```

---

### Task 5: Narrow `PATCH /incidents/:id/status` to completed/cancelled, arrived-only

**Files:**
- Modify: `src/validations/incident.validation.ts`
- Modify: `src/services/incident.service.ts`

**Interfaces:**
- Consumes: the `buildResponderFacingIncident` helper added in Task 4 (same file, no new import).
- Produces: `incidentService.updateStatus(id: string, responderId: string, status: "completed" | "cancelled")` — same name as before, narrower `status` parameter type, a new arrived-only permission check, and now returns the same responder-facing shape as `updateMyResponderStatus` (Task 4) instead of a raw Prisma row, for the same reason: the frontend reads `myStatus` off every response.

- [ ] **Step 1: Narrow the schema**

In `src/validations/incident.validation.ts`, replace:

```ts
export const updateIncidentStatusSchema = z.object({
    status: z.enum(["on_the_way", "arrived", "completed", "cancelled"]),
});
```

with:

```ts
export const updateIncidentStatusSchema = z.object({
    status: z.enum(["completed", "cancelled"]),
});
```

- [ ] **Step 2: Add the arrived-only check to `updateStatus`**

In `src/services/incident.service.ts`, replace:

```ts
    async updateStatus(id: string, responderId: string, status: string) {
        const incident = await prisma.incident.findUnique({ where: { id } });
        if (!incident) throw new AppError("Incident not found", 404);
        if (incident.acceptedByResponderId !== responderId) {
            throw new AppError("Not your incident", 403);
        }

        // No-op a retried/duplicate PATCH that doesn't actually change the
        // status -- avoids re-updating updatedAt and re-notifying the
        // reporter for a status they were already notified about.
        if (incident.status === status) {
            return incident;
        }

        const updated = await prisma.incident.update({
            where: { id },
            data: { status },
        });

        await notifyStatusChange(updated.reporterId, updated.id, updated.status, updated.source);
        return updated;
    },
```

with:

```ts
    async updateStatus(id: string, responderId: string, status: "completed" | "cancelled") {
        const incident = await prisma.incident.findUnique({ where: { id } });
        if (!incident) throw new AppError("Incident not found", 404);

        const myRow = await prisma.incidentResponder.findUnique({
            where: { incidentId_responderId: { incidentId: id, responderId } },
        });
        if (myRow?.status !== "arrived") {
            throw new AppError("You must be on-scene to close this incident", 403);
        }

        // No-op a retried/duplicate PATCH that doesn't actually change the
        // status -- avoids re-updating updatedAt and re-notifying the
        // reporter for a status they were already notified about.
        let updatedIncident = incident;
        if (incident.status !== status) {
            updatedIncident = await prisma.incident.update({
                where: { id },
                data: { status },
            });
            await notifyStatusChange(
                updatedIncident.reporterId,
                updatedIncident.id,
                updatedIncident.status,
                updatedIncident.source,
            );
        }

        const allRows = await prisma.incidentResponder.findMany({
            where: { incidentId: id },
            include: { responder: { select: { name: true } } },
        });
        return buildResponderFacingIncident(updatedIncident, allRows, responderId);
    },
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manually verify**

With the server running and a responder who has an `arrived` row for incident `$ID`:

```bash
curl -X PATCH http://localhost:8000/api/incidents/$ID/status \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

Expected: `200`. Repeat with a responder who only has a `joined` row (not arrived): expect `403` ("You must be on-scene to close this incident").

- [ ] **Step 5: Commit**

```bash
git add src/validations/incident.validation.ts src/services/incident.service.ts
git commit -m "fix: require an arrived responder to complete or cancel an incident"
```

---

### Task 6: Reshape `list()`/`getById()` with roster data and the decline filter

**Files:**
- Modify: `src/services/incident.service.ts`
- Modify: `src/controllers/incident.controller.ts`

**Interfaces:**
- Consumes: `shapeResponders` and `buildResponderFacingIncident` (both already added in Task 4, same file — no new import needed for this task).
- Produces: `incidentService.list(responderId: string)` — every incident excludes the caller's declined ones and gains `acceptedByResponderId`, `respondersCount`, `myStatus`. `incidentService.getById(id, requesterId)` — citizens get `respondersCount` only; responders get the same full shape `updateMyResponderStatus`/`updateStatus` already return (Task 4/5), via the shared `buildResponderFacingIncident` helper. Both are consumed directly by `services/incident.service.ts` in the frontend (Task 8).

- [ ] **Step 1: Rewrite `list()`**

Replace:

```ts
    async list() {
        return prisma.incident.findMany({
            where: { status: { in: NON_TERMINAL_STATUSES } },
            orderBy: { createdAt: "desc" },
        });
    },
```

with:

```ts
    async list(responderId: string) {
        const incidents = await prisma.incident.findMany({
            where: {
                status: { in: NON_TERMINAL_STATUSES },
                responders: { none: { responderId, status: "declined" } },
            },
            orderBy: { createdAt: "desc" },
            include: { responders: { include: { responder: { select: { name: true } } } } },
        });

        return incidents.map(({ responders, ...incident }) => {
            const shaped = shapeResponders(responders);
            const myRow = responders.find((r) => r.responderId === responderId);
            return {
                ...incident,
                acceptedByResponderId: shaped.acceptedByResponderId,
                respondersCount: shaped.respondersCount,
                myStatus: myRow?.status ?? "pending",
            };
        });
    },
```

- [ ] **Step 2: Rewrite `getById()`**

Replace:

```ts
    async getById(id: string, requesterId: string) {
        const incident = await prisma.incident.findUnique({ where: { id } });
        if (!incident) throw new AppError("Incident not found", 404);

        const requester = await prisma.user.findUnique({ where: { id: requesterId } });
        if (requester?.role === "citizen" && incident.reporterId !== requesterId) {
            throw new AppError("Not your report", 403);
        }

        // Shaped rather than the raw row -- keeps internal identifiers
        // (reporterId, acceptedByResponderId, sosAlertId, source) off the
        // wire now that citizens hit this endpoint directly for their own
        // report detail, not just responders viewing incidents to accept.
        return {
            id: incident.id,
            category: incident.category,
            details: incident.details,
            locationLabel: incident.locationLabel,
            latitude: incident.latitude,
            longitude: incident.longitude,
            urgency: incident.urgency,
            status: incident.status,
            createdAt: incident.createdAt,
            updatedAt: incident.updatedAt,
        };
    },
```

with:

```ts
    async getById(id: string, requesterId: string) {
        const incident = await prisma.incident.findUnique({
            where: { id },
            include: { responders: { include: { responder: { select: { name: true } } } } },
        });
        if (!incident) throw new AppError("Incident not found", 404);

        const requester = await prisma.user.findUnique({ where: { id: requesterId } });
        if (requester?.role === "citizen" && incident.reporterId !== requesterId) {
            throw new AppError("Not your report", 403);
        }

        if (requester?.role === "citizen") {
            const shaped = shapeResponders(incident.responders);
            return {
                id: incident.id,
                category: incident.category,
                details: incident.details,
                locationLabel: incident.locationLabel,
                latitude: incident.latitude,
                longitude: incident.longitude,
                urgency: incident.urgency,
                status: incident.status,
                createdAt: incident.createdAt,
                updatedAt: incident.updatedAt,
                respondersCount: shaped.respondersCount,
            };
        }

        return buildResponderFacingIncident(incident, incident.responders, requesterId);
    },
```

- [ ] **Step 3: Pass the requester id through in the controller**

In `src/controllers/incident.controller.ts`, replace:

```ts
    list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const incidents = await incidentService.list();
        res.status(200).json({ success: true, incidents });
    }),
```

with:

```ts
    list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const incidents = await incidentService.list(req.userId!);
        res.status(200).json({ success: true, incidents });
    }),
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify**

```bash
curl http://localhost:8000/api/incidents -H "Authorization: Bearer $TOKEN"
```

Expected: `200`, each incident has `acceptedByResponderId`, `respondersCount`, `myStatus`, and **no** raw `responders` array (that's only ever returned by `getById`, never `list`). An incident the caller previously declined (from Task 4's manual test) does **not** appear in the list.

```bash
curl http://localhost:8000/api/incidents/$ID -H "Authorization: Bearer $TOKEN"
```

Expected: `200`, includes `responders: [...]` and `myStatus`.

- [ ] **Step 6: Commit**

```bash
git add src/services/incident.service.ts src/controllers/incident.controller.ts
git commit -m "feat: expose roster data and per-responder decline filtering on list/getById"
```

---

### Task 7: Frontend — update `types/responder.ts`

**Files:**
- Modify: `types/responder.ts`

**Interfaces:**
- Produces: `export type ResponderStatus = "joined" | "on_the_way" | "arrived"`; `export type MyResponderStatus = "pending" | "declined" | "joined" | "on_the_way" | "arrived" | "left"`; `Incident.myStatus: MyResponderStatus`; `Incident.maxResponders` removed. Used by Task 8 (`toIncident` mapping), Task 9 (`phaseForMyStatus`), Task 10 (`TeamMemberRow`/`LobbyView`).

- [ ] **Step 1: Update the file**

Replace the full contents of `types/responder.ts`:

```ts
export type Urgency = "high" | "medium" | "low";

export type IncidentStatus =
  | "pending"
  | "lobby"
  | "on_the_way"
  | "arrived"
  | "completed"
  | "cancelled";

// A responder's own status on one incident's roster. "pending" and "left"
// are frontend-only conveniences: "pending" means no IncidentResponder row
// exists yet (haven't joined or declined); the backend never returns
// "left" for `myStatus` on a fresh load since there's no UI path back to
// this screen after leaving, but it's modeled here for completeness since
// the backend accepts it as a roster transition target.
export type MyResponderStatus =
  | "pending"
  | "declined"
  | "joined"
  | "on_the_way"
  | "arrived"
  | "left";

// A status as it appears in another responder's roster entry -- only ever
// one of the three "currently helping" states; declined/left responders
// never appear in `Incident.team`.
export type ResponderStatus = "joined" | "on_the_way" | "arrived";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface TeamMember {
  id: string;
  name: string;
  status: ResponderStatus;
  isCaptain?: boolean;
}

export interface Incident {
  id: string;
  type: string;
  location: string;
  urgency: Urgency;
  distanceKm?: number;
  status: IncidentStatus;
  team: TeamMember[];
  myStatus: MyResponderStatus;
  etaMinutes?: number;
  responderCoords?: Coordinates;
  incidentCoords?: Coordinates;
}
```

- [ ] **Step 2: Fix the existing test fixtures that construct `Incident` objects directly**

Two existing test files build `Incident` fixtures with the now-removed `maxResponders` field and are missing the now-required `myStatus` field: `components/responder/groupIncidentsByBarangay.test.ts` and `components/responder/filterIncidents.test.ts`. Both have an identical `makeIncident` helper. In **each** file, replace:

```ts
function makeIncident(overrides: Partial<Incident> & { id: string }): Incident {
  return {
    type: "Test Incident",
    location: "Test Location",
    urgency: "low",
    status: "pending",
    maxResponders: 1,
    team: [],
    ...overrides,
  };
}
```

with:

```ts
function makeIncident(overrides: Partial<Incident> & { id: string }): Incident {
  return {
    type: "Test Incident",
    location: "Test Location",
    urgency: "low",
    status: "pending",
    team: [],
    myStatus: "pending",
    ...overrides,
  };
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: new errors only at `LobbyView.tsx`'s remaining use of `incident.maxResponders` (fixed in Task 10) and at `app/responder/[id].tsx`'s remaining calls to `acceptIncident`/old `IncidentCard` usage missing `myStatus` context (fixed in Tasks 8-9). Confirm these are the only new errors — the two test files from Step 2 should typecheck clean now.

- [ ] **Step 4: Run the existing test suites to confirm the fixture fix didn't break them**

Run: `npx jest groupIncidentsByBarangay filterIncidents`
Expected: PASS — all previously-passing tests in both files still green (this task only changed fixture shape, not the logic under test).

- [ ] **Step 5: Commit**

```bash
git add types/responder.ts components/responder/groupIncidentsByBarangay.test.ts components/responder/filterIncidents.test.ts
git commit -m "feat: model per-responder roster status in the Incident type"
```

---

### Task 8: Frontend — update `services/incident.service.ts`

**Files:**
- Modify: `services/incident.service.ts`
- Test: `services/incident.service.test.ts`

**Interfaces:**
- Consumes: `type Incident`, `type MyResponderStatus`, `type ResponderStatus` from `@/types/responder` (Task 7).
- Produces: `export function toIncident(row: IncidentApiRow, responderLocation?: Coordinates): Incident` (now exported, for the test below); `export async function joinIncident(token, id): Promise<Incident>`; `export async function declineIncident(token, id): Promise<void>`; `export async function updateMyResponderStatus(token, id, status: "on_the_way" | "arrived" | "left"): Promise<Incident>`; `updateIncidentStatus`'s `status` parameter narrows to `"completed" | "cancelled"`; `acceptIncident` is removed. Used by Task 9 (`app/responder/[id].tsx`).

- [ ] **Step 1: Write the failing test for the new `toIncident` mapping**

Create `services/incident.service.test.ts`:

```ts
import { toIncident } from "./incident.service";

describe("toIncident", () => {
  it("maps the roster into team and myStatus", () => {
    const incident = toIncident({
      id: "inc-1",
      category: "fire",
      locationLabel: "Near the market",
      latitude: 10.25,
      longitude: 123.95,
      urgency: "high",
      status: "on_the_way",
      responders: [
        { id: "r1", name: "Alice", status: "on_the_way" },
        { id: "r2", name: "Bob", status: "joined" },
      ],
      myStatus: "on_the_way",
    });

    expect(incident.team).toEqual([
      { id: "r1", name: "Alice", status: "on_the_way" },
      { id: "r2", name: "Bob", status: "joined" },
    ]);
    expect(incident.myStatus).toBe("on_the_way");
  });

  it("defaults team to an empty array and myStatus to pending when the backend omits them", () => {
    const incident = toIncident({
      id: "inc-2",
      category: "flood",
      locationLabel: "Riverside",
      latitude: null,
      longitude: null,
      urgency: "medium",
      status: "pending",
    });

    expect(incident.team).toEqual([]);
    expect(incident.myStatus).toBe("pending");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest incident.service`
Expected: FAIL — `toIncident` isn't exported yet (or `responders`/`myStatus` aren't recognized on `IncidentApiRow`, depending on how far the file gets before erroring). Either failure mode confirms the mapping doesn't exist yet.

- [ ] **Step 3: Update the implementation**

Replace the full contents of `services/incident.service.ts`:

```ts
import { apiGet, apiPatch } from "./api";
import type { Coordinates } from "./location.service";
import { haversineDistanceKm } from "@/utils/distance";
import type { Incident, IncidentStatus, MyResponderStatus, ResponderStatus } from "@/types/responder";

type IncidentApiRow = {
  id: string;
  category: string;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  urgency: "high" | "medium" | "low";
  status: IncidentStatus;
  responders?: { id: string; name: string; status: ResponderStatus }[];
  myStatus?: MyResponderStatus;
};

// Maps a stored category (the citizen-facing CategoryId, plus "sos" for
// SOS-sourced incidents) to the display label the responder screens already
// render via `incident.type` — keeps every existing component (IncidentCard,
// getIncidentVisual, DetailRow, etc.) unchanged.
export const CATEGORY_LABELS: Record<string, string> = {
  flood: "Flood",
  fire: "Fire",
  medical: "Medical Emergency",
  "road-accident": "Road Accident",
  other: "Other",
  sos: "SOS Alert",
};

export function toIncident(row: IncidentApiRow, responderLocation?: Coordinates): Incident {
  const hasCoords = row.latitude != null && row.longitude != null;
  const incidentCoords = hasCoords
    ? { latitude: row.latitude as number, longitude: row.longitude as number }
    : undefined;

  return {
    id: row.id,
    type: CATEGORY_LABELS[row.category] ?? row.category,
    location: row.locationLabel,
    urgency: row.urgency,
    distanceKm:
      incidentCoords && responderLocation
        ? haversineDistanceKm(responderLocation, incidentCoords)
        : undefined,
    status: row.status,
    team: row.responders ?? [],
    myStatus: row.myStatus ?? "pending",
    incidentCoords,
  };
}

export async function getIncidents(
  token: string,
  responderLocation?: Coordinates,
): Promise<Incident[]> {
  const response = await apiGet<{ success: true; incidents: IncidentApiRow[] }>(
    "/api/incidents",
    token,
  );
  return response.incidents.map((row) => toIncident(row, responderLocation));
}

export async function getIncidentById(
  token: string,
  id: string,
  responderLocation?: Coordinates,
): Promise<Incident | undefined> {
  try {
    const response = await apiGet<{ success: true; incident: IncidentApiRow }>(
      `/api/incidents/${id}`,
      token,
    );
    return toIncident(response.incident, responderLocation);
  } catch {
    return undefined;
  }
}

async function updateMyResponderRow(
  token: string,
  id: string,
  status: MyResponderStatus,
): Promise<Incident> {
  const response = await apiPatch<{ success: true; incident: IncidentApiRow }>(
    `/api/incidents/${id}/responders/me`,
    { status },
    token,
  );
  return toIncident(response.incident);
}

export function joinIncident(token: string, id: string): Promise<Incident> {
  return updateMyResponderRow(token, id, "joined");
}

export async function declineIncident(token: string, id: string): Promise<void> {
  await updateMyResponderRow(token, id, "declined");
}

export function updateMyResponderStatus(
  token: string,
  id: string,
  status: "on_the_way" | "arrived" | "left",
): Promise<Incident> {
  return updateMyResponderRow(token, id, status);
}

export async function updateIncidentStatus(
  token: string,
  id: string,
  status: "completed" | "cancelled",
): Promise<Incident> {
  const response = await apiPatch<{ success: true; incident: IncidentApiRow }>(
    `/api/incidents/${id}/status`,
    { status },
    token,
  );
  return toIncident(response.incident);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest incident.service`
Expected: PASS — both new tests green.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: new errors only at `app/responder/[id].tsx`'s remaining calls to `acceptIncident` (removed) — fixed in Task 9.

- [ ] **Step 6: Commit**

```bash
git add services/incident.service.ts services/incident.service.test.ts
git commit -m "feat: wire incident.service to the per-responder roster endpoints"
```

---

### Task 9: Frontend — `phaseForMyStatus` and wire `app/responder/[id].tsx`

Switches the phase state machine from a locally-mirrored `phase` state to a value derived directly from `incident.myStatus` on every fetch — removing the possibility of phase/status drift.

**Files:**
- Create: `components/responder/phaseForMyStatus.ts`
- Test: `components/responder/phaseForMyStatus.test.ts`
- Modify: `app/responder/[id].tsx`

**Interfaces:**
- Consumes: `type MyResponderStatus` from `@/types/responder` (Task 7); `joinIncident`, `declineIncident`, `updateMyResponderStatus` from `@/services/incident.service` (Task 8).
- Produces: `export type Phase = "pending" | "lobby" | "on_the_way" | "arrived"`; `export function phaseForMyStatus(myStatus: MyResponderStatus): Phase | null` (`null` for `"declined"`/`"left"`, meaning no phase view applies).

- [ ] **Step 1: Write the failing tests**

Create `components/responder/phaseForMyStatus.test.ts`:

```ts
import { phaseForMyStatus } from "./phaseForMyStatus";

describe("phaseForMyStatus", () => {
  it("maps each active status to its phase", () => {
    expect(phaseForMyStatus("pending")).toBe("pending");
    expect(phaseForMyStatus("joined")).toBe("lobby");
    expect(phaseForMyStatus("on_the_way")).toBe("on_the_way");
    expect(phaseForMyStatus("arrived")).toBe("arrived");
  });

  it("returns null for declined and left", () => {
    expect(phaseForMyStatus("declined")).toBeNull();
    expect(phaseForMyStatus("left")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest phaseForMyStatus`
Expected: FAIL — `Cannot find module './phaseForMyStatus'`.

- [ ] **Step 3: Write the implementation**

Create `components/responder/phaseForMyStatus.ts`:

```ts
// components/responder/phaseForMyStatus.ts
// Maps a responder's own roster status on one incident to the phase view
// app/responder/[id].tsx should show. Pure so it's unit-testable without
// mounting the screen.
import type { MyResponderStatus } from "@/types/responder";

export type Phase = "pending" | "lobby" | "on_the_way" | "arrived";

export function phaseForMyStatus(myStatus: MyResponderStatus): Phase | null {
  switch (myStatus) {
    case "pending":
      return "pending";
    case "joined":
      return "lobby";
    case "on_the_way":
      return "on_the_way";
    case "arrived":
      return "arrived";
    case "declined":
    case "left":
      return null;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest phaseForMyStatus`
Expected: PASS — both tests green.

- [ ] **Step 5: Rewrite `app/responder/[id].tsx`**

Replace the full contents of `app/responder/[id].tsx`:

```tsx
// app/responder/[id].tsx
// Screens 1-4 of the responder flow: New Incident -> Team Lobby -> On the
// Way -> Arrived. Each responder's own phase is derived from their own
// IncidentResponder roster status (incident.myStatus), never stored
// separately -- there's no local phase state to drift out of sync with the
// server. Each phase's UI lives in components/responder/incident-detail/ --
// this file only owns the derived phase and the backend calls that advance
// it.
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import ArrivedView from "@/components/responder/incident-detail/ArrivedView";
import LobbyView, { type LobbyTab } from "@/components/responder/incident-detail/LobbyView";
import OnTheWayView from "@/components/responder/incident-detail/OnTheWayView";
import PendingView from "@/components/responder/incident-detail/PendingView";
import { phaseForMyStatus } from "@/components/responder/phaseForMyStatus";
import { useAuth } from "@/context/AuthContext";
import {
  declineIncident,
  getIncidentById,
  joinIncident,
  updateIncidentStatus,
  updateMyResponderStatus,
} from "@/services/incident.service";
import {
  FONT_FAMILY,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Incident } from "@/types/responder";

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [incident, setIncident] = useState<Incident | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [tab, setTab] = useState<LobbyTab>("lobby");

  useEffect(() => {
    if (!token || !id) return;

    getIncidentById(token, id)
      .then(setIncident)
      .finally(() => setIsLoading(false));
  }, [token, id]);

  const myPhase = incident ? phaseForMyStatus(incident.myStatus) : undefined;

  // Only reachable via a stale link -- declined incidents are already
  // filtered out of the dashboard list, so a responder can't tap into one
  // from there. "left" is modeled on the backend but has no UI path back
  // to this screen today either.
  useEffect(() => {
    if (incident && myPhase === null) {
      Alert.alert(
        "Already declined",
        "You already declined this incident.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    }
  }, [incident, myPhase, router]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={COLORS.primary} style={styles.loading} />
      </View>
    );
  }

  if (!incident || myPhase === null || myPhase === undefined) {
    return (
      <View style={styles.screen}>
        <Text style={styles.notFound}>
          {incident ? "" : "Incident not found."}
        </Text>
      </View>
    );
  }

  const phase = myPhase;

  const handleJoin = async () => {
    if (!token || isJoining) return;
    setIsJoining(true);
    try {
      const updated = await joinIncident(token, incident.id);
      setIncident({ ...updated, distanceKm: incident.distanceKm });
    } catch (err) {
      Alert.alert(
        "Couldn't join incident",
        err instanceof Error ? err.message : "Please try again.",
      );
      setIsJoining(false);
      router.back();
    }
  };

  const handleDecline = () => {
    Alert.alert(
      "Decline incident?",
      "You won't see this incident again, but other responders still can.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            if (!token) return;
            try {
              await declineIncident(token, incident.id);
              router.back();
            } catch (err) {
              Alert.alert(
                "Couldn't decline incident",
                err instanceof Error ? err.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const handleHeadOut = async () => {
    if (!token) return;
    try {
      const updated = await updateMyResponderStatus(token, incident.id, "on_the_way");
      setIncident({ ...updated, distanceKm: incident.distanceKm });
    } catch (err) {
      Alert.alert(
        "Something went wrong",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  };

  const handleArrive = async () => {
    if (!token) return;
    try {
      const updated = await updateMyResponderStatus(token, incident.id, "arrived");
      setIncident({ ...updated, distanceKm: incident.distanceKm });
    } catch (err) {
      Alert.alert(
        "Something went wrong",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  };

  const handleCancelIncident = () => {
    Alert.alert("Cancel incident?", "This cannot be undone.", [
      { text: "Back", style: "cancel" },
      {
        text: "Cancel Incident",
        style: "destructive",
        onPress: async () => {
          if (token) {
            await updateIncidentStatus(token, incident.id, "cancelled").catch(() => {});
          }
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + SPACING.sm }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {phase !== "on_the_way" && (
        <View style={styles.header}>
          <BackButton onPress={() => router.dismissTo("/responder")} />
          <Text style={styles.headerTitle}>
            {phase === "pending" ? "New Incident" : `Incident #${incident.id}`}
          </Text>
          <View style={{ width: 36 }} />
        </View>
      )}

      {phase === "pending" && (
        <PendingView
          incident={incident}
          onAccept={handleJoin}
          onDecline={handleDecline}
        />
      )}

      {phase === "lobby" && (
        <LobbyView
          incident={incident}
          tab={tab}
          onChangeTab={setTab}
          onHeadOut={handleHeadOut}
        />
      )}

      {phase === "on_the_way" && (
        <OnTheWayView
          incident={incident}
          onArrive={handleArrive}
        />
      )}

      {phase === "arrived" && (
        <ArrivedView
          incident={incident}
          onStartAssistance={() =>
            Alert.alert("Start Assistance", "Coming soon.")
          }
          onCancelIncident={handleCancelIncident}
        />
      )}
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: COLORS.surface,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: SPACING.md,
      marginBottom: SPACING.md,
    },
    headerTitle: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.subtitle,
      color: COLORS.text,
    },
    notFound: {
      textAlign: "center",
      marginTop: SPACING.xl,
      color: COLORS.textTertiary,
    },
    loading: {
      marginTop: SPACING.xl,
    },
  });
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no new errors beyond the pre-existing, unrelated `components/tabs/TabBar.tsx` error.

- [ ] **Step 7: Run the full test suite**

Run: `npx jest`
Expected: PASS — all suites green, including the two new ones from this task and Task 8.

- [ ] **Step 8: Commit**

```bash
git add components/responder/phaseForMyStatus.ts components/responder/phaseForMyStatus.test.ts "app/responder/[id].tsx"
git commit -m "feat: derive responder phase from myStatus instead of local state"
```

---

### Task 10: Frontend — `LobbyView` and `TeamMemberRow` UI updates

**Files:**
- Modify: `components/responder/incident-detail/LobbyView.tsx`
- Modify: `components/responder/TeamMemberRow.tsx`

**Interfaces:**
- Consumes: `type ResponderStatus` from `@/types/responder` (Task 7, now `"joined" | "on_the_way" | "arrived"`).

- [ ] **Step 1: Drop the `/maxResponders` denominator in `LobbyView.tsx`**

Replace:

```tsx
          <Text style={styles.sectionLabel}>
            Responders Joined ({incident.team.length}/{incident.maxResponders})
          </Text>
```

with:

```tsx
          <Text style={styles.sectionLabel}>
            Responders Joined ({incident.team.length})
          </Text>
```

- [ ] **Step 2: Update `TeamMemberRow.tsx`'s status labels**

Replace:

```ts
function getStatusMeta(
  COLORS: ColorPalette,
): Record<ResponderStatus, { label: string; color: string }> {
  return {
    on_the_way: { label: "On the way", color: COLORS.secondary },
    preparing: { label: "Preparing", color: COLORS.warning },
    online: { label: "Online", color: COLORS.success },
  };
}
```

with:

```ts
function getStatusMeta(
  COLORS: ColorPalette,
): Record<ResponderStatus, { label: string; color: string }> {
  return {
    joined: { label: "Preparing", color: COLORS.warning },
    on_the_way: { label: "On the way", color: COLORS.secondary },
    arrived: { label: "Arrived", color: COLORS.success },
  };
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no new errors beyond the pre-existing, unrelated `components/tabs/TabBar.tsx` error. This confirms every `maxResponders`/old-`ResponderStatus` reference from Task 7's Step 2 check is now resolved.

- [ ] **Step 4: Run the full test suite and lint**

Run: `npx jest && npx expo lint`
Expected: all tests pass; lint problem count matches the pre-existing baseline (53 problems: 45 errors/8 warnings) with no new hits in the files this plan touched.

- [ ] **Step 5: Manually verify on device/simulator**

With the backend running (migrated per Task 2) and two responder accounts:
- Responder A joins a pending incident -> sees the Lobby with "Responders Joined (1)".
- Responder B joins the same incident -> both responders now see "Responders Joined (2)" on their next poll/refresh, and neither is blocked by a 409.
- Responder A heads out (On the Way) while Responder B is still in the Lobby -> each sees their own correct phase.
- A third responder declines the incident from `PendingView` -> it disappears from their dashboard list but still shows for A and B.
- Responder A arrives and cancels the incident -> Responder B's incident (if still open in their app) reflects the incident closing on their next poll.

- [ ] **Step 6: Commit**

```bash
git add components/responder/incident-detail/LobbyView.tsx components/responder/TeamMemberRow.tsx
git commit -m "feat: update Lobby and team roster UI for unlimited responders"
```

---

## Self-Review Notes

- **Spec coverage:** Data model + migration (Task 2), roster-transition/status-derivation rules with the exact determinism the user specified (Task 3), the unified self-service roster endpoint replacing exclusive accept (Task 4), the arrived-only completion gate (Task 5), roster-aware list/getById with the decline filter and Admin-compatible `acceptedByResponderId` (Task 6), frontend types (Task 7), service layer (Task 8), the `myStatus`-driven phase machine replacing local phase state (Task 9), and the UI polish for an uncapped roster (Task 10). Explicitly-out-of-scope items (Admin repo changes, a Leave button, a responder cap, reversible decline) have no tasks, matching the spec.
- **Type consistency:** `ResponderRosterStatus` (Task 3) is consumed identically in Tasks 4-6's Prisma-facing code. `MyResponderStatus`/`ResponderStatus` (Task 7) are consumed identically in Task 8's `IncidentApiRow`/`toIncident`, Task 9's `phaseForMyStatus`, and Task 10's `TeamMemberRow`. `Phase` (Task 9) matches the four view branches Task 9's own JSX renders — no fifth value introduced anywhere.
- **No placeholders:** every step has runnable commands or complete code; the migration task spells out the exact schema diffs and the exact backfill script rather than describing them abstractly.
