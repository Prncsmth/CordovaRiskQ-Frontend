# Evacuation Center Backend Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin app's fabricated evacuation-center data (4 fake centers with made-up occupancy numbers) and the mobile app's separately-hardcoded real 16-facility list with a single real backend model, and wire the admin app to it.

**Architecture:** Two repos, worked in sequence. Backend (`CordovaRiskQ-Bacnkend`) first — a new `EvacuationCenter` Prisma model, seeded once from the mobile app's already-real, already-researched 16-facility dataset, plus a public read endpoint and an admin-gated edit endpoint (status + facilities only). Admin frontend (`cordova-riskq-admin`) second — the Evacuation Centers page and the Dashboard's evacuation widget both switch from hardcoded arrays to the real endpoint, with an edit control for status + facilities.

**Tech Stack:** Backend: Express 5, Prisma 7 (Postgres/Neon), `zod`. Admin frontend: Next.js (App Router), React. No new dependencies in either repo.

**Spec:** `docs/superpowers/specs/2026-09-16-evacuation-center-design.md`

## Global Constraints

- **Repos:** backend work happens in `C:\Users\kianr\CordovaRiskQ-Bacnkend`; admin frontend work happens in `C:\Users\kianr\cordova-riskq-admin`. Each task states which one.
- **No new dependencies in either repo.**
- **No automated test suite in either repo.** Verification is `npx tsc --noEmit` (backend) / `npm run build` (admin frontend) plus manual curl/browser checks.
- **Backend error convention:** every thrown error is an `AppError(message, statusCode)`; the global `errorHandler` turns it into `{ success: false, message }`.
- **Backend layering:** `routes` → `validate` middleware → `controller` (thin, `asyncHandler`-wrapped) → `service` (business logic + Prisma). Follow `admin.*` as the template.
- **Backend response envelope:** every controller responds `{ success: true, <resource> }` (or `<resource+"s">` for a list).
- **Backend routes are mounted without an `/api` prefix in the route file itself** — `app.ts` applies `app.use("/api", routes)` once, centrally. Route files define paths like `/evacuation-centers`, not `/api/evacuation-centers`.
- **No fabricated data.** No `capacity`/`occupants` fields anywhere — status is a manual admin-set Open/Full flag, not a computed percentage. Facilities are restricted to a fixed known set (`Water`, `Power`, `Medical Aid`, `Restrooms`), validated server-side, to avoid data drift like `"medical aid"` vs `"Medical Aid"`.
- **Seed data is not invented** — the 16 centers come from the mobile app's `services/evacuation.service.ts` (`C:\Users\kianr\CordovaRiskQ-Frontend\services\evacuation.service.ts`), already real, named, verified-coordinate facilities.
- Commit after every task.

---

### Task 1: `EvacuationCenter` data layer (schema + seed)

