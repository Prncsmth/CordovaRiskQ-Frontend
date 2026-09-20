# Emergency Hotlines Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Contacts screen's hardcoded hotline array with a real backend resource — a `Hotline` Prisma model, seeded with the current six hotlines, served over `GET /api/hotlines`, which the app reads instead of the local array.

**Architecture:** Backend gains a `Hotline` model (mirroring the existing `EvacuationCenter` resource shape exactly: fixed slug ids, seeded, one authenticated GET route, no write route). Frontend's `services/contacts.service.ts` calls the real endpoint instead of returning an in-memory array; `app/contacts/index.tsx` drops its local category lookup in favor of the server's `category` field.

**Tech Stack:** Backend: Express 5, Prisma 7/Postgres (Neon), TypeScript (ESM, `@/` path aliases). Frontend: Expo Router, React Native, existing `services/api.ts` (`apiGet`) helper.

**Spec:** `docs/superpowers/specs/2026-09-21-hotlines-backend-design.md`

## Global Constraints

- `GET /api/hotlines` is **authenticated** (`authenticate` middleware) — matching `evacuationCenter.routes.ts`, not `tide.routes.ts`'s public precedent (spec's explicit choice).
- Hotline ids are fixed slugs and MUST exactly match the frontend's current ones — `mdrrmo`, `police`, `bfp`, `coast-guard`, `health-center`, `red-cross` — because `app/contacts/index.tsx`'s `HOTLINE_ICONS`/`HOTLINE_ACCENT_COLORS`/`HOTLINE_IMAGES` maps stay keyed by these ids and are NOT changing.
- No `PATCH`/admin route, no validation schema — this is a GET-only resource (out of scope per spec).
- **Do not run `prisma migrate dev`, `prisma migrate reset`, or `prisma db push --accept-data-loss` in the backend repo.** These two repos (`CordovaRiskQ-Bacnkend` and `CordovaRiskQ- Admin`) share one Neon database with divergent Prisma migration histories; any of those commands will detect the Admin repo's `Admin` table as unexplained drift and offer to drop it. The migration in Task 1 is hand-written and applied via `prisma db execute` + `prisma migrate resolve --applied`, the same path already used for the `SosAlert` table.
- Neither repo has an automated test framework for this class of resource (confirmed: `evacuationCenter.*` on the backend has no `.test.ts`, only pure-logic services like `geofence`/`incidentRoster` do). Every task below is verified manually via `tsc`/a concrete runtime check (curl or running the app) — there is no "write a failing test" step in this plan.

---

## File Structure

**Backend (`C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend`):**
- `prisma/schema.prisma` — modified: add `Hotline` model.
- `prisma/migrations/20260921120000_add_hotline/migration.sql` — new: hand-written `CREATE TABLE`.
- `prisma/seed.ts` — modified: add `seedHotlines()`.
- `src/services/hotline.service.ts` — new: `list()`.
- `src/controllers/hotline.controller.ts` — new: thin HTTP handler.
- `src/routes/hotline.routes.ts` — new: route registration.
- `src/routes/index.ts` — modified: mount the new route.

**Frontend (`C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend`, this repo):**
- `services/contacts.service.ts` — rewritten: real `getHotlines(token)`.
- `app/contacts/index.tsx` — modified: pass `token`, group by `hotline.category` instead of the local `HOTLINE_CATEGORY` map.

---

### Task 1: Backend — `Hotline` Prisma model + hand-written migration

**Files:**
- Modify: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend\prisma\schema.prisma`
- Create: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend\prisma\migrations\20260921120000_add_hotline\migration.sql`

**Interfaces:**
- Produces: a `prisma.hotline` model with fields `id: String`, `name: String`, `number: String`, `category: String`, `createdAt: DateTime`, `updatedAt: DateTime`. Task 2 (`seedHotlines`) and Task 3 (`hotlineService.list`) both call `prisma.hotline.*`.

- [ ] **Step 1: Add the model to the schema**

Append to `prisma/schema.prisma` (after the existing `EvacuationCenter` model, at the end of the file):

