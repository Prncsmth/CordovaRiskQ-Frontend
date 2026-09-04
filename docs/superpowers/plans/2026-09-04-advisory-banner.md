# Advisory Banner (Announcements) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Home screen's hardcoded `MOCK_ADVISORY` banner with real, admin-published announcements: admins publish through the already-built (but currently mocked) `cordova-riskq-admin` Announcements page, a new backend `Announcement` model/endpoints serve them, and the mobile Home screen shows the latest one matching the citizen's audience.

**Architecture:** Backend gains an `Announcement` table plus a public read endpoint (filtered by audience/barangay) and three admin-only CRUD endpoints (create, list, delete — no edit/draft state). The admin dashboard's existing mocked Announcements UI is wired to those endpoints via a new `useAnnouncements` hook, following the exact pattern of the existing `useUsers` hook. The mobile Home screen fetches the active announcement using the barangay it already derives from GPS, and renders `AdvisoryBanner` only when one exists.

**Tech Stack:** Backend: Express 5, Prisma/Postgres, Zod, TypeScript (ESM, `@/` path aliases). Admin: Next.js (App Router), TypeScript, Tailwind, existing `apiFetch`/`useAuth` helpers. Mobile: Expo Router, React Native, existing `services/api.ts` (`apiGet`) helper.

**Spec:** `docs/superpowers/specs/2026-09-04-advisory-banner-design.md`

## Global Constraints

- `GET /api/announcements/active` is unauthenticated (public safety content) — no `authenticate` middleware. It always excludes `audience: "Responders Only"` and never throws for "nothing matches" — it returns `{ success: true, announcement: null }`.
- The three `/admin/announcements*` endpoints use `authenticate` + `requireAdmin` (checks `User.role === "admin"` via the regular `User`/`/auth/login` system) — **not** the separate, unused `Admin` model / `admin-auth.*` system.
- There is no `published` boolean and no draft/edit state: `POST` = publish immediately, `DELETE` = retract. No `PATCH` endpoint.
- `barangayName` is required (non-empty) when `audience === "Specific Barangay"`, and forbidden (must be omitted) for any other audience — enforced by a Zod schema on the backend.
- Barangay matching is case-insensitive and only ever uses the GPS-derived nearest barangay already computed on the mobile Home screen (`getNearestBarangay`) — no new stored per-user barangay field.
- Cordova's 13 barangay names (`Alegria, Bangbang, Buagsong, Catarman, Cogon, Dapitan, Day-as, Gabi, Gilutongan, Ibabao, Pilipog, Poblacion, San Miguel`) are duplicated as a small local constant in the admin repo (no shared package between repos today — same precedent as the tide-level-backend plan duplicating `CORDOVA_CENTER`).
- `AdvisoryBanner`'s card/icon styling is unchanged for every priority (still the existing warning-colored treatment) — only its meta-row text changes (`"ANNOUNCEMENT · URGENT"` / `"ANNOUNCEMENT · NOTICE"`).
- None of the three repos has an automated test framework (confirmed: no `jest`/`vitest`/`mocha` dependency, no `*.test.ts(x)`/`*.spec.ts(x)` file in any of them). Every task is verified via `tsc --noEmit` / `eslint` plus a concrete runtime check (curl or running the app) — there is no "write a failing test" step in this plan.

---

## File Structure

**Backend (`C:\Users\kianr\CordovaRiskQ-Bacnkend`):**
- `prisma/schema.prisma` — modified: add `Announcement` model + `User.announcements` back-relation.
- `src/validations/announcement.validation.ts` — new: Zod schema for `POST` body.
- `src/services/announcement.service.ts` — new: `getActive`, `listForAdmin`, `create`, `remove`.
- `src/controllers/announcement.controller.ts` — new: thin HTTP handlers.
- `src/routes/announcement.routes.ts` — new: route registration.
- `src/routes/index.ts` — modified: mount the new route.

**Admin (`C:\Users\kianr\cordova-riskq-admin`):**
- `src/constants/barangays.ts` — new: `CORDOVA_BARANGAY_NAMES`.
- `src/types/announcement.ts` — modified: add `barangayName`, drop `published`.
- `src/hooks/useAnnouncements.ts` — new: list/create/delete against the backend.
- `src/components/announcements/AnnouncementForm.tsx` — modified: add a barangay picker shown only for "Specific Barangay".
- `src/components/announcements/AnnouncementTable.tsx` — modified: real data (via props) instead of a local mock array, plus a delete action.
- `src/app/(dashboard)/announcements/page.tsx` — modified: wire `useAnnouncements` into the form/table.

**Mobile (`C:\Users\kianr\CordovaRiskQ-Frontend`, this repo):**
- `services/advisory.service.ts` — new: `getActiveAnnouncement(barangayName?)`.
- `components/home/AdvisoryBanner.tsx` — modified: `signalLabel`/`sample` props replaced with `priority`.
- `app/(tabs)/home.tsx` — modified: fetch the active announcement, remove `MOCK_ADVISORY`.

