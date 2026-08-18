# Responder Incident Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire citizen incident reports and SOS triggers into a new backend `Incident` resource, and make the responder dashboard/detail/navigate screens read and update real incidents instead of `services/mockIncidents.ts`, with a real authenticatable responder identity.

**Architecture:** Two repos, worked in sequence. Backend (`CordovaRiskQ-Bacnkend`) first — a hand-written migration adds `role` to `User` and a new `Incident` table, then a standard `incident.*` route/controller/service/validation layer (mirroring `sos.*`), then `sos.service.ts` dual-writes a linked `Incident` row, then `auth.service.ts` starts returning `role`. Frontend (`CordovaRiskQ-Frontend`, this repo) second — `apiPatch` added to the API helper, a new `services/incident.service.ts` replaces `mockIncidents.ts`, `report.service.ts` posts to the real endpoint, and `app/responder/index.tsx` / `[id].tsx` / `navigate.tsx` are wired to fetch/poll/mutate real data. The `__DEV__` login bypass is deleted and replaced with one real, manually-promoted responder test account.

**Tech Stack:** Backend: Express 5, Prisma 7 (Postgres/Neon), `zod`. Frontend: Expo Router v6, React Native, `expo-secure-store` (via `AuthContext`). No new dependencies in either repo.

**Spec:** `docs/superpowers/specs/2026-08-19-responder-incident-pipeline-design.md`

## Global Constraints