```prisma
model Hotline {
  id        String   @id // fixed slug, must match app/contacts/index.tsx's icon/color/image lookup keys
  name      String
  number    String
  category  String   // "police" | "fire" | "medical" | "maritime"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Hand-write the migration SQL**

Create the migration folder and file:

```bash
cd C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend
mkdir prisma\migrations\20260921120000_add_hotline
```

Create `prisma/migrations/20260921120000_add_hotline/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "Hotline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotline_pkey" PRIMARY KEY ("id")
);
```

This matches the exact style of the existing `prisma/migrations/20260915165423_add_evacuation_center/migration.sql`.

- [ ] **Step 3: Apply the migration directly (do NOT use `prisma migrate dev`)**

```bash
cd C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend
npx prisma db execute --file prisma/migrations/20260921120000_add_hotline/migration.sql
```

Expected: no output on success (or a brief confirmation) — no drift prompt, no "drop table" warning. If you see any prompt about dropping or resetting data, stop immediately and do not confirm it.

- [ ] **Step 4: Record the migration as applied**

```bash
npx prisma migrate resolve --applied 20260921120000_add_hotline
```

Expected: `Migration 20260921120000_add_hotline marked as applied.`

- [ ] **Step 5: Regenerate the Prisma client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client` with no errors. This makes `prisma.hotline` available as a typed model on the client used throughout `src/`.

- [ ] **Step 6: Verify the table exists**

```bash
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"Hotline\";"
```

Expected: a result showing `0` rows (table exists, empty).

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260921120000_add_hotline
git commit -m "feat: add Hotline model and migration"
```

---

### Task 2: Backend — seed the six hotlines

**Files:**
- Modify: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend\prisma\seed.ts`

**Interfaces:**
- Consumes: `prisma.hotline.upsert` (Task 1).
- Produces: six seeded rows an admin/dev can inspect directly; Task 3's `GET /api/hotlines` reads them back.

- [ ] **Step 1: Add the seed data and function**

In `prisma/seed.ts`, add this near the top, alongside the existing `EVACUATION_CENTERS` constant:

```ts
// Same six agencies as the mobile app's services/contacts.service.ts used to
// hardcode. category matches the frontend's old HOTLINE_CATEGORY map exactly.
const HOTLINES = [
  { id: "mdrrmo", name: "Cordova MDRRMO (Ambulance / Rescue)", number: "0917-116-9819 / 0917-149-8457", category: "medical" },
  { id: "police", name: "Cordova Police Station", number: "0998-598-6392", category: "police" },
  { id: "bfp", name: "Bureau of Fire Protection (BFP) - Cordova", number: "(032) 436-4245 / 0933-394-9073", category: "fire" },
  { id: "coast-guard", name: "Philippine Coast Guard (PCG) - Cordova", number: "0927-941-2486", category: "maritime" },
  { id: "health-center", name: "Cordova Primary Health Care Facility", number: "0967-491-5579", category: "medical" },
  { id: "red-cross", name: "Philippine Red Cross (Lapu-Lapu/Cordova Chapter)", number: "0969-450-8482", category: "medical" },
];
```

Then add the seed function, alongside `seedEvacuationCenters`:

```ts
async function seedHotlines() {
  for (const hotline of HOTLINES) {
    await prisma.hotline.upsert({
      where: { id: hotline.id },
      update: {
        name: hotline.name,
        number: hotline.number,
        category: hotline.category,
      },
      create: hotline,
    });
  }

  console.log(`Seeded ${HOTLINES.length} hotlines`);
}
```

- [ ] **Step 2: Call it from `main()`**

Update `main()`:

```ts
async function main() {
  await seedAdmin();
  await seedEvacuationCenters();
  await seedHotlines();
}
```

- [ ] **Step 3: Run the seed**

```bash
cd C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend
npm run db:seed
```

Expected: existing log lines plus `Seeded 6 hotlines`, no errors.

- [ ] **Step 4: Verify the rows**

```bash
npx prisma db execute --stdin <<< "SELECT id, category FROM \"Hotline\" ORDER BY id;"
```