**Repo:** `CordovaRiskQ-Bacnkend`

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`

**Interfaces:**
- Produces: `prisma.evacuationCenter` Prisma Client model with fields `{ id, name, address, category, facilities, latitude, longitude, status, createdAt, updatedAt }`. Task 2's service layer consumes this.

- [x] **Step 1: Add the model to `prisma/schema.prisma`**

Append after the `Notification` model (end of file):

```prisma
model EvacuationCenter {
  id         String   @id
  name       String
  address    String
  category   String   // "school" | "evacuation_center"
  facilities String[] // "Water" | "Power" | "Medical Aid" | "Restrooms"
  latitude   Float
  longitude  Float
  status     String   @default("open") // "open" | "full", admin-toggled
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

- [x] **Step 2: Run the migration**

Run: `npx prisma migrate dev --name add_evacuation_center`

Expected: succeeds without an interactive prompt (the `--name` flag supplies the name up front), creates a new folder under `prisma/migrations/` (timestamp + `_add_evacuation_center`), and regenerates the Prisma Client (the schema's `generator client` block outputs to `src/generated/prisma`, so this also updates that folder — if the backend dev server is running via `npm run dev`, it will auto-reload; restart it if anything looks stale).

- [x] **Step 3: Add the seed data to `prisma/seed.ts`**

Current `prisma/seed.ts`:

```ts
import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL || "admin@cordova-riskq.local";
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_SEED_PASSWORD is required — refusing to seed a default admin password.");
  }
  const name = process.env.ADMIN_SEED_NAME || "System Administrator";

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: { email, password: hashedPassword, name, role: "super_admin" },
  });

  console.log(`Seeded admin: ${admin.email} (${admin.role})`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Replace with:

```ts
import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma";

// Real, named Cordova, Cebu facilities with verified coordinates — copied
// from the mobile app's services/evacuation.service.ts, not invented here.
const EVACUATION_CENTERS = [
  { id: "cordova-central-elementary", name: "Cordova Central Elementary School", address: "Manuel L. Quezon National Highway, Poblacion, Cordova, Cebu", category: "school", facilities: ["Water", "Medical Aid", "Restrooms", "Power"], latitude: 10.2541979, longitude: 123.9500242 },
  { id: "cordova-national-high-school", name: "Cordova National High School", address: "Victorio Pacaldo Sr. Street, Day-as, Cordova, Cebu", category: "school", facilities: ["Water", "Medical Aid", "Restrooms", "Power"], latitude: 10.2552507, longitude: 123.9441963 },
  { id: "cordova-municipal-hall", name: "Cordova Municipal Hall", address: "Martin Francisco Street, Poblacion, Cordova, Cebu", category: "evacuation_center", facilities: ["Water", "Medical Aid", "Restrooms", "Power"], latitude: 10.2523257, longitude: 123.9497836 },
  { id: "cordova-sports-complex", name: "Cordova Sports Complex", address: "Martin Francisco Street, Poblacion, Cordova, Cebu", category: "evacuation_center", facilities: ["Water", "Medical Aid", "Restrooms", "Power"], latitude: 10.2506231, longitude: 123.9497523 },
  { id: "alegria-elementary", name: "Alegria Elementary School", address: "Victor Wahing Street, Alegria, Cordova, Cebu", category: "school", facilities: ["Water", "Restrooms"], latitude: 10.2569616, longitude: 123.9604580 },
  { id: "bangbang-elementary", name: "Bangbang Elementary School", address: "Valeriano Inoc Street, Bangbang, Cordova, Cebu", category: "school", facilities: ["Water", "Restrooms"], latitude: 10.2590618, longitude: 123.9444252 },
  { id: "buagsong-elementary", name: "Buagsong Elementary School", address: "Victorio Degamo Tirol Street, Buagsong, Cordova, Cebu", category: "school", facilities: ["Water", "Medical Aid", "Restrooms"], latitude: 10.2490338, longitude: 123.9396082 },
  { id: "catarman-elementary", name: "Catarman Elementary School", address: "Filimon Nuñez Street, Catarman, Cordova, Cebu", category: "school", facilities: ["Water", "Restrooms"], latitude: 10.2481715, longitude: 123.9460734 },
  { id: "cogon-elementary", name: "Cogon Elementary School", address: "Sergio Baguio Street, Cogon, Cordova, Cebu", category: "school", facilities: ["Water", "Restrooms"], latitude: 10.2654046, longitude: 123.9511837 },
  { id: "day-as-elementary", name: "Day-as Elementary School", address: "Victorio Pacaldo Sr. Street, Day-as, Cordova, Cebu", category: "school", facilities: ["Water", "Restrooms", "Power"], latitude: 10.2543706, longitude: 123.9441505 },
  { id: "dapitan-barangay-hall", name: "Dapitan Barangay Hall", address: "Lilivian Berind Drive, Dapitan, Cordova, Cebu", category: "evacuation_center", facilities: ["Water", "Restrooms"], latitude: 10.2662002, longitude: 123.9492707 },
  { id: "gabi-elementary", name: "Gabi Elementary School", address: "Dinagat Street, Gabi, Cordova, Cebu", category: "school", facilities: ["Water", "Restrooms"], latitude: 10.2625845, longitude: 123.9614178 },
  { id: "gilutongan-elementary", name: "Gilutongan Elementary School", address: "Brgy. Gilutongan, Cordova, Cebu (Gilutongan Island)", category: "school", facilities: ["Water", "Restrooms"], latitude: 10.2072150, longitude: 123.9883661 },
  { id: "ibabao-elementary", name: "Ibabao Elementary School", address: "Cordova Bypass Road, Ibabao, Cordova, Cebu", category: "school", facilities: ["Water", "Restrooms"], latitude: 10.2717843, longitude: 123.9555953 },
  { id: "pilipog-elementary", name: "Pilipog Elementary School", address: "Manuel L. Quezon National Highway, Pilipog, Cordova, Cebu", category: "school", facilities: ["Water", "Restrooms"], latitude: 10.2662362, longitude: 123.9461385 },
  { id: "san-miguel-elementary", name: "San Miguel Elementary School", address: "Brgy. San Miguel, Cordova, Cebu", category: "school", facilities: ["Water", "Restrooms"], latitude: 10.2626036, longitude: 123.9458152 },
];

async function seedAdmin() {
  const email = process.env.ADMIN_SEED_EMAIL || "admin@cordova-riskq.local";
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_SEED_PASSWORD is required — refusing to seed a default admin password.");
  }
  const name = process.env.ADMIN_SEED_NAME || "System Administrator";

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: { email, password: hashedPassword, name, role: "super_admin" },
  });

  console.log(`Seeded admin: ${admin.email} (${admin.role})`);
}