- **Repos:** backend work happens in `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend`; frontend work happens in `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend` (this repo). Each task states which one.
- **No new dependencies in either repo.**
- **No automated test suite in either repo.** Verification is `npx tsc --noEmit` (both repos) plus manual curl/app checks.
- **Backend error convention:** every thrown error is an `AppError(message, statusCode)`; the global `errorHandler` turns it into `{ success: false, message }`.
- **Backend layering:** `routes` → `validate` middleware → `controller` (thin, `asyncHandler`-wrapped) → `service` (business logic + Prisma). Follow `sos.*` as the template.
- **Backend response envelope:** every controller responds `{ success: true, <resource> }` (or `<resource+"s">` for a list) — never a bare object.
- **Status naming:** the backend's `Incident.status` values are exactly `"pending" | "lobby" | "on_the_way" | "arrived" | "completed" | "cancelled"` — the same literals as the frontend's existing `IncidentStatus` type (`types/responder.ts`). This is deliberate 1:1 alignment (see `app/responder/[id].tsx`'s file header comment) — never introduce a second status vocabulary (e.g. `"accepted"`) that needs translating.
- **Per [[project-shared-neon-db-drift]]:** the Prisma migration in Task 1 is hand-written SQL applied via `npx prisma db execute --file <path>` then `npx prisma migrate resolve --applied <folder>` then `npx prisma generate` — never `prisma migrate dev`, `migrate reset`, or `db push --accept-data-loss` (all destructive to the sibling Admin repo's `Admin` table given the current migration drift).
- **No fabricated data.** Where the backend doesn't (and per scope, shouldn't yet) track something — team members, a responder's live position, ETA — the frontend leaves it empty/undefined and renders accordingly, rather than inventing placeholder values. `distanceKm` and `etaMinutes` become optional on the `Incident` type for this reason.
- **Frontend styling:** no hardcoded colors/spacing — use `COLORS`/`SPACING`/`RADIUS`/`TYPOGRAPHY` from `@/theme`.
- Commit after every task.

---

### Task 1: `role` on `User` + new `Incident` table

**Repo:** `CordovaRiskQ-Bacnkend`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260819120000_add_role_and_incident/migration.sql`

**Interfaces:**
- Produces: `User.role` (`String`, default `"citizen"`), `Incident` Prisma model — Tasks 2–4's services read/write `prisma.incident.*` and `prisma.user.role`.

- [ ] **Step 1: Edit `prisma/schema.prisma`**

Current:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String?
  googleId  String?  @unique
  name      String?
  mobile    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  sosAlerts SosAlert[]
}

model SosAlert {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  latitude  Float?
  longitude Float?
  status    String   @default("active")
  createdAt DateTime @default(now())
}
```

Replace with:

```prisma
model User {
  id                 String     @id @default(uuid())
  email              String     @unique
  password           String?
  googleId           String?    @unique
  name               String?
  mobile             String?
  role               String     @default("citizen")
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt
  sosAlerts          SosAlert[]
  reportedIncidents  Incident[] @relation("ReportedIncidents")
  acceptedIncidents  Incident[] @relation("AcceptedIncidents")
}

model SosAlert {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  latitude  Float?
  longitude Float?
  status    String   @default("active")
  createdAt DateTime @default(now())
}

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
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}
```

- [ ] **Step 2: Write the migration SQL**

Create `prisma/migrations/20260819120000_add_role_and_incident/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'citizen';

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "sosAlertId" TEXT,
    "category" TEXT NOT NULL,
    "details" TEXT,
    "locationLabel" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "urgency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "acceptedByResponderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_acceptedByResponderId_fkey" FOREIGN KEY ("acceptedByResponderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 3: Apply it by hand (never `migrate dev`/`reset`/`db push`)**

From `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend`, run in order:

```bash
npx prisma db execute --file prisma/migrations/20260819120000_add_role_and_incident/migration.sql
npx prisma migrate resolve --applied 20260819120000_add_role_and_incident
npx prisma generate
```

Expected: the first command prints `Script executed successfully.`; the second prints a line confirming the migration was recorded as applied (not run); the third regenerates `src/generated/prisma` (gitignored) with `User.role`, `Incident`, and the two new relations available on the client.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add role to User and new Incident table"
```

---

### Task 2: `Incident` backend resource (validation, service, controller, routes)

**Repo:** `CordovaRiskQ-Bacnkend`

**Depends on:** Task 1

**Files:**
- Create: `src/validations/incident.validation.ts`
- Create: `src/services/incident.service.ts`
- Create: `src/controllers/incident.controller.ts`
- Create: `src/routes/incident.routes.ts`
- Modify: `src/routes/index.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`, `AppError` from `@/utils/AppError`, `asyncHandler` from `@/utils/asyncHandler`, `authenticate`/`AuthenticatedRequest` from `@/middlewares/authenticate.middleware`, `validate` from `@/middlewares/validate.middleware`.
- Produces:
  - `incidentService.create(reporterId, data)`, `.list()`, `.getById(id)`, `.accept(id, responderId)`, `.updateStatus(id, responderId, status)` — Task 3 adds a sibling `createFromSos` method to this same object.
  - `router` default-exported from `@/routes/incident.routes`, mounted at `/api`.

- [ ] **Step 1: Create `src/validations/incident.validation.ts`**

```ts
import { z } from "zod";

export const createIncidentSchema = z.object({
    category: z.enum(["flood", "fire", "medical", "road-accident", "other"]),
    details: z.string().optional(),
    locationLabel: z.string().min(1, "Location is required"),
    latitude: z.number(),
    longitude: z.number(),
});

export const updateIncidentStatusSchema = z.object({
    status: z.enum(["on_the_way", "arrived", "completed", "cancelled"]),
});
```

- [ ] **Step 2: Create `src/services/incident.service.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/AppError";

const URGENCY_BY_CATEGORY: Record<string, string> = {
    fire: "high",
    medical: "high",
    flood: "medium",
    "road-accident": "medium",
    other: "low",
};

const NON_TERMINAL_STATUSES = ["pending", "lobby", "on_the_way", "arrived"];

export const incidentService = {
    async create(
        reporterId: string,
        data: {
            category: string;
            details?: string;
            locationLabel: string;
            latitude: number;
            longitude: number;
        }
    ) {
        return prisma.incident.create({
            data: {
                source: "report",
                reporterId,
                category: data.category,
                details: data.details,
                locationLabel: data.locationLabel,
                latitude: data.latitude,
                longitude: data.longitude,
                urgency: URGENCY_BY_CATEGORY[data.category] ?? "low",
            },
        });
    },

    async list() {
        return prisma.incident.findMany({
            where: { status: { in: NON_TERMINAL_STATUSES } },
            orderBy: { createdAt: "desc" },
        });
    },

    async getById(id: string) {
        const incident = await prisma.incident.findUnique({ where: { id } });
        if (!incident) throw new AppError("Incident not found", 404);
        return incident;
    },

    async accept(id: string, responderId: string) {
        const incident = await prisma.incident.findUnique({ where: { id } });
        if (!incident) throw new AppError("Incident not found", 404);
        if (incident.status !== "pending") {
            throw new AppError("Incident already accepted", 409);
        }

        return prisma.incident.update({
            where: { id },
            data: { status: "lobby", acceptedByResponderId: responderId },
        });
    },

    async updateStatus(id: string, responderId: string, status: string) {
        const incident = await prisma.incident.findUnique({ where: { id } });
        if (!incident) throw new AppError("Incident not found", 404);
        if (incident.acceptedByResponderId !== responderId) {
            throw new AppError("Not your incident", 403);
        }

        return prisma.incident.update({
            where: { id },
            data: { status },
        });
    },
};
```

- [ ] **Step 3: Create `src/controllers/incident.controller.ts`**

```ts
import { Response } from "express";
import { AuthenticatedRequest } from "@/middlewares/authenticate.middleware";
import { incidentService } from "@/services/incident.service";
import { asyncHandler } from "@/utils/asyncHandler";

export const incidentController = {
    create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const incident = await incidentService.create(req.userId!, req.body);
        res.status(201).json({ success: true, incident });
    }),

    list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const incidents = await incidentService.list();
        res.status(200).json({ success: true, incidents });
    }),

    getById: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const incident = await incidentService.getById(req.params.id);
        res.status(200).json({ success: true, incident });
    }),

    accept: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const incident = await incidentService.accept(req.params.id, req.userId!);
        res.status(200).json({ success: true, incident });
    }),

    updateStatus: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const incident = await incidentService.updateStatus(
            req.params.id,
            req.userId!,
            req.body.status
        );
        res.status(200).json({ success: true, incident });
    }),
};
```

- [ ] **Step 4: Create `src/routes/incident.routes.ts`**

```ts
import { Router } from "express";
import { incidentController } from "@/controllers/incident.controller";
import { authenticate } from "@/middlewares/authenticate.middleware";
import { validate } from "@/middlewares/validate.middleware";
import {
    createIncidentSchema,
    updateIncidentStatusSchema,
} from "@/validations/incident.validation";

const router = Router();

router.post(
    "/incidents",
    authenticate,
    validate(createIncidentSchema),
    incidentController.create
);
router.get("/incidents", authenticate, incidentController.list);
router.get("/incidents/:id", authenticate, incidentController.getById);
router.patch("/incidents/:id/accept", authenticate, incidentController.accept);
router.patch(
    "/incidents/:id/status",
    authenticate,
    validate(updateIncidentStatusSchema),
    incidentController.updateStatus
);

export default router;
```

- [ ] **Step 5: Mount the new routes**

Current `src/routes/index.ts`:

```ts
import { Router } from "express";
import testRoutes from "@/routes/test.routes";
import authRoutes from "@/routes/auth.routes";
import userRoutes from "@/routes/user.routes";
import sosRoutes from "@/routes/sos.routes";

// Central router — mount all feature route files here.
// As you add new resources, do: router.use(entityRoutes) below.
const router = Router();

router.use(testRoutes);
router.use(authRoutes);
router.use(userRoutes);
router.use(sosRoutes);

export default router;
```

Replace with:

```ts
import { Router } from "express";
import testRoutes from "@/routes/test.routes";
import authRoutes from "@/routes/auth.routes";
import userRoutes from "@/routes/user.routes";
import sosRoutes from "@/routes/sos.routes";
import incidentRoutes from "@/routes/incident.routes";

// Central router — mount all feature route files here.
// As you add new resources, do: router.use(entityRoutes) below.
const router = Router();

router.use(testRoutes);
router.use(authRoutes);
router.use(userRoutes);
router.use(sosRoutes);
router.use(incidentRoutes);

export default router;
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/validations/incident.validation.ts src/services/incident.service.ts src/controllers/incident.controller.ts src/routes/incident.routes.ts src/routes/index.ts
git commit -m "feat: add Incident resource (create/list/get/accept/status)"
```

- [ ] **Step 8: Manual verification**

Start the dev server in a separate terminal (from `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend`): `npm run dev`

Register two test accounts and capture their tokens:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"citizen-test@example.com","password":"testpass123","name":"Citizen Test"}'

curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"responder-a@example.com","password":"testpass123","name":"Responder A"}'

curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"responder-b@example.com","password":"testpass123","name":"Responder B"}'
```

Expected: each `201` with a `token`. Save them as `$CITIZEN`, `$RESP_A`, `$RESP_B`.

Create an incident:

```bash
curl -X POST http://localhost:8000/api/incidents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CITIZEN" \
  -d '{"category":"fire","details":"Kitchen fire","locationLabel":"Barangay Poblacion, Cordova","latitude":10.2531,"longitude":123.9497}'