---

### Task 1: Backend — `Announcement` Prisma model + migration

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Bacnkend\prisma\schema.prisma`

**Interfaces:**
- Produces: `prisma.announcement` model with fields `id: String`, `title: String`, `content: String`, `priority: String`, `audience: String`, `barangayName: String | null`, `createdByUserId: String`, `createdAt: DateTime`, `updatedAt: DateTime`. Consumed by Task 3 (`announcement.service.ts`) via the generated Prisma client.

- [ ] **Step 1: Add the `User` back-relation**

In `prisma/schema.prisma`, in the existing `User` model, add a line after `acceptedIncidents`:

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
  announcements      Announcement[]
}
```

- [ ] **Step 2: Add the `Announcement` model**

Append after the existing `TideStatus` model:

```prisma
model Announcement {
  id              String   @id @default(uuid())
  title           String
  content         String
  priority        String   // "Normal" | "Urgent"
  audience        String   // "All Users" | "Responders Only" | "Specific Barangay"
  barangayName    String?  // set only when audience is "Specific Barangay"
  createdByUserId String
  createdBy       User     @relation(fields: [createdByUserId], references: [id])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

- [ ] **Step 3: Run the migration**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npm run db:migrate -- --name add_announcement
```

Expected: Prisma prints a new migration file under `prisma/migrations/`, applies it, regenerates the client, and ends with `Your database is now in sync with your schema.`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Announcement model"
```

---

### Task 2: Backend — announcement validation schema

**Files:**
- Create: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\validations\announcement.validation.ts`

**Interfaces:**
- Produces: `export const createAnnouncementSchema` (a Zod schema), consumed by Task 4's route via the existing `validate` middleware (`@/middlewares/validate.middleware`).

- [ ] **Step 1: Write the schema**

```ts
// src/validations/announcement.validation.ts
import { z } from "zod";

export const createAnnouncementSchema = z
    .object({
        title: z.string().min(1, "Title is required"),
        content: z.string().min(1, "Content is required"),
        priority: z.enum(["Normal", "Urgent"]),
        audience: z.enum(["All Users", "Responders Only", "Specific Barangay"]),
        barangayName: z.string().min(1).optional(),
    })
    .superRefine((data, ctx) => {
        if (data.audience === "Specific Barangay" && !data.barangayName) {
            ctx.addIssue({
                code: "custom",
                message: "barangayName is required when audience is Specific Barangay",
                path: ["barangayName"],
            });
        }
        if (data.audience !== "Specific Barangay" && data.barangayName) {
            ctx.addIssue({
                code: "custom",
                message: "barangayName must be omitted unless audience is Specific Barangay",
                path: ["barangayName"],
            });
        }
    });
```

- [ ] **Step 2: Typecheck**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/validations/announcement.validation.ts
git commit -m "feat: add announcement validation schema"
```

---

### Task 3: Backend — announcement service

**Files:**
- Create: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\services\announcement.service.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma` (existing); `AppError` from `@/utils/AppError` (existing); `Announcement` Prisma model (Task 1).
- Produces: `export const announcementService = { getActive, listForAdmin, create, remove }` where:
  - `getActive(barangayName?: string): Promise<Announcement | null>` — consumed by Task 4's controller for the public endpoint.
  - `listForAdmin(): Promise<Announcement[]>` — consumed by Task 4's controller for the admin list endpoint.
  - `create(createdByUserId: string, data: { title: string; content: string; priority: string; audience: string; barangayName?: string }): Promise<Announcement>` — consumed by Task 4's controller for the create endpoint.
  - `remove(id: string): Promise<void>` — throws `AppError(404, "Announcement not found")` if the id doesn't exist. Consumed by Task 4's controller for the delete endpoint.

- [ ] **Step 1: Write the service**

```ts
// src/services/announcement.service.ts
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/AppError";

export const announcementService = {
    async getActive(barangayName?: string) {
        const conditions: Array<Record<string, unknown>> = [{ audience: "All Users" }];

        if (barangayName) {
            conditions.push({
                audience: "Specific Barangay",
                barangayName: { equals: barangayName, mode: "insensitive" },
            });
        }

        return prisma.announcement.findFirst({
            where: { OR: conditions },
            orderBy: { createdAt: "desc" },
        });
    },

    async listForAdmin() {
        return prisma.announcement.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
        });
    },

    async create(
        createdByUserId: string,
        data: {
            title: string;
            content: string;
            priority: string;
            audience: string;
            barangayName?: string;
        }
    ) {
        return prisma.announcement.create({
            data: {
                title: data.title,
                content: data.content,
                priority: data.priority,
                audience: data.audience,
                barangayName: data.barangayName ?? null,
                createdByUserId,
            },
        });
    },

    async remove(id: string) {
        const existing = await prisma.announcement.findUnique({ where: { id } });
        if (!existing) throw new AppError("Announcement not found", 404);
        await prisma.announcement.delete({ where: { id } });
    },
};
```