async function seedEvacuationCenters() {
  for (const center of EVACUATION_CENTERS) {
    await prisma.evacuationCenter.upsert({
      where: { id: center.id },
      update: {
        // status intentionally excluded -- it's admin-managed at runtime and
        // must survive reseeding, not get reset back to "open" every time.
        name: center.name,
        address: center.address,
        category: center.category,
        facilities: center.facilities,
        latitude: center.latitude,
        longitude: center.longitude,
      },
      create: { ...center, status: "open" },
    });
  }

  console.log(`Seeded ${EVACUATION_CENTERS.length} evacuation centers`);
}

async function main() {
  await seedAdmin();
  await seedEvacuationCenters();
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [x] **Step 4: Run the seed and verify**

Run: `ADMIN_SEED_PASSWORD=temp-verify-only npm run db:seed`

Expected: prints `Seeded admin: ...` followed by `Seeded 16 evacuation centers`, exits 0. (Safe to run with any password value — the admin upsert's `update: {}` never overwrites an existing admin's real password; this only matters the very first time an admin row is created.)

- [x] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts prisma/migrations
git commit -m "feat: add EvacuationCenter model, seed real Cordova facilities"
```

---

### Task 2: `evacuationCenter` backend API resource

**Repo:** `CordovaRiskQ-Bacnkend`

**Depends on:** Task 1

**Files:**
- Create: `src/validations/evacuationCenter.validation.ts`
- Create: `src/services/evacuationCenter.service.ts`
- Create: `src/controllers/evacuationCenter.controller.ts`
- Create: `src/routes/evacuationCenter.routes.ts`
- Modify: `src/routes/index.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`, `AppError` from `@/utils/AppError`, `asyncHandler` from `@/utils/asyncHandler`, `authenticate`/`AuthenticatedRequest` from `@/middlewares/authenticate.middleware`, `requireAdmin` from `@/middlewares/requireAdmin.middleware`, `validate` from `@/middlewares/validate.middleware`.
- Produces: `evacuationCenterService.list()`, `evacuationCenterService.update(id, data)`; `router` default-exported from `@/routes/evacuationCenter.routes`, mounted at `/api`. The response shape `{ id, name, address, category, facilities, latitude, longitude, status, createdAt, updatedAt }` is what Task 3's `useEvacuationCenters` hook parses.

- [x] **Step 1: Create `src/validations/evacuationCenter.validation.ts`**

```ts
import { z } from "zod";

export const KNOWN_FACILITIES = ["Water", "Power", "Medical Aid", "Restrooms"] as const;

export const updateEvacuationCenterSchema = z.object({
    status: z.enum(["open", "full"]).optional(),
    facilities: z.array(z.enum(KNOWN_FACILITIES)).optional(),
});
```

- [x] **Step 2: Create `src/services/evacuationCenter.service.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/AppError";

export const evacuationCenterService = {
    async list() {
        return prisma.evacuationCenter.findMany({
            orderBy: { name: "asc" },
        });
    },

    async update(id: string, data: { status?: string; facilities?: string[] }) {
        const center = await prisma.evacuationCenter.findUnique({ where: { id } });
        if (!center) throw new AppError("Evacuation center not found", 404);

        return prisma.evacuationCenter.update({
            where: { id },
            data,
        });
    },
};
```

- [x] **Step 3: Create `src/controllers/evacuationCenter.controller.ts`**

```ts
import { Response } from "express";
import { AuthenticatedRequest } from "@/middlewares/authenticate.middleware";
import { evacuationCenterService } from "@/services/evacuationCenter.service";
import { asyncHandler } from "@/utils/asyncHandler";

export const evacuationCenterController = {
    list: asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
        const centers = await evacuationCenterService.list();
        res.status(200).json({ success: true, centers });
    }),

    update: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const center = await evacuationCenterService.update(req.params.id as string, req.body);
        res.status(200).json({ success: true, center });
    }),
};
```

- [x] **Step 4: Create `src/routes/evacuationCenter.routes.ts`**

```ts
import { Router } from "express";
import { evacuationCenterController } from "@/controllers/evacuationCenter.controller";
import { authenticate } from "@/middlewares/authenticate.middleware";
import { requireAdmin } from "@/middlewares/requireAdmin.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { updateEvacuationCenterSchema } from "@/validations/evacuationCenter.validation";