```

Expected: `201` — `{"success":true,"incident":{"id":"...","source":"report","category":"fire","urgency":"high","status":"pending",...}}`. Save the id as `$INC_ID`.

List it:

```bash
curl http://localhost:8000/api/incidents -H "Authorization: Bearer $RESP_A"
```

Expected: `200`, `incidents` array contains `$INC_ID`.

Accept it, then confirm a second responder can't:

```bash
curl -X PATCH http://localhost:8000/api/incidents/$INC_ID/accept -H "Authorization: Bearer $RESP_A"
curl -i -X PATCH http://localhost:8000/api/incidents/$INC_ID/accept -H "Authorization: Bearer $RESP_B"
```

Expected: first `200` with `"status":"lobby"`; second `409` — `{"success":false,"message":"Incident already accepted"}`.

Status update by a non-owning responder is rejected, then by the real owner succeeds:

```bash
curl -i -X PATCH http://localhost:8000/api/incidents/$INC_ID/status \
  -H "Content-Type: application/json" -H "Authorization: Bearer $RESP_B" \
  -d '{"status":"on_the_way"}'

curl -X PATCH http://localhost:8000/api/incidents/$INC_ID/status \
  -H "Content-Type: application/json" -H "Authorization: Bearer $RESP_A" \
  -d '{"status":"on_the_way"}'
```

Expected: first `403` — `{"success":false,"message":"Not your incident"}`; second `200` — `"status":"on_the_way"`.

---

### Task 3: SOS dual-write into `Incident`

**Repo:** `CordovaRiskQ-Bacnkend`

**Depends on:** Task 2

**Files:**
- Modify: `src/services/incident.service.ts`
- Modify: `src/services/sos.service.ts`

**Interfaces:**
- Produces: `incidentService.createFromSos(reporterId, sosAlertId, data)` — consumed only by `sosService.trigger`.

- [ ] **Step 1: Add `createFromSos` to `src/services/incident.service.ts`**

Add this method inside the `incidentService` object, after `create` (before `list`):

```ts
    async createFromSos(
        reporterId: string,
        sosAlertId: string,
        data: { latitude?: number; longitude?: number }
    ) {
        return prisma.incident.create({
            data: {
                source: "sos",
                reporterId,
                sosAlertId,
                category: "sos",
                locationLabel: "SOS Alert",
                latitude: data.latitude,
                longitude: data.longitude,
                urgency: "high",
            },
        });
    },
```

- [ ] **Step 2: Wire it into `sos.service.ts`**

Current `src/services/sos.service.ts`:

```ts
import { prisma } from "@/lib/prisma";

export const sosService = {
    async trigger(
        userId: string,
        data: { latitude?: number; longitude?: number }
    ) {
        const alert = await prisma.sosAlert.create({
            data: {
                userId,
                latitude: data.latitude,
                longitude: data.longitude,
            },
        });

        return {
            id: alert.id,
            status: alert.status,
            createdAt: alert.createdAt,
        };
    },
};
```

Replace with:

```ts
import { prisma } from "@/lib/prisma";
import { incidentService } from "@/services/incident.service";

export const sosService = {
    async trigger(
        userId: string,
        data: { latitude?: number; longitude?: number }
    ) {
        const alert = await prisma.sosAlert.create({
            data: {
                userId,
                latitude: data.latitude,
                longitude: data.longitude,
            },
        });

        // Best-effort: the SOS record itself is the primary outcome and must
        // still succeed even if this mirror write fails.
        try {
            await incidentService.createFromSos(userId, alert.id, data);
        } catch (err) {
            console.error(
                "Failed to create linked incident for SOS alert",
                alert.id,
                err
            );
        }

        return {
            id: alert.id,
            status: alert.status,
            createdAt: alert.createdAt,
        };
    },
};
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/incident.service.ts src/services/sos.service.ts
git commit -m "feat: mirror SOS alerts into the Incident table"
```

- [ ] **Step 5: Manual verification**

With the dev server running and `$RESP_A` from Task 2 still valid:

```bash
curl -X POST http://localhost:8000/api/sos \
  -H "Content-Type: application/json" -H "Authorization: Bearer $CITIZEN" \
  -d '{"latitude":10.2489,"longitude":123.9506}'

curl http://localhost:8000/api/incidents -H "Authorization: Bearer $RESP_A"
```

Expected: the `POST /api/sos` call still returns `201` with the same shape as before (`id`, `status`, `createdAt` — no change to its response). The `GET /api/incidents` list now includes an additional row with `"source":"sos"`, `"category":"sos"`, `"urgency":"high"`, `"locationLabel":"SOS Alert"`.

---

### Task 4: `role` on auth responses

**Repo:** `CordovaRiskQ-Bacnkend`

**Depends on:** Task 1

**Files:**
- Modify: `src/services/auth.service.ts`

**Interfaces:**
- Produces: `role: string` added to the `user` object in `authService.register`, `.login`, and `.loginWithGoogle`'s return values.

- [ ] **Step 1: Add `role` to all three returned `user` objects**

`src/services/auth.service.ts` currently has three occurrences of:

```ts
            user: { id: user.id, email: user.email, name: user.name },
```

Replace each occurrence with:

```ts
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
```

(One is inside `register`, one inside `login`, one inside `loginWithGoogle` — all three change identically.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/auth.service.ts
git commit -m "feat: include role in auth responses"
```

- [ ] **Step 4: Manual verification**

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"responder-a@example.com","password":"testpass123"}'
```

Expected: `200`, response's `user` object now includes `"role":"citizen"` (every account defaults to citizen — promoting one to `"responder"` happens by hand in Task 12).

---

### Task 5: `apiPatch` in `services/api.ts`

**Repo:** `CordovaRiskQ-Frontend` (this repo)

**Files:**
- Modify: `services/api.ts`

**Interfaces:**
- Produces: `apiPatch<T>(path, body, token?): Promise<T>`, exported from `@/services/api` — Task 6 imports it.

- [ ] **Step 1: Add `apiPatch`**

Append this function to `services/api.ts`, after `apiPut`:

```ts