- [ ] **Step 2: Typecheck**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/announcement.service.ts
git commit -m "feat: add announcement service"
```

---

### Task 4: Backend — announcement endpoints

**Files:**
- Create: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\controllers\announcement.controller.ts`
- Create: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\routes\announcement.routes.ts`
- Modify: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\routes\index.ts`

**Interfaces:**
- Consumes: `announcementService` (Task 3); `createAnnouncementSchema` (Task 2); `authenticate`/`AuthenticatedRequest` from `@/middlewares/authenticate.middleware` (existing); `requireAdmin` from `@/middlewares/requireAdmin.middleware` (existing); `validate` from `@/middlewares/validate.middleware` (existing); `asyncHandler` (existing).
- Produces:
  - `GET /api/announcements/active?barangay=<name>` → `200 { success: true, announcement: {...} | null }`. Consumed by Task 11's mobile service.
  - `GET /api/admin/announcements` → `200 { success: true, announcements: [...] }`. Consumed by Task 7's admin hook.
  - `POST /api/admin/announcements` → `201 { success: true, announcement: {...} }`, or `400` on validation failure. Consumed by Task 7's admin hook.
  - `DELETE /api/admin/announcements/:id` → `200 { success: true }`, or `404` if the id doesn't exist. Consumed by Task 7's admin hook.

- [ ] **Step 1: Write the controller**

```ts
// src/controllers/announcement.controller.ts
import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/middlewares/authenticate.middleware";
import { announcementService } from "@/services/announcement.service";
import { asyncHandler } from "@/utils/asyncHandler";

export const announcementController = {
    getActive: asyncHandler(async (req: Request, res: Response) => {
        const barangay = typeof req.query.barangay === "string" ? req.query.barangay : undefined;
        const announcement = await announcementService.getActive(barangay);
        res.status(200).json({ success: true, announcement });
    }),

    listForAdmin: asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
        const announcements = await announcementService.listForAdmin();
        res.status(200).json({ success: true, announcements });
    }),

    create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const announcement = await announcementService.create(req.userId!, req.body);
        res.status(201).json({ success: true, announcement });
    }),

    remove: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await announcementService.remove(req.params.id as string);
        res.status(200).json({ success: true });
    }),
};
```

- [ ] **Step 2: Write the routes**

```ts
// src/routes/announcement.routes.ts
import { Router } from "express";
import { announcementController } from "@/controllers/announcement.controller";
import { authenticate } from "@/middlewares/authenticate.middleware";
import { requireAdmin } from "@/middlewares/requireAdmin.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { createAnnouncementSchema } from "@/validations/announcement.validation";

const router = Router();

// Public safety content -- no authenticate middleware.
router.get("/announcements/active", announcementController.getActive);

router.get("/admin/announcements", authenticate, requireAdmin, announcementController.listForAdmin);
router.post(
    "/admin/announcements",
    authenticate,
    requireAdmin,
    validate(createAnnouncementSchema),
    announcementController.create
);
router.delete("/admin/announcements/:id", authenticate, requireAdmin, announcementController.remove);

export default router;
```

- [ ] **Step 3: Mount it**

In `src/routes/index.ts`, add the import and mount call:

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