const router = Router();

router.get("/evacuation-centers", authenticate, evacuationCenterController.list);
router.patch(
    "/admin/evacuation-centers/:id",
    authenticate,
    requireAdmin,
    validate(updateEvacuationCenterSchema),
    evacuationCenterController.update
);

export default router;
```

- [x] **Step 5: Mount the new routes in `src/routes/index.ts`**

Current:

```ts
import { Router } from "express";
import testRoutes from "@/routes/test.routes";
import authRoutes from "@/routes/auth.routes";
import userRoutes from "@/routes/user.routes";
import sosRoutes from "@/routes/sos.routes";
import incidentRoutes from "@/routes/incident.routes";
import adminRoutes from "@/routes/admin.routes";
import adminAuthRoutes from "@/routes/admin-auth.routes";
import tideRoutes from "@/routes/tide.routes";
import announcementRoutes from "@/routes/announcement.routes";
import notificationRoutes from "@/routes/notification.routes";
import historyRoutes from "@/routes/history.routes";

// Central router — mount all feature route files here.
// As you add new resources, do: router.use(entityRoutes) below.
const router = Router();

router.use(testRoutes);
router.use(authRoutes);
router.use(userRoutes);
router.use(sosRoutes);
router.use(incidentRoutes);
router.use(adminRoutes);
router.use(adminAuthRoutes);
router.use(tideRoutes);
router.use(announcementRoutes);
router.use(notificationRoutes);
router.use(historyRoutes);

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
import adminRoutes from "@/routes/admin.routes";
import adminAuthRoutes from "@/routes/admin-auth.routes";
import tideRoutes from "@/routes/tide.routes";
import announcementRoutes from "@/routes/announcement.routes";
import notificationRoutes from "@/routes/notification.routes";
import historyRoutes from "@/routes/history.routes";
import evacuationCenterRoutes from "@/routes/evacuationCenter.routes";

// Central router — mount all feature route files here.
// As you add new resources, do: router.use(entityRoutes) below.
const router = Router();

router.use(testRoutes);
router.use(authRoutes);
router.use(userRoutes);
router.use(sosRoutes);
router.use(incidentRoutes);
router.use(adminRoutes);
router.use(adminAuthRoutes);
router.use(tideRoutes);
router.use(announcementRoutes);
router.use(notificationRoutes);
router.use(historyRoutes);
router.use(evacuationCenterRoutes);

export default router;
```

- [x] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 7: Commit**

```bash
git add src/validations/evacuationCenter.validation.ts src/services/evacuationCenter.service.ts src/controllers/evacuationCenter.controller.ts src/routes/evacuationCenter.routes.ts src/routes/index.ts
git commit -m "feat: add evacuation center resource (list + admin status/facilities edit)"
```

- [x] **Step 8: Manual verification**

Start the dev server in a separate terminal (from `C:\Users\kianr\CordovaRiskQ-Bacnkend`): `npm run dev`

Register two test accounts and capture their tokens (or reuse ones from prior work in this project — any citizen token and any admin token work):

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"evac-citizen-test@example.com","password":"testpass123","name":"Evac Citizen Test"}'
```

