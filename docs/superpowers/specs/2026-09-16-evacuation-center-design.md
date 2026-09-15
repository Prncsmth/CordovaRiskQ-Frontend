# Evacuation Center Backend Model Design

**Goal:** Give evacuation centers a real backend model instead of two independent, diverging hardcoded lists — the admin app's `EvacuationCenterList.tsx`/`EvacuationCenterCapacity.tsx` (4 fake centers with fabricated occupancy numbers) and the mobile app's `services/evacuation.service.ts` (16 real, researched Cordova facilities with verified coordinates, but no live status). This spec makes the backend model the shared source of truth and wires the admin app to it. Migrating the mobile app off its hardcoded list is a deliberate follow-up (see Non-Goals) — this design just makes that migration a drop-in later rather than a rework.

**Architecture:** Two repos, worked in sequence, mirroring the pattern used for admin role management. Backend (`CordovaRiskQ-Bacnkend`) first — a new `EvacuationCenter` Prisma model, seeded once from the mobile app's already-real 16-facility dataset, plus a public read endpoint and an admin-gated edit endpoint. Admin frontend (`CordovaRiskQ- Admin/cordova-riskq-admin`) second — the Evacuation Centers page and the Dashboard's evacuation widget both switch from hardcoded arrays to the real endpoint, and gain an edit control for status + facilities.

**Tech Stack:** Backend: Express 5, Prisma 7 (Postgres/Neon), `zod` — unchanged. Admin frontend: Next.js (App Router), React — unchanged, no new dependencies in either repo.

## Global Constraints

