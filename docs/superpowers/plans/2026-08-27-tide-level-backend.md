# Tide Level Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Home screen's hardcoded `MOCK_TIDE` values with real tide data: the backend polls Stormglass.io hourly for Cordova, Cebu, stores the latest reading, and serves it over `GET /api/tide`; the app fetches it on Home mount.

**Architecture:** Backend gains a singleton `TideStatus` row upserted by an hourly poller, plus an unauthenticated read endpoint. Frontend gains a thin service wrapper and replaces `home.tsx`'s mock constant with a fetch, formatting display strings client-side (same pattern already used for evacuation-center distance).

**Tech Stack:** Backend: Express 5, Prisma/Postgres, TypeScript (ESM, `@/` path aliases), Node's built-in `fetch`. Frontend: Expo Router, React Native, existing `services/api.ts` (`apiGet`) helper.

**Spec:** `docs/superpowers/specs/2026-08-27-tide-level-backend-design.md`

## Global Constraints

- `GET /api/tide` is unauthenticated (public safety data) — no `authenticate` middleware.
- Poll interval is hourly (`60 * 60 * 1000` ms), via plain `setInterval` — no new scheduler dependency.
- Stormglass calls use Node's built-in `fetch` — no new HTTP client dependency.
- Cordova, Cebu coordinates: `latitude: 10.2515, longitude: 123.9499`.
- Flood-risk thresholds are an explicitly-flagged placeholder: `seaLevelM > 1.0` → `"warning"`, `> 0.6` → `"watch"`, else `"normal"`.
- The `TideStatus` table has exactly one row, always at `id: "current"` (upserted in place).
- Frontend renders `TideBanner` only when tide data has loaded — no error UI, matching the existing silent-catch pattern already used for notifications/evacuation centers in `home.tsx`.
- Neither repo has an automated test framework (confirmed: no `jest`/`vitest`/`mocha` dependency, no `*.test.ts`/`*.spec.ts` file in either repo). Every task is verified manually via `tsc`/`eslint` plus a concrete runtime check (curl or running the app) — there is no "write a failing test" step in this plan.

---

## File Structure

**Backend (`C:\Users\kianr\CordovaRiskQ-Bacnkend`):**
- `prisma/schema.prisma` — modified: add `TideStatus` model.
- `src/constants/location.ts` — new: `CORDOVA_CENTER` coordinates.
- `src/services/tide.service.ts` — new: Stormglass fetch, threshold logic, upsert, read.
- `src/lib/tidePolling.ts` — new: hourly scheduler.
- `src/server.ts` — modified: start the poller after `app.listen`.
- `src/controllers/tide.controller.ts` — new: thin HTTP handler.
- `src/routes/tide.routes.ts` — new: route registration.
- `src/routes/index.ts` — modified: mount the new route.
- `.env` — modified (by you): add `STORMGLASS_API_KEY`.

**Frontend (`C:\Users\kianr\CordovaRiskQ-Frontend`, this repo):**
- `services/tide.service.ts` — new: `getTideStatus()`.
- `app/(tabs)/home.tsx` — modified: fetch real tide data, remove `MOCK_TIDE`.

---