Expected: 6 rows — `bfp/fire`, `coast-guard/maritime`, `health-center/medical`, `mdrrmo/medical`, `police/police`, `red-cross/medical`.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed emergency hotlines"
```

---

### Task 3: Backend — service, controller, route

**Files:**
- Create: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend\src\services\hotline.service.ts`
- Create: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend\src\controllers\hotline.controller.ts`
- Create: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend\src\routes\hotline.routes.ts`
- Modify: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend\src\routes\index.ts`

**Interfaces:**
- Consumes: `prisma.hotline.findMany` (Task 1), `authenticate` middleware (`src/middlewares/authenticate.middleware.ts`, existing), `asyncHandler` (`src/utils/asyncHandler.ts`, existing).
- Produces: `GET /api/hotlines` returning `{ success: true, hotlines: { id, name, number, category, createdAt, updatedAt }[] }`. Task 4 (frontend) consumes this exact response shape.

- [ ] **Step 1: Write the service**

Create `src/services/hotline.service.ts`:

```ts
import { prisma } from "@/lib/prisma";

export const hotlineService = {
    async list() {
        return prisma.hotline.findMany({
            orderBy: { name: "asc" },
        });
    },
};
```

- [ ] **Step 2: Write the controller**

Create `src/controllers/hotline.controller.ts`:

```ts
import { Response } from "express";
import { AuthenticatedRequest } from "@/middlewares/authenticate.middleware";
import { hotlineService } from "@/services/hotline.service";
import { asyncHandler } from "@/utils/asyncHandler";

export const hotlineController = {
    list: asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
        const hotlines = await hotlineService.list();
        res.status(200).json({ success: true, hotlines });
    }),
};
```

- [ ] **Step 3: Write the route**

Create `src/routes/hotline.routes.ts`:

```ts
import { Router } from "express";
import { hotlineController } from "@/controllers/hotline.controller";
import { authenticate } from "@/middlewares/authenticate.middleware";

const router = Router();

router.get("/hotlines", authenticate, hotlineController.list);

export default router;
```

- [ ] **Step 4: Mount the route**

In `src/routes/index.ts`, add the import next to `evacuationCenterRoutes`:

```ts
import hotlineRoutes from "@/routes/hotline.routes";
```

And mount it next to `router.use(evacuationCenterRoutes);`:

```ts
router.use(hotlineRoutes);
```

- [ ] **Step 5: Verify with the dev server running**

```bash
cd C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend
npm run dev
```

In a second terminal, log in as any existing user to get a token (or reuse one from the mobile app's dev session), then:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/hotlines
```

Expected: `{"success":true,"hotlines":[...6 rows...]}`. Then confirm it's actually gated:

```bash
curl http://localhost:8000/api/hotlines
```

Expected: `401` with a "Missing or invalid Authorization header" message.

- [ ] **Step 6: Commit**

```bash
git add src/services/hotline.service.ts src/controllers/hotline.controller.ts src/routes/hotline.routes.ts src/routes/index.ts
git commit -m "feat: add GET /api/hotlines"
```

---

### Task 4: Frontend — wire `contacts.service.ts` to the real endpoint

**Files:**
- Modify: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend\services\contacts.service.ts`

**Interfaces:**
- Consumes: `apiGet<T>(path, token)` from `./api` (existing); backend response shape from Task 3 (`{ success: true; hotlines: HotlineApiRow[] }`).
- Produces: `Hotline` type (`{ id: string; name: string; number: string; category: HotlineCategory }`) and `getHotlines(token: string): Promise<Hotline[]>`. Task 5 calls this with a real token and reads `.category` on each result.

- [ ] **Step 1: Rewrite the service**

Replace the entire contents of `services/contacts.service.ts`:

```ts
// services/contacts.service.ts
// Wraps GET /api/hotlines -- a real, already-implemented backend endpoint
// (hotlineService.list, seeded with the same 6 Cordova, Cebu agencies this
// file used to hardcode -- see prisma/seed.ts on the backend, whose ids
// match app/contacts/index.tsx's icon/color/image lookups exactly).
import { apiGet } from "./api";

export type HotlineCategory = "police" | "fire" | "medical" | "maritime";

export type Hotline = {
  id: string;
  name: string;
  number: string;
  category: HotlineCategory;
};

type HotlineApiRow = {
  id: string;
  name: string;
  number: string;
  category: string;
};

function toHotline(row: HotlineApiRow): Hotline {
  return {
    id: row.id,
    name: row.name,
    number: row.number,
    category: row.category as HotlineCategory,
  };
}