export default router;
```

- [ ] **Step 4: Typecheck**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 5: Run and verify with curl**

```bash
npm run dev
```

In another terminal, get an admin bearer token (log in as a `role: "admin"` user via the existing `POST /api/auth/login`), then:

```bash
curl http://localhost:8000/api/announcements/active
```

Expected: `200 { "success": true, "announcement": null }` (no data yet).

```bash
curl -X POST http://localhost:8000/api/admin/announcements \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Storm Signal No. 1 Raised","content":"Secure loose objects and monitor updates.","priority":"Urgent","audience":"All Users"}'
```

Expected: `201` with the created row, including an `id`.

```bash
curl -X POST http://localhost:8000/api/admin/announcements \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Bad","content":"Bad","priority":"Urgent","audience":"Specific Barangay"}'
```

Expected: `400` (missing `barangayName`).

```bash
curl http://localhost:8000/api/announcements/active
curl http://localhost:8000/api/admin/announcements -H "Authorization: Bearer <ADMIN_TOKEN>"
curl -X DELETE http://localhost:8000/api/admin/announcements/<ID_FROM_ABOVE> -H "Authorization: Bearer <ADMIN_TOKEN>"
curl http://localhost:8000/api/announcements/active
```

Expected: the first `active` call returns the "All Users" row just created; the admin list includes it; the `DELETE` returns `{ "success": true }`; the final `active` call returns `null` again.

- [ ] **Step 6: Commit**

```bash
git add src/controllers/announcement.controller.ts src/routes/announcement.routes.ts src/routes/index.ts
git commit -m "feat: add announcement endpoints"
```

---

### Task 5: Admin — Cordova barangay names constant

**Files:**
- Create: `C:\Users\kianr\cordova-riskq-admin\src\constants\barangays.ts`

**Interfaces:**
- Produces: `export const CORDOVA_BARANGAY_NAMES: string[]`, consumed by Task 8's `AnnouncementForm.tsx`.

- [ ] **Step 1: Write the file**

```ts
// src/constants/barangays.ts
// Mirrors the barangay names in the mobile repo's constants/cordovaBarangays.ts.
// Kept in sync manually -- no shared package between the two repos today.
export const CORDOVA_BARANGAY_NAMES = [
  "Alegria",
  "Bangbang",
  "Buagsong",
  "Catarman",
  "Cogon",
  "Dapitan",
  "Day-as",
  "Gabi",
  "Gilutongan",
  "Ibabao",
  "Pilipog",
  "Poblacion",
  "San Miguel",
];
```

- [ ] **Step 2: Typecheck**

```bash
cd C:\Users\kianr\cordova-riskq-admin
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/constants/barangays.ts
git commit -m "feat: add Cordova barangay names constant"
```

---

### Task 6: Admin — update `Announcement` type

**Files:**
- Modify: `C:\Users\kianr\cordova-riskq-admin\src\types\announcement.ts`

**Interfaces:**
- Produces: `Announcement` gains `barangayName?: string | null` and loses `published`. Consumed by Task 7 (hook), Task 9 (table), Task 10 (page).

- [ ] **Step 1: Update the type**

Replace the file's contents:

```ts
export type AnnouncementPriority = "Normal" | "Urgent";

export type AnnouncementAudience = "All Users" | "Responders Only" | "Specific Barangay";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  barangayName?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Typecheck**

```bash
cd C:\Users\kianr\cordova-riskq-admin
npx tsc --noEmit -p .
```

Expected: errors in `AnnouncementTable.tsx` (still references the old mock array with `published`) — that's expected and fixed in Task 9. Confirm there are no errors anywhere else.

- [ ] **Step 3: Commit**

```bash
git add src/types/announcement.ts
git commit -m "feat: add barangayName to Announcement type, drop published"
```

---

### Task 7: Admin — `useAnnouncements` hook

**Files:**
- Create: `C:\Users\kianr\cordova-riskq-admin\src\hooks\useAnnouncements.ts`

**Interfaces:**
- Consumes: `apiFetch` from `@/lib/api` (existing); `useAuth` from `@/hooks/useAuth` (existing); `Announcement`, `AnnouncementAudience`, `AnnouncementPriority` from `@/types/announcement` (Task 6).
- Produces: `export function useAnnouncements()` returning `{ announcements: Announcement[]; loading: boolean; error: string | null; actionError: string | null; create: (input: { title: string; content: string; priority: AnnouncementPriority; audience: AnnouncementAudience; barangayName?: string }) => Promise<void>; remove: (id: string) => Promise<void> }`. Consumed by Task 10's page.

- [ ] **Step 1: Write the hook**

```ts
// src/hooks/useAnnouncements.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Announcement, AnnouncementAudience, AnnouncementPriority } from "@/types/announcement";

type CreateAnnouncementInput = {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  barangayName?: string;
};

export function useAnnouncements() {
  const { token } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
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

    apiFetch<{ success: true; announcements: Announcement[] }>("/admin/announcements", { token })
      .then((response) => {
        if (!cancelled) setAnnouncements(response.announcements);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load announcements.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const create = useCallback(
    async (input: CreateAnnouncementInput) => {
      if (!token) return;

      setActionError(null);

      try {
        const response = await apiFetch<{ success: true; announcement: Announcement }>(
          "/admin/announcements",
          {
            method: "POST",
            body: JSON.stringify(input),
            token,
          }
        );

        setAnnouncements((prev) => [response.announcement, ...prev]);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to publish announcement.");
        throw err;
      }
    },
    [token]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!token) return;

      setActionError(null);

      try {
        await apiFetch<{ success: true }>(`/admin/announcements/${id}`, {
          method: "DELETE",
          token,
        });

        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to delete announcement.");
        throw err;
      }
    },
    [token]
  );

  return { announcements, loading, error, actionError, create, remove };
}
```

- [ ] **Step 2: Typecheck**

```bash
cd C:\Users\kianr\cordova-riskq-admin
npx tsc --noEmit -p .
```