Expected: `201` with a `token`. Save it as `$CITIZEN`.

Use an existing admin token (from any prior admin login in this project) as `$ADMIN`.

List centers with and without a token:

```bash
curl -i http://localhost:8000/api/evacuation-centers
curl -i http://localhost:8000/api/evacuation-centers -H "Authorization: Bearer $CITIZEN"
```

Expected: first `401`; second `200` with a `centers` array of 16 real-named facilities (e.g. `"Cordova Central Elementary School"`), each `status: "open"`.

Try updating as a non-admin, then as admin:

```bash
curl -i -X PATCH http://localhost:8000/api/admin/evacuation-centers/gabi-elementary \
  -H "Content-Type: application/json" -H "Authorization: Bearer $CITIZEN" \
  -d '{"status":"full"}'

curl -X PATCH http://localhost:8000/api/admin/evacuation-centers/gabi-elementary \
  -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN" \
  -d '{"status":"full"}'

curl -X PATCH http://localhost:8000/api/admin/evacuation-centers/gabi-elementary \
  -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN" \
  -d '{"facilities":["Water","Power"]}'

curl -i -X PATCH http://localhost:8000/api/admin/evacuation-centers/gabi-elementary \
  -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN" \
  -d '{"facilities":["Water","Wifi"]}'
```