export async function getHotlines(token: string): Promise<Hotline[]> {
  const response = await apiGet<{ success: true; hotlines: HotlineApiRow[] }>(
    "/api/hotlines",
    token,
  );
  return response.hotlines.map(toHotline);
}
```

- [ ] **Step 2: Type-check**

```bash
cd C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend
npx tsc --noEmit -p . 2>&1 | grep -i contacts
```

Expected: no output (no errors referencing `contacts.service.ts`). `app/contacts/index.tsx` will show errors until Task 5 — that's expected at this point.

- [ ] **Step 3: Commit**

```bash
git add services/contacts.service.ts
git commit -m "feat: wire contacts.service.ts to real GET /api/hotlines"
```

---

### Task 5: Frontend — wire `app/contacts/index.tsx` to the real data

**Files:**
- Modify: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend\app\contacts\index.tsx`

**Interfaces:**
- Consumes: `useAuth()` (existing, from `@/context/AuthContext`, returns `{ token: string | null, ... }`), `getHotlines(token: string): Promise<Hotline[]>` (Task 4), `Hotline` type now carrying `.category: HotlineCategory` directly.

- [ ] **Step 1: Add the auth import and token**

In `app/contacts/index.tsx`, add the import alongside the existing ones:

```ts
import { useAuth } from "@/context/AuthContext";
```

In the component body, alongside the existing hooks:

```ts
const { token } = useAuth();
```

- [ ] **Step 2: Remove the local category map, use the server's field**

Delete this block entirely (it's now redundant — `category` comes from the backend):

```ts
const HOTLINE_CATEGORY: Record<string, CategoryKey> = {
  police: "police",
  bfp: "fire",
  mdrrmo: "medical",
  "health-center": "medical",
  "red-cross": "medical",
  "coast-guard": "maritime",
};
```

Then update `groupedHotlines` to read `h.category` instead of looking it up:

```ts
const groupedHotlines = useMemo(
  () =>
    CATEGORIES.map((category) => ({
      ...category,
      hotlines: hotlines.filter((h) => h.category === category.key),
    })).filter((group) => group.hotlines.length > 0),
  [hotlines],
);
```

- [ ] **Step 3: Pass the token into the fetch, guard on it, and stop swallowing failures silently into an infinite spinner**

Replace the existing load effect:

```ts
useEffect(() => {
  getHotlines().then((loadedHotlines) => {
    setHotlines(loadedHotlines);
    setIsLoading(false);
  });
}, []);
```

with:

```ts
useEffect(() => {
  if (!token) return;
  getHotlines(token)
    .then(setHotlines)
    .catch(() => {})
    .finally(() => setIsLoading(false));
}, [token]);
```

- [ ] **Step 4: Type-check**

```bash
cd C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend
npx tsc --noEmit -p . 2>&1 | grep -i contacts
```

Expected: no output.

- [ ] **Step 5: Manually verify in the running app**

With the backend dev server running (Task 3, Step 5) and seeded (Task 2):

```bash
cd C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend
npx expo start
```

Open the app, log in, navigate to Settings → Emergency Hotlines (or however Contacts is reached from the current UI), and confirm:
- All 6 hotlines render, grouped into the same 4 sections (Police & Safety, Fire & Rescue, Medical & Health, Maritime) as before.
- Each row still shows its correct icon, accent color, and agency seal image.
- Tapping a row still dials the correct number.

- [ ] **Step 6: Commit**

```bash
git add app/contacts/index.tsx
git commit -m "feat: wire Contacts screen to real hotline data"
```

---

## Self-Review Notes

- **Spec coverage:** all 5 scope items from the spec map to a task — model+migration (Task 1), seed (Task 2), route (Task 3), `contacts.service.ts` (Task 4), `app/contacts/index.tsx` (Task 5). Out-of-scope items (admin route/page, icon/color/image mapping, personal contacts, automated tests) are untouched by design.
- **Placeholder scan:** no TBD/TODO; every step has literal file content or a literal runnable command.
- **Type consistency:** `Hotline`/`HotlineCategory`/`HotlineApiRow` (Task 4) match what Task 5 consumes (`h.category: HotlineCategory`); `hotlineService.list()`/`hotlineController.list`/`GET /hotlines` (Task 3) match the response shape Task 4's `getHotlines` expects (`{ success: true; hotlines: HotlineApiRow[] }`); the `Hotline` Prisma model fields (Task 1) match every field Task 2's seed and Task 3's service touch (`id`, `name`, `number`, `category`).