export async function apiPatch<T>(
  path: string,
  body: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json() as Promise<T>;
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add services/api.ts
git commit -m "feat: add apiPatch to the API helper"
```

---

### Task 6: `services/incident.service.ts` (new) + make `distanceKm`/`etaMinutes` optional

**Repo:** `CordovaRiskQ-Frontend` (this repo)

**Depends on:** Task 5

**Files:**
- Create: `services/incident.service.ts`
- Modify: `types/responder.ts`
- Delete: `services/mockIncidents.ts`

**Interfaces:**
- Consumes: `apiGet`, `apiPatch` from `@/services/api` (Task 5); `haversineDistanceKm` from `@/utils/distance` (existing); `Coordinates` from `@/services/location.service` (existing).
- Produces:
  - `getIncidents(token: string, responderLocation?: Coordinates): Promise<Incident[]>`
  - `getIncidentById(token: string, id: string, responderLocation?: Coordinates): Promise<Incident | undefined>`
  - `acceptIncident(token: string, id: string): Promise<Incident>`
  - `updateIncidentStatus(token: string, id: string, status: "on_the_way" | "arrived" | "completed" | "cancelled"): Promise<Incident>`

  All exported from `@/services/incident.service`. Tasks 8–10 import these.

- [ ] **Step 1: Make `distanceKm` and `etaMinutes` optional on `Incident`**

Current `types/responder.ts`:

```ts
export interface Incident {
  id: string;
  type: string;
  location: string;
  urgency: Urgency;
  distanceKm: number;
  status: IncidentStatus;
  maxResponders: number;
  team: TeamMember[];
  etaMinutes?: number;
  responderCoords?: Coordinates;
  incidentCoords?: Coordinates;
}
```

Replace with:

```ts
export interface Incident {
  id: string;
  type: string;
  location: string;
  urgency: Urgency;
  distanceKm?: number;
  status: IncidentStatus;
  maxResponders: number;
  team: TeamMember[];
  etaMinutes?: number;
  responderCoords?: Coordinates;
  incidentCoords?: Coordinates;
}
```

(A real incident's distance is only knowable once the responder's own live location has been fetched — see `toIncident` below — so it can't be guaranteed non-null the way the old mock data always provided it.)

- [ ] **Step 2: Create `services/incident.service.ts`**

```ts
import { apiGet, apiPatch } from "./api";
import type { Coordinates } from "./location.service";
import { haversineDistanceKm } from "@/utils/distance";
import type { Incident, IncidentStatus } from "@/types/responder";

type IncidentApiRow = {
  id: string;
  category: string;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  urgency: "high" | "medium" | "low";
  status: IncidentStatus;
};

// Maps a stored category (the citizen-facing CategoryId, plus "sos" for
// SOS-sourced incidents) to the display label the responder screens already
// render via `incident.type` — keeps every existing component (IncidentCard,
// getIncidentVisual, DetailRow, etc.) unchanged.
const CATEGORY_LABELS: Record<string, string> = {
  flood: "Flood",
  fire: "Fire",
  medical: "Medical Emergency",
  "road-accident": "Road Accident",
  other: "Other",
  sos: "SOS Alert",
};

function toIncident(row: IncidentApiRow, responderLocation?: Coordinates): Incident {
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
    maxResponders: 1,
    team: [],
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

export async function acceptIncident(token: string, id: string): Promise<Incident> {
  const response = await apiPatch<{ success: true; incident: IncidentApiRow }>(
    `/api/incidents/${id}/accept`,
    {},
    token,
  );
  return toIncident(response.incident);
}

export async function updateIncidentStatus(
  token: string,
  id: string,
  status: "on_the_way" | "arrived" | "completed" | "cancelled",
): Promise<Incident> {
  const response = await apiPatch<{ success: true; incident: IncidentApiRow }>(
    `/api/incidents/${id}/status`,
    { status },
    token,
  );
  return toIncident(response.incident);
}
```

- [ ] **Step 3: Delete `services/mockIncidents.ts`**

Its two exports (`mockIncidents`, `getIncidentById`) are no longer imported anywhere after Tasks 8–10 — this step just removes the now-dead file. (Do this step now for a clean diff; `tsc` will report the dangling imports in `app/responder/*` until Tasks 8–10 land, which is expected and fixed by those tasks, not this one.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: errors in `app/responder/index.tsx`, `app/responder/[id].tsx`, `app/responder/navigate.tsx` (`Cannot find module '@/services/mockIncidents'`) — this is expected until Tasks 8–10. No errors in `services/incident.service.ts` or `types/responder.ts` themselves.

- [ ] **Step 5: Commit**

```bash
git add services/incident.service.ts types/responder.ts services/mockIncidents.ts
git commit -m "feat: add incident.service.ts, remove mockIncidents.ts"
```

---

### Task 7: Wire `report.tsx` to the real endpoint

**Repo:** `CordovaRiskQ-Frontend` (this repo)

**Depends on:** Task 5

**Files:**
- Modify: `services/report.service.ts`
- Modify: `app/(tabs)/report.tsx`

**Interfaces:**
- Consumes: `apiPost` from `@/services/api`, `useAuth()`'s `token`.
- Produces: `createReport(token, payload)` signature change — no other file calls this besides `report.tsx`.

- [ ] **Step 1: Replace `services/report.service.ts`**

Current:

```ts
// services/report.service.ts
export async function createReport(payload: Record<string, unknown>) {
  return {
    success: true,
    payload,
    ref: `RQ-${Math.floor(20000 + Math.random() * 900)}`,
  };
}

export type ReportHistoryItem = {
  id: string;
  category: string;
  location: string;
  date: string;
  ref: string;
  status: "Resolved" | "Reviewing";
  statusColor: string;
  statusBg: string;
};

const HISTORY: ReportHistoryItem[] = [];

export async function getReportHistory(): Promise<ReportHistoryItem[]> {
  return HISTORY;
}
```

Replace with:

```ts
// services/report.service.ts
import { apiPost } from "./api";
import type { CategoryId } from "@/components/report/categories";

type IncidentApiRow = { id: string };

export async function createReport(
  token: string,
  payload: {
    category: CategoryId;
    details: string;
    locationLabel: string;
    latitude: number;
    longitude: number;
  },
) {
  const response = await apiPost<{ success: true; incident: IncidentApiRow }>(
    "/api/incidents",
    payload,
    token,
  );
  return { success: true, ref: response.incident.id.slice(0, 8).toUpperCase() };
}

export type ReportHistoryItem = {
  id: string;
  category: string;
  location: string;
  date: string;
  ref: string;
  status: "Resolved" | "Reviewing";
  statusColor: string;
  statusBg: string;
};

const HISTORY: ReportHistoryItem[] = [];

export async function getReportHistory(): Promise<ReportHistoryItem[]> {
  return HISTORY;
}
```

- [ ] **Step 2: Update `app/(tabs)/report.tsx`'s submit handler**

Current (`app/(tabs)/report.tsx`):

```tsx
import { getCurrentLocation } from "@/services/location.service";
import { createReport } from "@/services/report.service";
import { COLORS, FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";
```

Replace with:

```tsx
import { useAuth } from "@/context/AuthContext";
import { getCurrentLocation } from "@/services/location.service";
import { createReport } from "@/services/report.service";
import { COLORS, FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";
```

Current:

```tsx
export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [category, setCategory] = useState<CategoryId | null>(null);
```

Replace with:

```tsx
export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const [category, setCategory] = useState<CategoryId | null>(null);
```

Current:

```tsx
  const handleSubmit = async () => {
    if (!category || details.trim().length === 0) return;

    const result = await createReport({
      category,
      location,
      latitude: coords.latitude,
      longitude: coords.longitude,
      details,
      hasPhoto: photoAttached,
    });

    router.push({
      pathname: "/report-confirmation",
      params: { ref: result.ref, category, location },
    });
  };
```

Replace with:

```tsx
  const handleSubmit = async () => {
    if (!category || details.trim().length === 0 || !token) return;

    try {
      const result = await createReport(token, {
        category,
        details,
        locationLabel: location,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      router.push({
        pathname: "/report-confirmation",
        params: { ref: result.ref, category, location },
      });
    } catch (err) {
      Alert.alert(
        "Couldn't submit report",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  };
```

Current (react-native import at the top):

```tsx
import { ScrollView, StyleSheet, Text, View } from "react-native";
```

Replace with:

```tsx
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
```

(`hasPhoto`/`photoAttached` is dropped from the payload — `Incident` has no such field per the spec, and `PhotoPicker`'s toggle was already a no-op placeholder with nothing behind it; this doesn't change its UI behavior, just stops sending a field the backend doesn't accept.)

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add services/report.service.ts "app/(tabs)/report.tsx"
git commit -m "feat: wire report submission to POST /api/incidents"
```

---

### Task 8: Wire `app/responder/index.tsx` (Dashboard)

**Repo:** `CordovaRiskQ-Frontend` (this repo)

**Depends on:** Task 6

**Files:**
- Modify: `app/responder/index.tsx`

**Interfaces:**
- Consumes: `getIncidents` from `@/services/incident.service` (Task 6), `getCurrentLocation`/`Coordinates` from `@/services/location.service` (existing), `useAuth()`'s `token`.

- [ ] **Step 1: Replace the import block**

Current:

```tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/common/Avatar";
import RippleRings from "@/components/common/RippleRings";
import { getIncidentVisual } from "@/components/responder/incidentVisual";
import UrgencyBadge from "@/components/responder/UrgencyBadge";
import { useAuth } from "@/context/AuthContext";
import { mockIncidents } from "@/services/mockIncidents";
import {
  COLORS,
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
} from "@/theme";
import { RESPONDER_COLORS } from "@/theme/responderColors";
import type { Incident } from "@/types/responder";
```

Replace with:

```tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/common/Avatar";
import RippleRings from "@/components/common/RippleRings";
import { getIncidentVisual } from "@/components/responder/incidentVisual";
import UrgencyBadge from "@/components/responder/UrgencyBadge";
import { useAuth } from "@/context/AuthContext";
import { getIncidents } from "@/services/incident.service";
import type { Coordinates } from "@/services/location.service";
import { getCurrentLocation } from "@/services/location.service";
import {
  COLORS,
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
} from "@/theme";
import { RESPONDER_COLORS } from "@/theme/responderColors";
import type { Incident } from "@/types/responder";

const POLL_INTERVAL_MS = 12000;
```

- [ ] **Step 2: Replace the component body's data source**

Current:

```tsx
export default function ResponderIncidentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();
  const [duty, setDuty] = useState<DutyStatus>("online");

  const highUrgencyCount = mockIncidents.filter(
    (i) => i.urgency === "high",
  ).length;
  const firstName = user?.name?.split(" ")[0] ?? "Responder";
```

Replace with:

```tsx
export default function ResponderIncidentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout, user, token } = useAuth();
  const [duty, setDuty] = useState<DutyStatus>("online");
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;

      let cancelled = false;
      let responderLocation: Coordinates | undefined;

      async function load() {
        if (!token) return;
        try {
          const data = await getIncidents(token, responderLocation);
          if (!cancelled) setIncidents(data);
        } catch {
          // A failed poll shouldn't clear the currently-shown list; the
          // next interval tick retries.
        }
      }

      getCurrentLocation().then((fix) => {
        responderLocation = fix;
        load();
      });

      const interval = setInterval(load, POLL_INTERVAL_MS);

      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }, [token]),
  );

  const highUrgencyCount = incidents.filter((i) => i.urgency === "high").length;
  const firstName = user?.name?.split(" ")[0] ?? "Responder";
```

- [ ] **Step 3: Replace the two `mockIncidents.length` references and the FlatList `data`**

Current:

```tsx
        <Text style={styles.headerSubtitle}>
          {mockIncidents.length} nearby incident
          {mockIncidents.length === 1 ? "" : "s"}
        </Text>
```

Replace with:

```tsx
        <Text style={styles.headerSubtitle}>
          {incidents.length} nearby incident
          {incidents.length === 1 ? "" : "s"}
        </Text>
```

Current:

```tsx
          <Text style={styles.statValue}>{mockIncidents.length}</Text>
          <Text style={styles.statLabel}>Nearby</Text>
```

Replace with:

```tsx
          <Text style={styles.statValue}>{incidents.length}</Text>
          <Text style={styles.statLabel}>Nearby</Text>
```

Current:

```tsx
        <FlatList
          data={mockIncidents}
          keyExtractor={(item) => item.id}
```

Replace with:

```tsx
        <FlatList
          data={incidents}
          keyExtractor={(item) => item.id}
```

- [ ] **Step 4: Guard the now-optional `distanceKm` in `IncidentCard`**

Current:

```tsx
          <View style={styles.cardMetaRow}>
            <UrgencyBadge urgency={incident.urgency} />
            <Text style={styles.cardDistance}>
              {incident.distanceKm} km
              {incident.etaMinutes ? ` · ${incident.etaMinutes} min` : ""}
            </Text>
          </View>
```

Replace with:

```tsx
          <View style={styles.cardMetaRow}>
            <UrgencyBadge urgency={incident.urgency} />
            <Text style={styles.cardDistance}>
              {incident.distanceKm != null
                ? `${incident.distanceKm.toFixed(1)} km`
                : "Distance unknown"}
              {incident.etaMinutes ? ` · ${incident.etaMinutes} min` : ""}
            </Text>
          </View>
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors referencing `app/responder/index.tsx` (errors may still remain in `[id].tsx`/`navigate.tsx` until Tasks 9–10).

- [ ] **Step 6: Commit**

```bash
git add app/responder/index.tsx
git commit -m "feat: wire responder Dashboard to real incidents"
```

---

### Task 9: Wire `app/responder/[id].tsx` (Incident Detail)

**Repo:** `CordovaRiskQ-Frontend` (this repo)

**Depends on:** Task 6

**Files:**
- Modify: `app/responder/[id].tsx`

**Interfaces:**
- Consumes: `getIncidentById`, `acceptIncident`, `updateIncidentStatus` from `@/services/incident.service` (Task 6); `getCurrentLocation`/`Coordinates` from `@/services/location.service`; `useAuth()`'s `token`.

- [ ] **Step 1: Replace the import block**

Current:

```tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import RippleRings from "@/components/common/RippleRings";
import IncidentMap from "@/components/responder/IncidentMap";
import { getIncidentVisual } from "@/components/responder/incidentVisual";
import RButton from "@/components/responder/RButton";
import TeamMemberRow from "@/components/responder/TeamMemberRow";
import UrgencyBadge from "@/components/responder/UrgencyBadge";
import { getIncidentById } from "@/services/mockIncidents";
import {
  COLORS,
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
} from "@/theme";
import type { Incident, IncidentStatus } from "@/types/responder";
```

Replace with:

```tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import RippleRings from "@/components/common/RippleRings";
import IncidentMap from "@/components/responder/IncidentMap";
import { getIncidentVisual } from "@/components/responder/incidentVisual";
import RButton from "@/components/responder/RButton";
import TeamMemberRow from "@/components/responder/TeamMemberRow";
import UrgencyBadge from "@/components/responder/UrgencyBadge";
import { useAuth } from "@/context/AuthContext";
import {
  acceptIncident,
  getIncidentById,
  updateIncidentStatus,
} from "@/services/incident.service";
import type { Coordinates } from "@/services/location.service";
import { getCurrentLocation } from "@/services/location.service";
import {
  COLORS,
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
} from "@/theme";
import type { Incident, IncidentStatus } from "@/types/responder";
```

- [ ] **Step 2: Replace the top of the component — fetch instead of mock lookup**

Current:

```tsx
export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const incident = useMemo(() => getIncidentById(id), [id]);

  const [phase, setPhase] = useState<Phase>("pending");
  const [tab, setTab] = useState<LobbyTab>("lobby");

  if (!incident) {
    return (
      <View style={styles.screen}>
        <Text style={styles.notFound}>Incident not found.</Text>
      </View>
    );
  }

  const handleDecline = () => {
    Alert.alert("Decline incident?", "This incident will be reassigned.", [
      { text: "Cancel", style: "cancel" },
      { text: "Decline", style: "destructive", onPress: () => router.back() },
    ]);
  };

  const handleCancelIncident = () => {
    Alert.alert("Cancel incident?", "This cannot be undone.", [
      { text: "Back", style: "cancel" },
      {
        text: "Cancel Incident",
        style: "destructive",
        onPress: () => router.back(),
      },
    ]);
  };
```

Replace with:

```tsx
export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [incident, setIncident] = useState<Incident | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("pending");
  const [tab, setTab] = useState<LobbyTab>("lobby");

  useEffect(() => {
    if (!token || !id) return;

    getIncidentById(token, id)
      .then((fetched) => {
        setIncident(fetched);
        if (fetched) setPhase(fetched.status as Phase);
      })
      .finally(() => setIsLoading(false));
  }, [token, id]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={COLORS.primary} style={styles.loading} />
      </View>
    );
  }

  if (!incident) {
    return (
      <View style={styles.screen}>
        <Text style={styles.notFound}>Incident not found.</Text>
      </View>
    );
  }

  // acceptIncident/updateIncidentStatus re-fetch the incident without a
  // responderLocation (they don't take one — see Task 6), so their response
  // always has distanceKm: undefined. Carrying forward the previously-known
  // distance avoids the "Distance" field visibly flipping to "Unknown" on
  // every status change, which would otherwise regress from what the
  // Dashboard's poll already computed.
  const handleAccept = async () => {
    if (!token) return;
    try {
      const updated = await acceptIncident(token, incident.id);
      setIncident({ ...updated, distanceKm: incident.distanceKm });
      setPhase("lobby");
    } catch (err) {
      Alert.alert(
        "Couldn't accept incident",
        err instanceof Error ? err.message : "Please try again.",
      );
      router.back();
    }
  };

  const handleHeadOut = async () => {
    if (!token) return;
    try {
      const updated = await updateIncidentStatus(token, incident.id, "on_the_way");
      setIncident({ ...updated, distanceKm: incident.distanceKm });
      setPhase("on_the_way");
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
      const updated = await updateIncidentStatus(token, incident.id, "arrived");
      setIncident({ ...updated, distanceKm: incident.distanceKm });
      setPhase("arrived");
    } catch (err) {
      Alert.alert(
        "Something went wrong",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  };

  const handleDecline = () => {
    Alert.alert("Decline incident?", "This incident will be reassigned.", [
      { text: "Cancel", style: "cancel" },
      { text: "Decline", style: "destructive", onPress: () => router.back() },
    ]);
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
```

- [ ] **Step 3: Wire the new handlers into the phase views**

Current:

```tsx
      {phase === "pending" && (
        <PendingView
          incident={incident}
          onAccept={() => setPhase("lobby")}
          onDecline={handleDecline}
        />
      )}

      {phase === "lobby" && (
        <LobbyView
          incident={incident}
          tab={tab}
          onChangeTab={setTab}
          onHeadOut={() => setPhase("on_the_way")}
        />
      )}

      {phase === "on_the_way" && (
        <OnTheWayView
          incident={incident}
          onArrive={() => setPhase("arrived")}
        />
      )}
```

Replace with:

```tsx
      {phase === "pending" && (
        <PendingView
          incident={incident}
          onAccept={handleAccept}
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
```

- [ ] **Step 4: Guard `distanceKm` in `PendingView` and `LobbyView`'s `DetailRow`**

Current:

```tsx
      <View style={styles.metaRow}>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Distance</Text>
          <Text style={styles.metaValue}>{incident.distanceKm} km</Text>
        </View>
```

Replace with:

```tsx
      <View style={styles.metaRow}>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Distance</Text>
          <Text style={styles.metaValue}>
            {incident.distanceKm != null ? `${incident.distanceKm.toFixed(1)} km` : "Unknown"}
          </Text>
        </View>
```

Current:

```tsx
          <DetailRow label="Urgency" value={incident.urgency} />
          <DetailRow label="Distance" value={`${incident.distanceKm} km`} />
```

Replace with:

```tsx
          <DetailRow label="Urgency" value={incident.urgency} />
          <DetailRow
            label="Distance"
            value={incident.distanceKm != null ? `${incident.distanceKm.toFixed(1)} km` : "Unknown"}
          />
```

- [ ] **Step 5: `OnTheWayView` fetches its own live location instead of trusting `incident.responderCoords`**

Current:

```tsx
/* ---------- Phase 3: On the Way ---------- */
function OnTheWayView({
  incident,
  onArrive,
}: {
  incident: Incident;
  onArrive: () => void;
}) {
  const router = useRouter();
  const visual = getIncidentVisual(incident.type);

  return (
    <View style={styles.mapScreen}>
      {incident.incidentCoords && incident.responderCoords ? (
        <View style={styles.mapContainer}>
          <IncidentMap
            responderCoords={incident.responderCoords}
            incidentCoords={incident.incidentCoords}
            etaMinutes={incident.etaMinutes ?? 6}
          />
        </View>
      ) : (
        <Text style={styles.notFound}>Location data unavailable.</Text>
      )}

      <View style={[styles.mapHeaderCard, { borderLeftColor: visual.color }]}>
        <View style={[styles.summaryBadge, { backgroundColor: visual.color }]}>
          <Ionicons name={visual.icon} size={18} color={COLORS.white} />
        </View>
        <View>
          <Text style={styles.summaryTitle}>{incident.type}</Text>
          <Text style={styles.summarySubtitle}>
            You&apos;re {incident.distanceKm} km away
          </Text>
        </View>
      </View>
```

Replace with:

```tsx
/* ---------- Phase 3: On the Way ---------- */
function OnTheWayView({
  incident,
  onArrive,
}: {
  incident: Incident;
  onArrive: () => void;
}) {
  const router = useRouter();
  const visual = getIncidentVisual(incident.type);
  const [responderCoords, setResponderCoords] = useState<Coordinates | undefined>();

  useEffect(() => {
    getCurrentLocation().then(setResponderCoords).catch(() => {});
  }, []);

  return (
    <View style={styles.mapScreen}>
      {incident.incidentCoords && responderCoords ? (
        <View style={styles.mapContainer}>
          <IncidentMap
            responderCoords={responderCoords}
            incidentCoords={incident.incidentCoords}
            etaMinutes={incident.etaMinutes ?? 6}
          />
        </View>
      ) : (
        <Text style={styles.notFound}>Location data unavailable.</Text>
      )}

      <View style={[styles.mapHeaderCard, { borderLeftColor: visual.color }]}>
        <View style={[styles.summaryBadge, { backgroundColor: visual.color }]}>
          <Ionicons name={visual.icon} size={18} color={COLORS.white} />
        </View>
        <View>
          <Text style={styles.summaryTitle}>{incident.type}</Text>
          <Text style={styles.summarySubtitle}>
            {incident.distanceKm != null
              ? `You're ${incident.distanceKm.toFixed(1)} km away`
              : "Distance unavailable"}
          </Text>
        </View>
      </View>
```

- [ ] **Step 6: Add a `loading` style**

Current:

```tsx
  notFound: {
    textAlign: "center",
    marginTop: SPACING.xl,
    color: COLORS.textTertiary,
  },
```

Replace with:

```tsx
  notFound: {
    textAlign: "center",
    marginTop: SPACING.xl,
    color: COLORS.textTertiary,
  },
  loading: {
    marginTop: SPACING.xl,
  },
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: no errors referencing `app/responder/[id].tsx` (errors may remain in `navigate.tsx` until Task 10).

- [ ] **Step 8: Commit**

```bash
git add "app/responder/[id].tsx"
git commit -m "feat: wire responder Incident Detail to real incidents"
```

---

### Task 10: Wire `app/responder/navigate.tsx`

**Repo:** `CordovaRiskQ-Frontend` (this repo)

**Depends on:** Task 6

**Files:**
- Modify: `app/responder/navigate.tsx`

**Interfaces:**
- Consumes: `getIncidentById` from `@/services/incident.service` (Task 6); `getCurrentLocation`/`Coordinates` from `@/services/location.service`; `useAuth()`'s `token`.

- [ ] **Step 1: Replace the import block**

Current:

```tsx
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { getIncidentVisual } from "@/components/responder/incidentVisual";
import { getIncidentById } from "@/services/mockIncidents";
import {
    COLORS,
    FONT_FAMILY,
    RADIUS,
    SHADOW_LG,
    SPACING,
    TYPOGRAPHY,
} from "@/theme";
```

Replace with:

```tsx
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { getIncidentVisual } from "@/components/responder/incidentVisual";
import { useAuth } from "@/context/AuthContext";
import { getIncidentById } from "@/services/incident.service";
import type { Coordinates } from "@/services/location.service";
import { getCurrentLocation } from "@/services/location.service";
import type { Incident } from "@/types/responder";
import {
    COLORS,
    FONT_FAMILY,
    RADIUS,
    SHADOW_LG,
    SPACING,
    TYPOGRAPHY,
} from "@/theme";
```

- [ ] **Step 2: Replace the top of the component — async fetch + own live location**

Current:

```tsx
export default function NavigateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const incident = getIncidentById(id);
  const [mapbox, setMapbox] = useState<MapboxModule | null>(null);

  useEffect(() => {
    let mounted = true;

    try {
      const module = require("@rnmapbox/maps");
      const mapboxModule = (module as any).default
        ? (module as any).default
        : module;
      const setAccessTokenFn =
        mapboxModule.setAccessToken ??
        (mapboxModule.default?.setAccessToken as unknown);

      if (typeof setAccessTokenFn === "function") {
        setAccessTokenFn(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "");
      }

      if (mounted) setMapbox(mapboxModule as unknown as MapboxModule);
    } catch (error) {
      console.warn("Failed to load Mapbox module", error);
    }

    return () => {
      mounted = false;
    };
  }, []);

  if (!incident || !incident.responderCoords || !incident.incidentCoords) {
    return (
      <View style={styles.fallbackScreen}>
        <Stack.Screen
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Text style={styles.fallbackText}>Location data unavailable.</Text>
        <Pressable onPress={() => router.back()} style={styles.fallbackClose}>
          <Text style={styles.fallbackCloseText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const visual = getIncidentVisual(incident.type);
  const { responderCoords, incidentCoords } = incident;
```

Replace with:

```tsx
export default function NavigateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [incident, setIncident] = useState<Incident | undefined>(undefined);
  const [responderCoords, setResponderCoords] = useState<Coordinates | undefined>();
  const [mapbox, setMapbox] = useState<MapboxModule | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    getIncidentById(token, id).then(setIncident);
    getCurrentLocation().then(setResponderCoords).catch(() => {});
  }, [token, id]);

  useEffect(() => {
    let mounted = true;

    try {
      const module = require("@rnmapbox/maps");
      const mapboxModule = (module as any).default
        ? (module as any).default
        : module;
      const setAccessTokenFn =
        mapboxModule.setAccessToken ??
        (mapboxModule.default?.setAccessToken as unknown);

      if (typeof setAccessTokenFn === "function") {
        setAccessTokenFn(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "");
      }

      if (mounted) setMapbox(mapboxModule as unknown as MapboxModule);
    } catch (error) {
      console.warn("Failed to load Mapbox module", error);
    }

    return () => {
      mounted = false;
    };
  }, []);

  if (!incident || !responderCoords || !incident.incidentCoords) {
    return (
      <View style={styles.fallbackScreen}>
        <Stack.Screen
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Text style={styles.fallbackText}>Location data unavailable.</Text>
        <Pressable onPress={() => router.back()} style={styles.fallbackClose}>
          <Text style={styles.fallbackCloseText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const visual = getIncidentVisual(incident.type);
  const { incidentCoords } = incident;
```

- [ ] **Step 3: Guard `distanceKm` in the stat chip**

Current:

```tsx
          <View style={styles.statChip}>
            <Ionicons
              name="navigate-outline"
              size={14}
              color={COLORS.secondary}
            />
            <Text style={styles.statChipText}>{incident.distanceKm} km</Text>
          </View>
```

Replace with:

```tsx
          <View style={styles.statChip}>
            <Ionicons
              name="navigate-outline"
              size={14}
              color={COLORS.secondary}
            />
            <Text style={styles.statChipText}>
              {incident.distanceKm != null
                ? `${incident.distanceKm.toFixed(1)} km`
                : "—"}
            </Text>
          </View>
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in the repo — this was the last file still importing the deleted `mockIncidents.ts`.

- [ ] **Step 5: Commit**

```bash
git add app/responder/navigate.tsx
git commit -m "feat: wire responder Navigate screen to real incidents"
```

---

### Task 11: Remove the `__DEV__` responder login bypass

**Repo:** `CordovaRiskQ-Frontend` (this repo)

**Depends on:** Task 4 (backend now returns real `role`)

**Files:**
- Modify: `app/(auth)/login.tsx`

**Interfaces:** none — this is a pure deletion.

- [ ] **Step 1: Remove the bypass block and its now-unused `Pressable` usage check**

Current:

```tsx
        <AuthFooter
          promptText="Don't have an account?"
          actionText="Register"
          onPress={() => router.push("/register")}
        />

        {__DEV__ && (
          <Pressable
            style={styles.devLinkWrap}
            onPress={() =>
              login("dev-responder-token", {
                id: "dev-responder",
                name: "Dev Responder",
                email: "responder@dev.local",
                role: "responder",
              })
            }
          >
            <Text style={styles.devLink}>Continue as Responder (dev)</Text>
          </Pressable>
        )}
      </ScrollView>
```

Replace with:

```tsx
        <AuthFooter
          promptText="Don't have an account?"
          actionText="Register"
          onPress={() => router.push("/register")}
        />
      </ScrollView>
```

- [ ] **Step 2: Remove the now-unused `devLinkWrap`/`devLink` styles**

Current:

```tsx
  error: {
    color: COLORS.danger,
    marginBottom: SPACING.sm,
  },
  devLinkWrap: {
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  devLink: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.gray,
    textDecorationLine: "underline",
  },
});
```

Replace with:

```tsx
  error: {
    color: COLORS.danger,
    marginBottom: SPACING.sm,
  },
});
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. (`Pressable` is still used elsewhere in this file's imports — check the top import list still includes it because other parts of the screen don't use `Pressable`... actually this file's only `Pressable` usage was the deleted block. If `npx tsc --noEmit` doesn't flag unused imports, additionally run `npx eslint app` and remove `Pressable` from the `react-native` import list at the top of the file if it's flagged as unused.)

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/login.tsx"
git commit -m "chore: remove dev-only responder login bypass"
```

---

### Task 12: Create the responder test account, and full end-to-end verification

**Repo:** both

**Depends on:** all prior tasks

**Files:** none (verification only).

- [ ] **Step 1: Promote one real account to `responder`**

With the backend dev server running, register a normal account through the running frontend app (or curl, matching Task 2's pattern) — e.g. `responder-live@example.com`.

Connect to the Neon database (the connection string is in the backend's `.env` as `DATABASE_URL` — do not paste it into any file or command history verbatim; use `psql "$DATABASE_URL"` or a DB GUI pointed at it) and run:

```sql
UPDATE "User" SET role = 'responder' WHERE email = 'responder-live@example.com';
```

- [ ] **Step 2: End-to-end citizen → responder flow**

With both dev servers running (`npm run dev` in the backend, `npx expo start` in this repo, app running on the emulator/device from earlier in this project):

1. Log in as a normal citizen account. Go to Report → pick any category → enter details → Submit. Confirm the confirmation screen shows a ref (8-character uppercase id prefix).
2. Log out, log back in as `responder-live@example.com` (real login — the dev bypass no longer exists). Confirm it routes to the responder Dashboard.
3. Within ~12 seconds (without manually reloading), confirm the just-submitted report appears in the incident list with the correct category icon/color and a "X km" distance (not "Distance unknown" — this confirms the responder's live device location was fetched and used).
4. Tap into it. Confirm Accept advances to the Team Lobby (empty "Responders Joined (0/1)" — no fake names, matching the no-team-backend scope decision).
5. Tap Head Out. Confirm it advances to the On the Way map screen and shows a live route line between two real points (the responder's current device location and the incident's).
6. Tap Arrived. Confirm the Arrived screen renders.
7. From a second browser/curl session (or `PATCH .../accept` directly per Task 2's pattern) targeting a *different* incident, confirm the whole flow still works independently — the polling on the Dashboard doesn't interfere with an in-progress detail screen.

- [ ] **Step 3: SOS path**

1. As the citizen account, trigger SOS from the Home screen.
2. As the responder account, confirm it appears in the Dashboard's incident list within one poll cycle, showing the generic alert-circle icon (no specific category color), with both its type and location text reading "SOS Alert" (per Task 3's `createFromSos`, which sets `category: "sos"` → `CATEGORY_LABELS["sos"]` and `locationLabel: "SOS Alert"`).

- [ ] **Step 4: Conflict path**

1. Have two responder accounts (create a second one, promote it too, same as Step 1) both looking at the same pending incident's detail screen.
2. Accept it from one. Then tap Accept from the other. Confirm the "Couldn't accept incident" alert appears with a message mentioning it's already been accepted, and the screen navigates back.

This is the last task — once all four verification steps pass, the plan is complete.