Expected: the pre-existing `AnnouncementTable.tsx` errors from Task 6 are still there (fixed next in Tasks 8–9); no *new* errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAnnouncements.ts
git commit -m "feat: add useAnnouncements hook"
```

---

### Task 8: Admin — barangay picker in `AnnouncementForm`

**Files:**
- Modify: `C:\Users\kianr\cordova-riskq-admin\src\components\announcements\AnnouncementForm.tsx`

**Interfaces:**
- Consumes: `CORDOVA_BARANGAY_NAMES` from `@/constants/barangays` (Task 5).
- Produces: `AnnouncementForm` gains `barangay: string` and `onBarangayChange: (value: string) => void` props. Consumed by Task 10's page.

- [ ] **Step 1: Replace the file**

```tsx
// src/components/announcements/AnnouncementForm.tsx
import { Megaphone } from "lucide-react";
import Card from "@/components/ui/Card";
import { CORDOVA_BARANGAY_NAMES } from "@/constants/barangays";
import type { AnnouncementAudience, AnnouncementPriority } from "@/types/announcement";

const priorities: AnnouncementPriority[] = ["Normal", "Urgent"];
const audiences: AnnouncementAudience[] = ["All Users", "Responders Only", "Specific Barangay"];

type AnnouncementFormProps = {
  title: string;
  body: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  barangay: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onPriorityChange: (value: AnnouncementPriority) => void;
  onAudienceChange: (value: AnnouncementAudience) => void;
  onBarangayChange: (value: string) => void;
  onPublish: () => void;
};