Expected: first `403` (`"Admin access required"`); second `200` with `"status":"full"`; third `200` with `"facilities":["Water","Power"]`; fourth `400` (`"Wifi"` isn't in the known set, rejected by the `zod` schema).

---

### Task 3: Admin frontend — types + `useEvacuationCenters` hook

**Repo:** `cordova-riskq-admin`

**Depends on:** Task 2

**Files:**
- Modify: `src/types/evacuation-center.ts`
- Create: `src/hooks/useEvacuationCenters.ts`

**Interfaces:**
- Consumes: `apiFetch` from `@/lib/api`, `useAuth` from `@/hooks/useAuth` (both existing).
- Produces: `EvacuationCenter`, `EvacuationCenterCategory`, `EvacuationCenterStatus` types and `KNOWN_FACILITIES` from `@/types/evacuation-center`. `useEvacuationCenters()` returns `{ centers: EvacuationCenter[], loading: boolean, error: string | null, actionError: string | null, updateCenter(id: string, data: { status?: EvacuationCenterStatus; facilities?: string[] }): Promise<void> }`. Tasks 4 and 5 both consume these.

- [x] **Step 1: Replace `src/types/evacuation-center.ts`**

Current:

```ts
export interface EvacuationCenter {
  id: string;
  name: string;
  locationName: string;
  occupants: number;
  capacity: number;
  latitude: number;
  longitude: number;
}
```

Replace with:

```ts
export type EvacuationCenterCategory = "school" | "evacuation_center";
export type EvacuationCenterStatus = "open" | "full";

export const KNOWN_FACILITIES = ["Water", "Power", "Medical Aid", "Restrooms"] as const;

export interface EvacuationCenter {
  id: string;
  name: string;
  address: string;
  category: EvacuationCenterCategory;
  facilities: string[];
  latitude: number;
  longitude: number;
  status: EvacuationCenterStatus;
}
```

- [x] **Step 2: Create `src/hooks/useEvacuationCenters.ts`**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { EvacuationCenter, EvacuationCenterStatus } from "@/types/evacuation-center";

export function useEvacuationCenters() {
  const { token } = useAuth();
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setError(null);

    apiFetch<{ success: true; centers: EvacuationCenter[] }>("/evacuation-centers", { token })
      .then((response) => {
        if (!cancelled) setCenters(response.centers);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load evacuation centers.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const updateCenter = useCallback(
    async (id: string, data: { status?: EvacuationCenterStatus; facilities?: string[] }) => {
      if (!token) return;

      setActionError(null);

      try {
        const response = await apiFetch<{ success: true; center: EvacuationCenter }>(
          `/admin/evacuation-centers/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(data),
            token,
          }
        );

        setCenters((prev) => prev.map((c) => (c.id === id ? response.center : c)));
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to update evacuation center.");
        throw err;
      }
    },
    [token]
  );

  return { centers, loading, error, actionError, updateCenter };
}
```

- [x] **Step 3: Verify**

Run: `npm run build`
Expected: build **fails** on `EvacuationCenterList.tsx` and `EvacuationCenterCapacity.tsx` — both still reference the old `occupants`/`capacity`/`locationName` fields that no longer exist on `EvacuationCenter`. This is expected until Tasks 4 and 5; confirm the errors are only in those two files.

- [x] **Step 4: Commit**

```bash
git add src/types/evacuation-center.ts src/hooks/useEvacuationCenters.ts
git commit -m "feat: add real EvacuationCenter type and useEvacuationCenters hook"
```

---

### Task 4: Admin frontend — wire the Evacuation Centers page

**Repo:** `cordova-riskq-admin`

**Depends on:** Task 3

**Files:**
- Modify: `src/components/evacuation-centers/EvacuationCenterList.tsx`
- Modify: `src/app/(dashboard)/evacuation-centers/page.tsx`

**Interfaces:**
- Consumes: `useEvacuationCenters` from `@/hooks/useEvacuationCenters`, `EvacuationCenter`/`EvacuationCenterStatus`/`KNOWN_FACILITIES` from `@/types/evacuation-center`, `Badge`/`Button`/`EmptyState` from `@/components/ui/*` (all Task 3 / existing).

- [x] **Step 1: Replace `src/components/evacuation-centers/EvacuationCenterList.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { KNOWN_FACILITIES } from "@/types/evacuation-center";
import type { EvacuationCenter, EvacuationCenterStatus } from "@/types/evacuation-center";

const MiniMap = dynamic(() => import("@/components/map/MiniMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-muted">
      Loading map...
    </div>
  ),
});

const statusFilters = ["All", "Open", "Full"] as const;

function EditableFacilities({
  center,
  pending,
  onSave,
}: {
  center: EvacuationCenter;
  pending: boolean;
  onSave: (facilities: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>(center.facilities);

  if (!editing) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {center.facilities.map((f) => (
          <span key={f} className="rounded-full bg-background px-2.5 py-1 text-xs text-muted">
            {f}
          </span>
        ))}
        <button
          type="button"
          onClick={() => {
            setSelected(center.facilities);
            setEditing(true);
          }}
          className="text-xs font-medium text-primary hover:text-primary-dark"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-3">
        {KNOWN_FACILITIES.map((facility) => (
          <label key={facility} className="flex items-center gap-1.5 text-xs text-foreground">
            <input
              type="checkbox"
              checked={selected.includes(facility)}
              onChange={(e) =>
                setSelected((prev) =>
                  e.target.checked ? [...prev, facility] : prev.filter((f) => f !== facility)
                )
              }
            />
            {facility}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => {
            onSave(selected);
            setEditing(false);
          }}
        >
          Save
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function EvacuationCenterList({
  centers,
  loading,
  error,
  actionError,
  updateCenter,
}: {
  centers: EvacuationCenter[];
  loading: boolean;
  error: string | null;
  actionError: string | null;
  updateCenter: (id: string, data: { status?: EvacuationCenterStatus; facilities?: string[] }) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("All");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return centers.filter((center) => {
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Open" ? center.status === "open" : center.status === "full");

      const q = query.trim().toLowerCase();
      const matchesQuery =
        q.length === 0 ||
        center.name.toLowerCase().includes(q) ||
        center.address.toLowerCase().includes(q);

      return matchesStatus && matchesQuery;
    });
  }, [centers, query, statusFilter]);

  async function handleToggleStatus(center: EvacuationCenter) {
    setPendingId(center.id);
    try {
      await updateCenter(center.id, { status: center.status === "open" ? "full" : "open" });
    } catch {
      // surfaced via actionError, rendered below
    } finally {
      setPendingId(null);
    }
  }

  async function handleSaveFacilities(center: EvacuationCenter, facilities: string[]) {
    setPendingId(center.id);
    try {
      await updateCenter(center.id, { facilities });
    } catch {
      // surfaced via actionError, rendered below
    } finally {
      setPendingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted shadow-sm">
        Loading evacuation centers…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-sm text-red-700 shadow-sm">
        {error}
      </div>
    );
  }

  if (centers.length === 0) {
    return (
      <EmptyState
        title="No evacuation centers yet"
        description="Seeded evacuation centers will appear here."
      />
    );
  }

  return (
    <div className="space-y-5">
      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search centers or address..."
            className="w-full rounded-xl border border-border bg-background/60 py-2 pl-9 pr-3 text-sm text-foreground shadow-xs outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {statusFilters.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                statusFilter === status
                  ? "bg-primary hover:bg-primary-dark text-white shadow-sm"
                  : "bg-background text-muted hover:bg-primary-light/40 hover:text-primary"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-10 text-center">
          <p className="font-semibold text-foreground">No centers match your filters</p>
          <p className="mt-1 text-sm text-muted">Try a different search term or status.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((center) => (
            <div
              key={center.id}
              className="overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-xs"
            >
              <div className="h-40 w-full">
                <MiniMap latitude={center.latitude} longitude={center.longitude} label={center.name} />
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{center.name}</p>
                    <p className="text-sm text-muted">{center.address}</p>
                  </div>
                  <Badge variant={center.status === "full" ? "danger" : "success"} solid={center.status === "full"}>
                    {center.status === "full" ? "Full" : "Open"}
                  </Badge>
                </div>

                <EditableFacilities
                  center={center}
                  pending={pendingId === center.id}
                  onSave={(facilities) => handleSaveFacilities(center, facilities)}
                />

                <Button
                  variant="outline"
                  disabled={pendingId === center.id}
                  onClick={() => handleToggleStatus(center)}
                  className="mt-4 w-full"
                >
                  {center.status === "open" ? "Mark as Full" : "Mark as Open"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [x] **Step 2: Replace `src/app/(dashboard)/evacuation-centers/page.tsx`**

Current:

```tsx
import { Building2, Users, BedDouble, Gauge } from "lucide-react";
import Card from "@/components/ui/Card";
import EvacuationCenterList from "@/components/evacuation-centers/EvacuationCenterList";

const stats = [
  { label: "Total Centers", value: "4", icon: Building2, color: "text-primary", bg: "bg-primary-light" },
  { label: "Total Capacity", value: "530", icon: BedDouble, color: "text-info", bg: "bg-info-light" },
  { label: "Currently Housed", value: "262", icon: Users, color: "text-success", bg: "bg-success-light" },
  { label: "Overall Occupancy", value: "49%", icon: Gauge, color: "text-warning", bg: "bg-warning-light" },
];

export default function EvacuationCentersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Evacuation Centers</h1>
        <p className="text-sm text-muted">
          Monitor occupancy and capacity across evacuation centers.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="flex items-center gap-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${stat.bg} ${stat.color}`}>
                <Icon size={19} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <EvacuationCenterList />
    </div>
  );
}
```

Replace with:

```tsx
"use client";

import { Building2, CheckCircle2, XCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import EvacuationCenterList from "@/components/evacuation-centers/EvacuationCenterList";
import { useEvacuationCenters } from "@/hooks/useEvacuationCenters";

export default function EvacuationCentersPage() {
  const { centers, loading, error, actionError, updateCenter } = useEvacuationCenters();

  const open = centers.filter((c) => c.status === "open").length;
  const full = centers.length - open;

  const stats = [
    { label: "Total Centers", value: centers.length, icon: Building2, color: "text-primary", bg: "bg-primary-light" },
    { label: "Open", value: open, icon: CheckCircle2, color: "text-success", bg: "bg-success-light" },
    { label: "Full", value: full, icon: XCircle, color: "text-danger", bg: "bg-danger-light" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Evacuation Centers</h1>
        <p className="text-sm text-muted">
          Monitor status and utilities across evacuation centers.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="flex items-center gap-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${stat.bg} ${stat.color}`}>
                <Icon size={19} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <EvacuationCenterList
        centers={centers}
        loading={loading}
        error={error}
        actionError={actionError}
        updateCenter={updateCenter}
      />
    </div>
  );
}
```

- [x] **Step 3: Verify**

Run: `npm run build`
Expected: build still fails, now only on `EvacuationCenterCapacity.tsx` (Task 5 fixes it).

- [x] **Step 4: Commit**

```bash
git add "src/components/evacuation-centers/EvacuationCenterList.tsx" "src/app/(dashboard)/evacuation-centers/page.tsx"
git commit -m "feat: wire Evacuation Centers page to real data with status/facilities editing"
```

---

### Task 5: Admin frontend — wire the Dashboard evacuation widget

**Repo:** `cordova-riskq-admin`

**Depends on:** Task 3

**Files:**
- Create: `src/components/dashboard/EvacuationCenterStatus.tsx`
- Delete: `src/components/dashboard/EvacuationCenterCapacity.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `useEvacuationCenters` from `@/hooks/useEvacuationCenters` (Task 3).

- [x] **Step 1: Create `src/components/dashboard/EvacuationCenterStatus.tsx`**

```tsx
"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { useEvacuationCenters } from "@/hooks/useEvacuationCenters";

export default function EvacuationCenterStatus() {
  const { centers, loading, error } = useEvacuationCenters();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/70 bg-surface p-6 text-center text-sm text-muted shadow-xs">
        Loading evacuation centers…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 shadow-xs">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-surface p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-info-light text-info">
            <Building2 size={15} />
          </span>
          <h2 className="text-lg font-semibold text-foreground">Evacuation Center Status</h2>
        </div>
        <Link href="/evacuation-centers" className="text-sm font-medium text-primary hover:text-primary-dark">
          View All
        </Link>
      </div>

      <div className="mt-5 space-y-1">
        {centers.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted">No evacuation centers yet.</p>
        ) : (
          centers.map((center) => (
            <div
              key={center.id}
              className="flex items-center justify-between rounded-xl p-2.5 text-sm transition-colors hover:bg-background/60"
            >
              <span className="font-medium text-foreground">{center.name}</span>
              <Badge variant={center.status === "full" ? "danger" : "success"} solid={center.status === "full"}>
                {center.status === "full" ? "Full" : "Open"}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [x] **Step 2: Delete the old component**

```bash
git rm src/components/dashboard/EvacuationCenterCapacity.tsx
```

- [x] **Step 3: Update the import in `src/app/(dashboard)/dashboard/page.tsx`**

Current (relevant lines):

```tsx
import EvacuationCenterCapacity from "@/components/dashboard/EvacuationCenterCapacity";
```

and:

```tsx
        <EvacuationCenterCapacity />
```

Replace with:

```tsx
import EvacuationCenterStatus from "@/components/dashboard/EvacuationCenterStatus";
```

and:

```tsx
        <EvacuationCenterStatus />
```

- [x] **Step 4: Verify**

Run: `npm run build`
Expected: build succeeds with no errors anywhere in the repo — this was the last file depending on the old shape.

- [x] **Step 5: Commit**

```bash
git add src/components/dashboard/EvacuationCenterStatus.tsx "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: wire Dashboard evacuation widget to real data"
```

---

### Task 6: Full end-to-end verification

**Repo:** both

**Depends on:** all prior tasks

**Files:** none (verification only).

- [x] **Step 1: Browser walkthrough**

With both dev servers running (`npm run dev` in the backend on port 8000, `npm run dev` in the admin app on port 3000), log in to the admin app and:

1. Navigate to Evacuation Centers. Confirm all 16 real-named facilities appear (e.g. "Cordova Central Elementary School", "Cordova Municipal Hall") with their real addresses — not "Gabi Evacuation Center — 120/200 occupants".
2. Confirm the top stat cards read "Total Centers: 16", "Open: 16", "Full: 0" (before any edits).
3. Click "Mark as Full" on one center. Confirm its badge flips to "Full" without a page reload, and the "Open"/"Full" stat cards update.
4. Click "Edit" under that center's facility tags, uncheck one and check a different one, click "Save". Confirm the tag list updates immediately.
5. Refresh the page. Confirm both the status and facilities changes persisted (re-fetched from the real backend, not stale local state).
6. Use the status/search filters — filter to "Full" and confirm only the one edited center shows; search by address text and confirm it matches.
7. Navigate to the Dashboard. Confirm the "Evacuation Center Status" widget shows the same real centers with the same Open/Full badges (including the one just marked Full).

This is the last task — once all steps pass, the plan is complete.