- **Repos:** backend work in `CordovaRiskQ-Bacnkend`; admin frontend work in `cordova-riskq-admin`. Each task states which one.
- **No new dependencies in either repo.**
- **No automated test suite in either repo.** Verification is `npx tsc --noEmit` (backend) / `npm run build` (admin) plus manual curl/browser checks, matching every prior spec in this project.
- **Backend error convention:** every thrown error is an `AppError(message, statusCode)`; the global `errorHandler` turns it into `{ success: false, message }`.
- **Backend layering:** `routes` → `validate` middleware → `controller` (thin, `asyncHandler`-wrapped) → `service` (business logic + Prisma). Follow `admin.*` as the template (it's the most recent resource added this way).
- **Backend response envelope:** every controller responds `{ success: true, <resource> }` (or `<resource+"s">` for a list).
- Commit after every task.

## Data Model

New model in `prisma/schema.prisma`:

```prisma
model EvacuationCenter {
  id         String   @id  // reuses the mobile app's existing slugs (e.g. "cordova-central-elementary") so its evacuation-detail/[id] route keeps working unchanged once migrated
  name       String
  address    String
  category   String       // "school" | "evacuation_center"
  facilities String[]     // utilities: "Water" | "Power" | "Medical Aid" | "Restrooms" (the fixed set already used across the real 16 centers)
  latitude   Float
  longitude  Float
  status     String   @default("open")  // "open" | "full", admin-toggled
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

No `capacity`/`occupants` fields — status is a manual admin-set Open/Full flag, not a computed percentage. No `photo` field — only 2 of 16 real centers have one today and there's no image-hosting infra in the backend; out of scope (see Non-Goals). `distanceKm` from the mobile type is never persisted — it's a client-side computation from the user's live GPS position, unrelated to this model.

**Known facilities set** (shared constant, backend validation + admin checkbox UI):
```ts
export const KNOWN_FACILITIES = ["Water", "Power", "Medical Aid", "Restrooms"] as const;
```
Sourced from what's actually used across the mobile app's real 16-center dataset today — not invented.

## Backend: `evacuationCenter.*` resource

**New validation — `src/validations/evacuationCenter.validation.ts`:**
```ts
import { z } from "zod";

export const KNOWN_FACILITIES = ["Water", "Power", "Medical Aid", "Restrooms"] as const;

export const updateEvacuationCenterSchema = z.object({
  status: z.enum(["open", "full"]).optional(),
  facilities: z.array(z.enum(KNOWN_FACILITIES)).optional(),
});
```

**New service — `src/services/evacuationCenter.service.ts`:**
- `list()`: `prisma.evacuationCenter.findMany({ orderBy: { name: "asc" } })` — no shaping needed, the model's fields are already the public shape.
- `update(id, data: { status?, facilities? })`: fetches the center, throws `AppError("Evacuation center not found", 404)` if missing, `prisma.evacuationCenter.update({ where: { id }, data })`, returns the updated row.

**New controller — `src/controllers/evacuationCenter.controller.ts`:** thin `asyncHandler`-wrapped `list` and `update`, following `admin.controller.ts`'s pattern exactly (`res.status(200).json({ success: true, centers })` / `{ success: true, center }`).

**New routes — `src/routes/evacuationCenter.routes.ts`:**
```
GET   /evacuation-centers               authenticate                          → list      (any signed-in citizen, responder, or admin)
PATCH /admin/evacuation-centers/:id     authenticate, requireAdmin, validate   → update
```
Mounted in `src/routes/index.ts` alongside the other route files.

**Seed data — extend `prisma/seed.ts` (or a new seed step):** upserts the real 16 facilities already researched and verified in the mobile app's `services/evacuation.service.ts` (same name/address/category/coordinates/facilities, `status: "open"` for all — copied, not re-researched or invented).

## Admin frontend: real Evacuation Centers page + Dashboard widget

**`src/types/evacuation-center.ts`:** replace the fabricated `occupants`/`capacity` fields with the real shape — `{ id, name, address, category, facilities: string[], latitude, longitude, status: "open" | "full" }`.

**`src/hooks/useEvacuationCenters.ts`** (new): fetch-on-mount hook calling `GET /evacuation-centers`, following the `useResponders`/`useUsers` pattern exactly (token-gated effect, `loading`/`error` state). Exposes `updateCenter(id, data: { status?, facilities? }): Promise<void>` calling the `PATCH` endpoint and updating the local list in place on success — mirrors `useUsers.ts`'s `changeRole`.

**`src/components/evacuation-centers/EvacuationCenterList.tsx`:** replaces the hardcoded `centers` array with `useEvacuationCenters()`. Each card's percentage bar is replaced with an Open/Full `Badge` plus an edit control: a status toggle button (reusing the `UserTable.tsx` "Promote to Responder"/"Revert to Citizen" toggle pattern — here "Mark as Full"/"Mark as Open") and a checkbox group over `KNOWN_FACILITIES` for editing that center's facilities, both calling `updateCenter`.

**`src/components/dashboard/EvacuationCenterCapacity.tsx`** → renamed `EvacuationCenterStatus.tsx` (file + import in `dashboard/page.tsx`): replaces its hardcoded array with `useEvacuationCenters()`, shows each center's name + Open/Full `Badge` instead of a percentage bar.

## Non-Goals (explicitly out of scope)

- **Migrating the mobile app** (`CordovaRiskQ-Frontend`'s `services/evacuation.service.ts`) off its hardcoded list — deliberate follow-up spec, not this one. This design's field shape (`id` reusing mobile's slugs, `address`, `category`, `facilities`) is chosen specifically so that migration is a drop-in swap of the service's implementation, not a data or route redesign.
- **Full CRUD** — admins can edit an existing center's `status` and `facilities` only. Creating, deleting, or editing `name`/`address`/`category`/coordinates isn't exposed; the 16-center list is seeded once and is expected to rarely change.
- **Photo support** — dropped entirely (see Data Model).
- **Capacity/occupancy headcount tracking** — explicitly rejected in favor of the simpler manual Open/Full status.
- **Real-time/websocket sync** — `GET /evacuation-centers` is fetch-on-mount only, matching every other admin list in this app; status doesn't change often enough to justify a socket channel.
- **Free-text facility tags** — facilities are restricted to `KNOWN_FACILITIES`, validated server-side, to keep the data consistent (no "medical aid" vs "Medical Aid" drift).

## Verification Plan

1. **Backend, via curl:** `GET /evacuation-centers` with a citizen/responder/admin token all succeed and return the seeded 16 centers; without a token, 401. `PATCH /admin/evacuation-centers/:id` with a non-admin token → 403; with an admin token, `{ status: "full" }` flips the center's status, `{ facilities: ["Water", "Power"] }` replaces its facilities list, an unknown facility string is rejected by the `zod` schema (400).
2. **Admin app, in the browser:** Evacuation Centers page shows the real 16 centers (not "Gabi Evacuation Center — 120/200"); toggling a center's status updates its badge without a page reload; editing facilities via the checkbox group persists after a refresh. Dashboard's evacuation widget shows the same real centers with Open/Full badges instead of percentage bars.