export default function AnnouncementForm({
  title,
  body,
  priority,
  audience,
  barangay,
  onTitleChange,
  onBodyChange,
  onPriorityChange,
  onAudienceChange,
  onBarangayChange,
  onPublish,
}: AnnouncementFormProps) {
  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
          <Megaphone size={15} />
        </span>
        <h2 className="font-semibold text-foreground">Create Announcement</h2>
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onPublish();
        }}
      >
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Title</label>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Announcement title"
            className="w-full rounded-xl border border-border bg-white p-3 text-sm shadow-xs outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Message</label>
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder="Write announcement..."
            rows={5}
            className="w-full rounded-xl border border-border bg-white p-3 text-sm shadow-xs outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Priority</label>
            <div className="flex gap-1.5">
              {priorities.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPriorityChange(p)}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.97] ${
                    priority === p
                      ? p === "Urgent"
                        ? "bg-linear-to-b from-danger to-danger/80 text-white shadow-sm"
                        : "bg-linear-to-b from-primary to-primary-dark text-white shadow-sm"
                      : "border border-border bg-white text-muted hover:bg-primary-light/30"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Audience</label>
            <select
              value={audience}
              onChange={(e) => onAudienceChange(e.target.value as AnnouncementAudience)}
              className="w-full rounded-xl border border-border bg-white p-2.5 text-sm shadow-xs outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            >
              {audiences.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {audience === "Specific Barangay" && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Barangay</label>
            <select
              value={barangay}
              onChange={(e) => onBarangayChange(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-white p-2.5 text-sm shadow-xs outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            >
              <option value="" disabled>
                Select a barangay
              </option>
              {CORDOVA_BARANGAY_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          className="w-full rounded-xl bg-linear-to-b from-primary to-primary-dark px-5 py-3 font-semibold text-white shadow-sm transition-all duration-150 hover:brightness-110 active:scale-[0.98] sm:w-auto"
        >
          Publish Announcement
        </button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd C:\Users\kianr\cordova-riskq-admin
npx tsc --noEmit -p .
```

Expected: a new error in `page.tsx` (doesn't pass `barangay`/`onBarangayChange` yet — fixed in Task 10); `AnnouncementTable.tsx` errors from Task 6 still present. No errors in this file itself.

- [ ] **Step 3: Commit**

```bash
git add src/components/announcements/AnnouncementForm.tsx
git commit -m "feat: add barangay picker to AnnouncementForm"
```

---

### Task 9: Admin — wire `AnnouncementTable` to real data

**Files:**
- Modify: `C:\Users\kianr\cordova-riskq-admin\src\components\announcements\AnnouncementTable.tsx`

**Interfaces:**
- Consumes: `Announcement` from `@/types/announcement` (Task 6).
- Produces: `AnnouncementTable` now takes `{ announcements: Announcement[]; loading: boolean; error: string | null; actionError: string | null; onDelete: (id: string) => Promise<void> }` props instead of reading a local mock array. Consumed by Task 10's page.

- [ ] **Step 1: Replace the file**

```tsx
// src/components/announcements/AnnouncementTable.tsx
"use client";

import { useMemo, useState } from "react";
import { Search, Megaphone, Trash2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import type { Announcement } from "@/types/announcement";

const priorityFilters = ["All", "Normal", "Urgent"] as const;

export default function AnnouncementTable({
  announcements,
  loading,
  error,
  actionError,
  onDelete,
}: {
  announcements: Announcement[];
  loading: boolean;
  error: string | null;
  actionError: string | null;
  onDelete: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<(typeof priorityFilters)[number]>("All");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return announcements.filter((a) => {
      const matchesPriority = priorityFilter === "All" || a.priority === priorityFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery = q.length === 0 || a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
      return matchesPriority && matchesQuery;
    });
  }, [query, priorityFilter, announcements]);

  async function handleDelete(id: string) {
    setPendingId(id);
    try {
      await onDelete(id);
    } catch {
      // surfaced via useAnnouncements' actionError state, rendered below
    } finally {
      setPendingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-muted shadow-sm">
        Loading announcements…
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

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search announcements..."
              className="w-full rounded-xl border border-border bg-background/60 py-2 pl-9 pr-3 text-sm text-foreground shadow-xs outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {priorityFilters.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  priorityFilter === p
                    ? "bg-linear-to-b from-primary to-primary-dark text-white shadow-sm"
                    : "bg-background text-muted hover:bg-primary-light/40 hover:text-primary"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-border/70">
          {filtered.map((a) => (
            <div key={a.id} className="flex items-start gap-3 p-4 transition-colors hover:bg-background/50">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${a.priority === "Urgent" ? "bg-danger-light text-danger" : "bg-primary-light text-primary"}`}>
                <Megaphone size={16} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{a.title}</p>
                  <Badge variant={a.priority === "Urgent" ? "danger" : "default"} solid={a.priority === "Urgent"}>
                    {a.priority}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{a.content}</p>
                <p className="mt-1.5 text-xs text-muted">
                  {a.audience}
                  {a.barangayName ? ` (${a.barangayName})` : ""} &middot; {new Date(a.createdAt).toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(a.id)}
                disabled={pendingId === a.id}
                aria-label={`Delete ${a.title}`}
                className="shrink-0 rounded-full p-2 text-muted transition hover:bg-danger-light hover:text-danger disabled:opacity-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="p-10 text-center text-sm text-muted">No announcements match your filters.</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd C:\Users\kianr\cordova-riskq-admin
npx tsc --noEmit -p .
```

Expected: only the pre-existing `page.tsx` error from Task 8 remains (fixed next in Task 10). No errors in this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/announcements/AnnouncementTable.tsx
git commit -m "feat: wire AnnouncementTable to real data with delete action"
```

---

### Task 10: Admin — wire the Announcements page end-to-end

**Files:**
- Modify: `C:\Users\kianr\cordova-riskq-admin\src\app\(dashboard)\announcements\page.tsx`

**Interfaces:**
- Consumes: `useAnnouncements` (Task 7); `AnnouncementForm` with its new `barangay`/`onBarangayChange` props (Task 8); `AnnouncementTable` with its new props (Task 9).

- [ ] **Step 1: Replace the file**

```tsx
// src/app/(dashboard)/announcements/page.tsx
"use client";

import { useState } from "react";
import AnnouncementForm from "@/components/announcements/AnnouncementForm";
import AnnouncementPreview from "@/components/announcements/AnnouncementPreview";
import AnnouncementTable from "@/components/announcements/AnnouncementTable";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import type { AnnouncementAudience, AnnouncementPriority } from "@/types/announcement";

export default function AnnouncementsPage() {
  const { announcements, loading, error, actionError, create, remove } = useAnnouncements();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<AnnouncementPriority>("Normal");
  const [audience, setAudience] = useState<AnnouncementAudience>("All Users");
  const [barangay, setBarangay] = useState("");

  async function handlePublish() {
    try {
      await create({
        title,
        content: body,
        priority,
        audience,
        barangayName: audience === "Specific Barangay" ? barangay : undefined,
      });
      setTitle("");
      setBody("");
      setPriority("Normal");
      setAudience("All Users");
      setBarangay("");
    } catch {
      // surfaced via useAnnouncements' actionError state, rendered in the table
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Announcements</h1>

        <p className="text-sm text-muted">
          Publish emergency and system announcements.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr] xl:items-start">
        <AnnouncementForm
          title={title}
          body={body}
          priority={priority}
          audience={audience}
          barangay={barangay}
          onTitleChange={setTitle}
          onBodyChange={setBody}
          onPriorityChange={setPriority}
          onAudienceChange={setAudience}
          onBarangayChange={setBarangay}
          onPublish={handlePublish}
        />

        <AnnouncementPreview title={title} body={body} priority={priority} audience={audience} />
      </div>

      <div>
        <h2 className="px-1 pb-3 text-xs font-bold uppercase tracking-widest text-muted">Recent Announcements</h2>
        <AnnouncementTable
          announcements={announcements}
          loading={loading}
          error={error}
          actionError={actionError}
          onDelete={remove}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
cd C:\Users\kianr\cordova-riskq-admin
npx tsc --noEmit -p .
npx eslint src/app/(dashboard)/announcements/page.tsx src/components/announcements src/hooks/useAnnouncements.ts src/constants/barangays.ts src/types/announcement.ts
```

Expected: no errors from either command.

- [ ] **Step 3: Run against the local backend and verify**

With the backend from Task 4 running (`npm run dev` in `CordovaRiskQ-Bacnkend`), run the admin dashboard (`npm run dev` in `cordova-riskq-admin`) and log in as a `role: "admin"` user, then open `/announcements`.

Expected:
1. The table loads (empty, or showing whatever curl-created rows remain from Task 4's verification).
2. Fill the form with audience "All Users", submit — the new announcement appears at the top of the table immediately and the form clears.
3. Switch audience to "Specific Barangay" — a barangay dropdown appears; submitting without selecting one is blocked by the browser's `required` validation.
4. Select a barangay and submit — it appears in the table showing `Specific Barangay (BarangayName)`.
5. Click the delete button on a row — it disappears from the table without a page reload.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/announcements/page.tsx"
git commit -m "feat: wire Announcements page to the backend API"
```

---

### Task 11: Mobile — `advisory.service.ts`

**Files:**
- Create: `C:\Users\kianr\CordovaRiskQ-Frontend\services\advisory.service.ts`

**Interfaces:**
- Consumes: `apiGet` from `@/services/api` (existing).
- Produces: `export type Announcement = { id: string; title: string; content: string; priority: "Normal" | "Urgent"; createdAt: string }` and `export async function getActiveAnnouncement(barangayName?: string): Promise<Announcement | null>`. Consumed by Task 13's `home.tsx`.

- [ ] **Step 1: Write the service**

```ts
// services/advisory.service.ts
import { apiGet } from "./api";

export type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: "Normal" | "Urgent";
  createdAt: string;
};

export async function getActiveAnnouncement(barangayName?: string): Promise<Announcement | null> {
  const query = barangayName ? `?barangay=${encodeURIComponent(barangayName)}` : "";
  const response = await apiGet<{ success: true; announcement: Announcement | null }>(
    `/api/announcements/active${query}`,
  );
  return response.announcement;
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
cd C:\Users\kianr\CordovaRiskQ-Frontend
npx tsc --noEmit -p .
npx eslint services/advisory.service.ts
```

Expected: no errors from either command.

- [ ] **Step 3: Commit**

```bash
git add services/advisory.service.ts
git commit -m "feat: add advisory.service.ts"
```

---

### Task 12: Mobile — update `AdvisoryBanner` props

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Frontend\components\home\AdvisoryBanner.tsx`

**Interfaces:**
- Produces: `AdvisoryBanner` now takes `{ priority: "Normal" | "Urgent"; time: string; title: string; message: string }` (drops `signalLabel`/`sample`). Consumed by Task 13's `home.tsx`.

- [ ] **Step 1: Replace the file**

```tsx
// components/home/AdvisoryBanner.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

type AdvisoryBannerProps = {
  priority: "Normal" | "Urgent";
  time: string;
  title: string;
  message: string;
};

export default function AdvisoryBanner({
  priority,
  time,
  title,
  message,
}: AdvisoryBannerProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <Ionicons name="warning" size={16} color={COLORS.white} />
      </View>
      <View style={styles.textCol}>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>ANNOUNCEMENT · {priority === "Urgent" ? "URGENT" : "NOTICE"}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      gap: SPACING.sm + 2,
      backgroundColor: COLORS.warningBg,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
      ...SHADOW,
    },
    iconCircle: {
      width: 30,
      height: 30,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.warning,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    textCol: {
      flex: 1,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    meta: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "800",
      color: COLORS.warning,
      letterSpacing: 0.4,
    },
    time: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
    },
    title: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
      marginTop: 2,
    },
    message: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
      marginTop: 2,
      lineHeight: 18,
    },
  });
}
```

- [ ] **Step 2: Typecheck**

```bash
cd C:\Users\kianr\CordovaRiskQ-Frontend
npx tsc --noEmit -p .
```

Expected: an error in `app/(tabs)/home.tsx` (still passes the old `signalLabel`/`sample` props) — expected, fixed in Task 13.

- [ ] **Step 3: Commit**

```bash
git add components/home/AdvisoryBanner.tsx
git commit -m "feat: adapt AdvisoryBanner to priority-based announcements"
```

---

### Task 13: Mobile — wire `home.tsx` to real announcements

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Frontend\app\(tabs)\home.tsx`

**Interfaces:**
- Consumes: `getActiveAnnouncement`, `type Announcement` from `@/services/advisory.service` (Task 11); updated `AdvisoryBanner` props (Task 12); existing `formatTime` from `@/utils/formatter`; existing `getNearestBarangay` from `@/constants/cordovaBarangays`.

- [ ] **Step 1: Add the import and remove `MOCK_ADVISORY`**

In `app/(tabs)/home.tsx`:

1. Add the import (alongside the other `@/services/*` imports):

```ts
import { getActiveAnnouncement, type Announcement } from "@/services/advisory.service";
```

2. Delete the `MOCK_ADVISORY` constant entirely:

```ts
const MOCK_ADVISORY = {
  signalLabel: "Signal No. 1",
  time: "8:00 AM",
  title: "Tropical Depression Amang nears Cebu",
  message: "Heavy rain and storm surge expected from 6 PM. Prepare go-bags and stay off the causeway.",
};
```

- [ ] **Step 2: Add `announcement` state and fetch it**

Add a state next to the existing `tideStatus`/`location` states:

```ts
const [announcement, setAnnouncement] = useState<Announcement | null>(null);
```

In the existing `useEffect`, change the `Promise.all([getEvacuationCenters(), getCurrentLocation()])` block from:

```ts
Promise.all([getEvacuationCenters(), getCurrentLocation()])
  .then(([centers, fix]) => {
    if (fix) {
      const nearestBarangay = getNearestBarangay(fix.latitude, fix.longitude);
      setLocation(`Barangay ${nearestBarangay.name}, Cordova`);
    }

    if (centers.length === 0) return;
```

to:

```ts
Promise.all([getEvacuationCenters(), getCurrentLocation()])
  .then(([centers, fix]) => {
    let barangayName: string | undefined;
    if (fix) {
      const nearestBarangay = getNearestBarangay(fix.latitude, fix.longitude);
      barangayName = nearestBarangay.name;
      setLocation(`Barangay ${nearestBarangay.name}, Cordova`);
    }

    getActiveAnnouncement(barangayName)
      .then(setAnnouncement)
      .catch(() => {});

    if (centers.length === 0) return;
```

(The rest of that `.then(...)` block — distance calculation and `setNearestCenter` — is unchanged.)

- [ ] **Step 3: Render `AdvisoryBanner` conditionally with real data**

Replace the existing usage:

```tsx
<AdvisoryBanner
  signalLabel={MOCK_ADVISORY.signalLabel}
  time={MOCK_ADVISORY.time}
  title={MOCK_ADVISORY.title}
  message={MOCK_ADVISORY.message}
  sample
/>
```

with:

```tsx
{announcement ? (
  <AdvisoryBanner
    priority={announcement.priority}
    time={formatTime(announcement.createdAt)}
    title={announcement.title}
    message={announcement.content}
  />
) : null}
```

- [ ] **Step 4: Typecheck and lint**

```bash
cd C:\Users\kianr\CordovaRiskQ-Frontend
npx tsc --noEmit -p .
npx eslint "app/(tabs)/home.tsx"
```

Expected: no errors from either command.

- [ ] **Step 5: Run against the local backend and verify**

With the backend from Task 4 running, publish an "All Users" announcement through the admin dashboard (Task 10's flow), then run the mobile app (`npx expo start`, on a device/simulator — not `--web`, which is broken for this project for unrelated `@rnmapbox/maps` reasons) and open the Home tab.

Expected:
1. The advisory banner shows the published title/content, with `ANNOUNCEMENT · URGENT` or `ANNOUNCEMENT · NOTICE` matching the priority chosen, and a time matching when it was created.
2. In the admin dashboard, publish a "Specific Barangay" announcement for a barangay other than the device's current location; reload the app — the banner still shows the "All Users" one (or none, if that one was deleted), not the mismatched barangay one.
3. Publish one for the device's actual nearest barangay; reload — it now shows (being the most recently created match).
4. Delete every announcement (or let nothing match); reload — the banner doesn't render at all, and the rest of Home still works.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/home.tsx"
git commit -m "feat: wire Home advisory banner to real announcements"
```

---

## Self-Review Notes

- **Spec coverage:** all 4 scope items map to tasks — `Announcement` model (Task 1), four endpoints (Tasks 2–4), admin wiring including the barangay picker (Tasks 5–10), mobile wiring including the `sample`-badge removal (Tasks 11–13). Every "Out of scope" item from the spec (edit/draft/unpublish, audit logging, responder surfacing, home-barangay profile field, push notifications, new color tokens, automated tests) is left untouched by every task above.
- **Placeholder scan:** no TBD/TODO; every step has real code or an exact command with exact expected output.
- **Type consistency:** `Announcement` (mobile, `services/advisory.service.ts`) has `{ id, title, content, priority, createdAt }` and is used with exactly those fields in Task 13. `Announcement` (admin, `src/types/announcement.ts`) has `{ id, title, content, priority, audience, barangayName?, createdAt, updatedAt }` and is used consistently across Tasks 7, 8 (via props derived from state, not the type directly), 9, and 10. Backend `announcementService`'s method names (`getActive`, `listForAdmin`, `create`, `remove`) match exactly what Task 4's controller calls. `AdvisoryBanner`'s `priority: "Normal" | "Urgent"` prop (Task 12) matches the type Task 13 passes it and the type Task 11's service returns.