### Task 1: Backend — `TideStatus` Prisma model + migration

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Bacnkend\prisma\schema.prisma`

**Interfaces:**
- Produces: a `prisma.tideStatus` model with fields `id: String`, `seaLevelM: Float`, `nextExtremeAt: DateTime | null`, `nextExtremeType: String | null`, `floodRiskLevel: String`, `fetchedAt: DateTime`, `updatedAt: DateTime`. Task 3 upserts/reads this via the generated Prisma client (`prisma.tideStatus.upsert(...)`, `prisma.tideStatus.findUnique(...)`).

- [ ] **Step 1: Add the model**

Append to `prisma/schema.prisma` (after the existing `Admin` model):

```prisma
model TideStatus {
  id              String    @id // always "current" -- singleton row, upserted in place
  seaLevelM       Float
  nextExtremeAt   DateTime?
  nextExtremeType String?   // "high" | "low"
  floodRiskLevel  String    // "normal" | "watch" | "warning"
  fetchedAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

- [ ] **Step 2: Run the migration**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npm run db:migrate -- --name add_tide_status
```

Expected: Prisma prints a new migration file under `prisma/migrations/`, applies it, regenerates the client, and ends with `Your database is now in sync with your schema.`

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add TideStatus model"
```

---

### Task 2: Backend — Cordova coordinates constant

**Files:**
- Create: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\constants\location.ts`

**Interfaces:**
- Produces: `CORDOVA_CENTER: { latitude: number; longitude: number }`, imported by Task 3 as `import { CORDOVA_CENTER } from "@/constants/location";`.

- [ ] **Step 1: Write the file**

```ts
// src/constants/location.ts
// Mirrors CORDOVA_CENTER in the frontend repo's constants/cordovaBarangays.ts.
// Kept in sync manually -- no shared package between the two repos today.
export const CORDOVA_CENTER = { latitude: 10.2515, longitude: 123.9499 };
```

- [ ] **Step 2: Typecheck**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/constants/location.ts
git commit -m "feat: add Cordova coordinates constant"
```

---

### Task 3: Backend — Stormglass tide service

**Files:**
- Create: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\services\tide.service.ts`

**Interfaces:**
- Consumes: `CORDOVA_CENTER` from `@/constants/location` (Task 2); `prisma` from `@/lib/prisma` (existing); `AppError` from `@/utils/AppError` (existing); `TideStatus` Prisma model (Task 1); `process.env.STORMGLASS_API_KEY`.
- Produces: `export const tideService = { refreshTideStatus, getLatest }` where:
  - `refreshTideStatus(): Promise<void>` — fetches Stormglass, upserts the singleton row. Consumed by Task 4's poller.
  - `getLatest(): Promise<{ seaLevelM: number; nextExtremeAt: Date | null; nextExtremeType: string | null; floodRiskLevel: string; updatedAt: Date }>` — reads the singleton row, throws `AppError("Tide data not yet available", 503)` if it doesn't exist yet. Consumed by Task 5's controller.

- [ ] **Step 1: Add your Stormglass API key to `.env`**

You mentioned you already have a Stormglass account/key. Open `C:\Users\kianr\CordovaRiskQ-Bacnkend\.env` and add a line (alongside the existing `DATABASE_URL`/`JWT_SECRET`/etc.):

```
STORMGLASS_API_KEY=<your key here>
```

No code change needed to load it — `src/lib/prisma.ts` already does `import "dotenv/config"`, which runs before any service code via the existing import chain.

- [ ] **Step 2: Write the service**

```ts
// src/services/tide.service.ts
import { CORDOVA_CENTER } from "@/constants/location";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/AppError";

const STORMGLASS_BASE_URL = "https://api.stormglass.io/v2";

type StormglassSeaLevelResponse = {
    data: { time: string; sg: number }[];
};

type StormglassExtremesResponse = {
    data: { time: string; type: "high" | "low"; height: number }[];
};

// Response shapes per Stormglass v2 docs (tide/sea-level/point and
// tide/extremes/point). If your account returns a different source key
// than "sg" for sea level, adjust seaLevelPoint.sg below after checking
// the raw response in Task 4/5's manual verification step.
async function fetchFromStormglass(): Promise<{
    seaLevelM: number;
    nextExtremeAt: Date | null;
    nextExtremeType: "high" | "low" | null;
}> {
    const apiKey = process.env.STORMGLASS_API_KEY;
    if (!apiKey) {
        throw new AppError("STORMGLASS_API_KEY is not set", 500);
    }

    const now = new Date();
    const oneHourOut = new Date(now.getTime() + 60 * 60 * 1000);
    const twoDaysOut = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const headers = { Authorization: apiKey };

    const seaLevelUrl =
        `${STORMGLASS_BASE_URL}/tide/sea-level/point` +
        `?lat=${CORDOVA_CENTER.latitude}&lng=${CORDOVA_CENTER.longitude}` +
        `&start=${now.toISOString()}&end=${oneHourOut.toISOString()}`;
    const extremesUrl =
        `${STORMGLASS_BASE_URL}/tide/extremes/point` +
        `?lat=${CORDOVA_CENTER.latitude}&lng=${CORDOVA_CENTER.longitude}` +
        `&start=${now.toISOString()}&end=${twoDaysOut.toISOString()}`;

    const [seaLevelRes, extremesRes] = await Promise.all([
        fetch(seaLevelUrl, { headers }),
        fetch(extremesUrl, { headers }),
    ]);

    if (!seaLevelRes.ok || !extremesRes.ok) {
        throw new AppError(
            `Stormglass request failed (sea-level ${seaLevelRes.status}, extremes ${extremesRes.status})`,
            502,
        );
    }

    const seaLevelBody = (await seaLevelRes.json()) as StormglassSeaLevelResponse;
    const extremesBody = (await extremesRes.json()) as StormglassExtremesResponse;

    const seaLevelPoint = seaLevelBody.data[0];
    if (!seaLevelPoint) {
        throw new AppError("Stormglass returned no sea-level data", 502);
    }

    const nextExtreme = extremesBody.data[0];

    return {
        seaLevelM: seaLevelPoint.sg,
        nextExtremeAt: nextExtreme ? new Date(nextExtreme.time) : null,
        nextExtremeType: nextExtreme ? nextExtreme.type : null,
    };
}

// Placeholder thresholds -- not calibrated against real Cordova flood-stage
// data yet. Retune once MDRRMO/PAGASA figures are available.
function deriveFloodRiskLevel(seaLevelM: number): "normal" | "watch" | "warning" {
    if (seaLevelM > 1.0) return "warning";
    if (seaLevelM > 0.6) return "watch";
    return "normal";
}

async function refreshTideStatus(): Promise<void> {
    const { seaLevelM, nextExtremeAt, nextExtremeType } = await fetchFromStormglass();
    const floodRiskLevel = deriveFloodRiskLevel(seaLevelM);

    await prisma.tideStatus.upsert({
        where: { id: "current" },
        create: {
            id: "current",
            seaLevelM,
            nextExtremeAt,
            nextExtremeType,
            floodRiskLevel,
        },
        update: {
            seaLevelM,
            nextExtremeAt,
            nextExtremeType,
            floodRiskLevel,
        },
    });
}

async function getLatest() {
    const row = await prisma.tideStatus.findUnique({ where: { id: "current" } });
    if (!row) {
        throw new AppError("Tide data not yet available", 503);
    }

    return {
        seaLevelM: row.seaLevelM,
        nextExtremeAt: row.nextExtremeAt,
        nextExtremeType: row.nextExtremeType,
        floodRiskLevel: row.floodRiskLevel,
        updatedAt: row.updatedAt,
    };
}

export const tideService = { refreshTideStatus, getLatest };
```

- [ ] **Step 3: Typecheck**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npx tsc --noEmit -p .
```

Expected: no errors. (There's no HTTP route wired to this yet, so full runtime behavior — an actual Stormglass call and DB write — gets exercised in Task 4's manual verification, once the poller calls `refreshTideStatus()` on server start.)

- [ ] **Step 4: Commit**

```bash
git add src/services/tide.service.ts
git commit -m "feat: add tide service (Stormglass fetch + upsert + read)"
```

---

### Task 4: Backend — hourly poller wired into server startup

**Files:**
- Create: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\lib\tidePolling.ts`
- Modify: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\server.ts`

**Interfaces:**
- Consumes: `tideService.refreshTideStatus()` (Task 3).
- Produces: `export function startTidePolling(): void`, called once from `server.ts`.

- [ ] **Step 1: Write the poller**

```ts
// src/lib/tidePolling.ts
import { tideService } from "@/services/tide.service";

const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function pollOnce() {
    tideService.refreshTideStatus().catch((error) => {
        console.error("Tide poll failed:", error);
    });
}

export function startTidePolling(): void {
    pollOnce();
    setInterval(pollOnce, POLL_INTERVAL_MS);
}
```

- [ ] **Step 2: Wire it into server startup**

In `src/server.ts`, replace the full file with:

```ts
import app from "./app";
import { startTidePolling } from "@/lib/tidePolling";

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startTidePolling();
});
```

- [ ] **Step 3: Typecheck**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 4: Run and verify the poll happens**

```bash
npm run dev
```

Expected: `Server running on port 8000` is logged, and the process keeps running without crashing. If `STORMGLASS_API_KEY` is set correctly and your network reaches Stormglass, no error is logged. If something's wrong with the key/request, you'll see `Tide poll failed: ...` logged — the server should still stay up (the error is caught, not thrown). Leave this running for Task 5's curl check; it's how `TideStatus` first gets a row written.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tidePolling.ts src/server.ts
git commit -m "feat: poll Stormglass for tide data hourly on server start"
```

---

### Task 5: Backend — `GET /api/tide` endpoint

**Files:**
- Create: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\controllers\tide.controller.ts`
- Create: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\routes\tide.routes.ts`
- Modify: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\routes\index.ts`

**Interfaces:**
- Consumes: `tideService.getLatest()` (Task 3); `asyncHandler` from `@/utils/asyncHandler` (existing).
- Produces: `GET /api/tide` → `200 { success: true, tide: { seaLevelM, nextExtremeAt, nextExtremeType, floodRiskLevel, updatedAt } }`, or `503 { success: false, message: "Tide data not yet available" }` if no row exists yet. Consumed by Task 6's frontend service.

- [ ] **Step 1: Write the controller**

```ts
// src/controllers/tide.controller.ts
import { Request, Response } from "express";
import { tideService } from "@/services/tide.service";
import { asyncHandler } from "@/utils/asyncHandler";

export const tideController = {
    getStatus: asyncHandler(async (req: Request, res: Response) => {
        const tide = await tideService.getLatest();
        res.status(200).json({ success: true, tide });
    }),
};
```

- [ ] **Step 2: Write the route**

```ts
// src/routes/tide.routes.ts
import { Router } from "express";
import { tideController } from "@/controllers/tide.controller";

const router = Router();

// Public safety data -- no authenticate middleware.
router.get("/tide", tideController.getStatus);

export default router;
```

- [ ] **Step 3: Mount it**

In `src/routes/index.ts`, add the import and mount call:

```ts
import { Router } from "express";
import testRoutes from "@/routes/test.routes";
import authRoutes from "@/routes/auth.routes";
import userRoutes from "@/routes/user.routes";
import adminAuthRoutes from "@/routes/admin-auth.routes";
import tideRoutes from "@/routes/tide.routes";

const router = Router();

router.use(testRoutes);
router.use(authRoutes);
router.use(userRoutes);
router.use(adminAuthRoutes);
router.use(tideRoutes);

export default router;
```

- [ ] **Step 4: Typecheck**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 5: Run and verify with curl**

If the server from Task 4 isn't still running:

```bash
npm run dev
```

Then, in another terminal:

```bash
curl http://localhost:8000/api/tide
```

Expected: a `200` JSON response shaped like:

```json
{
  "success": true,
  "tide": {
    "seaLevelM": 0.42,
    "nextExtremeAt": "2026-08-27T18:12:00.000Z",
    "nextExtremeType": "low",
    "floodRiskLevel": "normal",
    "updatedAt": "2026-08-27T09:00:00.000Z"
  }
}
```

(Exact numbers will differ.) If you instead get `503 { "success": false, "message": "Tide data not yet available" }`, the first poll hasn't completed or failed — check the server log from Task 4's step 4 for a `Tide poll failed: ...` line and fix the underlying issue (usually the API key) before continuing.

- [ ] **Step 6: Commit**

```bash
git add src/controllers/tide.controller.ts src/routes/tide.routes.ts src/routes/index.ts
git commit -m "feat: add GET /api/tide endpoint"
```

---

### Task 6: Frontend — `tide.service.ts`

**Files:**
- Create: `C:\Users\kianr\CordovaRiskQ-Frontend\services\tide.service.ts`

**Interfaces:**
- Consumes: `apiGet` from `@/services/api` (existing).
- Produces: `export type TideStatus = { seaLevelM: number; nextExtremeAt: string | null; nextExtremeType: "high" | "low" | null; floodRiskLevel: "normal" | "watch" | "warning"; updatedAt: string }` and `export async function getTideStatus(): Promise<TideStatus>`. Consumed by Task 7's `home.tsx`.

- [ ] **Step 1: Write the service**

```ts
// services/tide.service.ts
import { apiGet } from "./api";

export type TideStatus = {
  seaLevelM: number;
  nextExtremeAt: string | null;
  nextExtremeType: "high" | "low" | null;
  floodRiskLevel: "normal" | "watch" | "warning";
  updatedAt: string;
};

export async function getTideStatus(): Promise<TideStatus> {
  const response = await apiGet<{ success: true; tide: TideStatus }>("/api/tide");
  return response.tide;
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
cd C:\Users\kianr\CordovaRiskQ-Frontend
npx tsc --noEmit -p .
npx eslint services/tide.service.ts
```

Expected: no errors from either command.

- [ ] **Step 3: Commit**

```bash
git add services/tide.service.ts
git commit -m "feat: add tide.service.ts"
```

---

### Task 7: Frontend — wire `home.tsx` to real tide data

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Frontend\app\(tabs)\home.tsx`

**Interfaces:**
- Consumes: `getTideStatus`, `type TideStatus` from `@/services/tide.service` (Task 6); existing `formatTime` from `@/utils/formatter`; existing `TideBanner` component (`components/home/TideBanner.tsx`, props unchanged: `level`, `detail`, `temperatureC`, `weatherDescription`, `floodMessage`, `updatedLabel`).

- [ ] **Step 1: Remove `MOCK_TIDE` and add tide state + fetch**

In `app/(tabs)/home.tsx`:

1. Add the import:

```ts
import { getTideStatus, type TideStatus } from "@/services/tide.service";
import { formatTime } from "@/utils/formatter";
```

2. Delete the `MOCK_TIDE` constant entirely (keep `MOCK_LOCATION`, `MOCK_TEMPERATURE_C`, `MOCK_WEATHER_DESCRIPTION`, `MOCK_ADVISORY` — those stay mocked per the spec's scope).

3. Add a `tideStatus` state next to the existing `nearestCenter` state:

```ts
const [tideStatus, setTideStatus] = useState<TideStatus | null>(null);
```

4. In the existing `useEffect`, add a fetch alongside the notifications/evacuation-centers ones (same silent-catch convention):

```ts
getTideStatus()
  .then(setTideStatus)
  .catch(() => {});
```

- [ ] **Step 2: Add the floodMessage map and format the `TideBanner` props**

Above the `HomeScreen` component (near the other module-level constants), add:

```ts
const FLOOD_MESSAGE: Record<TideStatus["floodRiskLevel"], string> = {
  normal: "No flood risk detected in your area",
  watch: "Elevated water levels — stay alert",
  warning: "Flood risk in low-lying areas — avoid the causeway",
};

function formatTideDetail(tide: TideStatus): string {
  const seaLevelText = `${tide.seaLevelM.toFixed(1)} m`;
  if (!tide.nextExtremeAt || !tide.nextExtremeType) {
    return seaLevelText;
  }
  const trend = tide.nextExtremeType === "low" ? "falling" : "rising";
  return `${seaLevelText} · ${trend} until ${formatTime(tide.nextExtremeAt)}`;
}
```

- [ ] **Step 3: Render `TideBanner` conditionally with the real data**

Replace the existing `<TideBanner ... />` usage (which currently reads from `MOCK_TIDE`) with:

```tsx
{tideStatus ? (
  <TideBanner
    level={tideStatus.floodRiskLevel}
    detail={formatTideDetail(tideStatus)}
    temperatureC={MOCK_TEMPERATURE_C}
    weatherDescription={MOCK_WEATHER_DESCRIPTION}
    floodMessage={FLOOD_MESSAGE[tideStatus.floodRiskLevel]}
    updatedLabel={`Updated ${formatTime(tideStatus.updatedAt)}`}
  />
) : null}
```

- [ ] **Step 4: Typecheck and lint**

```bash
cd C:\Users\kianr\CordovaRiskQ-Frontend
npx tsc --noEmit -p .
npx eslint "app/(tabs)/home.tsx"
```

Expected: no errors.

- [ ] **Step 5: Run against the local backend and verify**

With the backend from Task 5 running (`npm run dev` in `CordovaRiskQ-Bacnkend`), run the app (`npx expo start`, on a device/simulator — not `--web`, which is broken for this project for unrelated `@rnmapbox/maps` reasons) and open the Home tab.

Expected: the tide card shows real values matching Task 5's curl output (e.g. the same `seaLevelM`, `floodRiskLevel` as `level`, an "Updated <time>" matching `updatedAt`) instead of the old hardcoded "Normal / 0.4 m · falling until 11:40". Then stop the backend server and reload the app: the tide card should simply not render (no crash, no error text) — everything else on Home still works.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/home.tsx"
git commit -m "feat: wire Home tide card to GET /api/tide"
```

---

## Self-Review Notes

- **Spec coverage:** all 5 scope items from the spec map to tasks — `TideStatus` model (Task 1), poller (Tasks 2–4), endpoint (Task 5), `tide.service.ts` (Task 6), `home.tsx` wiring (Task 7). Out-of-scope items (weather/temperature, multi-location, calibrated thresholds, realtime push, automated tests) are untouched, matching the spec.
- **Placeholder scan:** no TBD/TODO; every step has real code or an exact command with exact expected output.
- **Type consistency:** `floodRiskLevel: "normal" | "watch" | "warning"` matches `TideBanner`'s existing `TideLevel` export used by Task 7; `tideService.getLatest()`'s return shape (Task 3) matches exactly what Task 5's controller destructures into the `tide` response field, which matches Task 6's `TideStatus` type field-for-field.
