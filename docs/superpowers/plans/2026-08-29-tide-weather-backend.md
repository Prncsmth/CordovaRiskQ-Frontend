# Tide-Weather Backend Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Home's hardcoded `MOCK_TEMPERATURE_C`/`MOCK_WEATHER_DESCRIPTION` with real weather data, riding along on the tide feature's existing hourly Stormglass poll and `TideStatus` singleton row rather than standing up a separate resource.

**Architecture:** `TideStatus` gains `airTemperatureC`/`weatherDescription` columns; the existing `fetchFromStormglass()` adds a third parallel call to Stormglass's weather endpoint; the existing `GET /api/tide` response carries the new fields with no new route. Frontend extends its existing `TideStatus` type and passes real values into the already-generic `TideBanner` props.

**Tech Stack:** Backend: Express 5, Prisma/Postgres, TypeScript (ESM, `@/` path aliases), Node's built-in `fetch`. Frontend: Expo Router, React Native, existing `services/tide.service.ts`.

**Spec:** `docs/superpowers/specs/2026-08-29-tide-weather-backend-design.md`

## Global Constraints

- No new endpoint, no new Prisma model — everything folds into the existing `TideStatus` row, `refreshTideStatus()`/`getLatest()`, and `GET /api/tide`.
- Stormglass calls use Node's built-in `fetch` with a 15s timeout (`AbortSignal.timeout(15_000)`), matching the existing sea-level/extremes calls.
- The existing `FRESHNESS_WINDOW_MS` (1 hour) skip-if-recent guard in `refreshTideStatus()` is untouched — it already covers the weather fields once they're part of the same upsert.
- `weatherDescription`'s cloud-cover/precipitation thresholds are an explicitly-flagged placeholder, uncalibrated — same status as the existing `deriveFloodRiskLevel` thresholds.
- `PartlyCloudyIcon` and `TideBanner`'s props/rendering are **not modified** — out of scope per spec, they already accept freeform `temperatureC`/`weatherDescription` values.
- Neither repo has an automated test framework — every task is verified via `tsc`/`eslint` plus a concrete runtime check (curl or running the app), matching the tide-level-backend plan's convention.
- `STORMGLASS_API_KEY` is already set in the backend's `.env` (from the prior tide feature) — no new env var.

---

## File Structure

**Backend (`C:\Users\kianr\CordovaRiskQ-Bacnkend`):**
- `prisma/schema.prisma` — modified: `TideStatus` gains `airTemperatureC`, `weatherDescription`.
- `src/services/tide.service.ts` — modified: `fetchFromStormglass()` adds the weather call; new `deriveWeatherDescription()`; `refreshTideStatus()`/`getLatest()` carry the two new fields.

**Frontend (`C:\Users\kianr\CordovaRiskQ-Frontend`, this repo):**
- `services/tide.service.ts` — modified: `TideStatus` type gains the two fields; response guard extended.
- `app/(tabs)/home.tsx` — modified: remove `MOCK_TEMPERATURE_C`/`MOCK_WEATHER_DESCRIPTION`, pass real values to `TideBanner`.

---

### Task 1: Backend — extend the `TideStatus` model

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Bacnkend\prisma\schema.prisma`

**Interfaces:**
- Produces: `prisma.tideStatus` rows gain `airTemperatureC: Float`, `weatherDescription: String`. Task 2 upserts/reads these via the generated Prisma client.

- [ ] **Step 1: Delete the existing singleton row**

The table currently has exactly one row (`id: "current"`) from the prior tide feature. Adding two non-nullable columns to a table with existing data would force a backfill default; instead, delete the row so the migration applies cleanly and the poller's existing immediate on-startup fetch (`startTidePolling()` → `refreshTideStatus()`) repopulates it in full on the next server start — no fabricated placeholder temperature ever reaches a client.

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
printf 'DELETE FROM "TideStatus";\n' | npx prisma db execute --stdin --schema=prisma/schema.prisma
```

Expected: command completes with no error (or reports 0/1 rows affected — either is fine).

- [ ] **Step 2: Update the model**

In `prisma/schema.prisma`, replace the existing `TideStatus` model with:

```prisma
model TideStatus {
  id                 String    @id // always "current" -- singleton row, upserted in place
  seaLevelM          Float
  nextExtremeAt      DateTime?
  nextExtremeType    String?   // "high" | "low"
  floodRiskLevel     String    // "normal" | "watch" | "warning"
  airTemperatureC    Float
  weatherDescription String    // "Clear skies" | "Partly cloudy" | "Cloudy" | "Light rain" | "Heavy rain"
  fetchedAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
}
```

- [ ] **Step 3: Run the migration**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npm run db:migrate -- --name add_weather_to_tide_status
```

Expected: Prisma prints a new migration file under `prisma/migrations/`, applies it with no prompt for a default value (the table is empty from Step 1), regenerates the client, and ends with `Your database is now in sync with your schema.`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add weather fields to TideStatus"
```

---

### Task 2: Backend — fetch, derive, and serve weather data

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\services\tide.service.ts`

**Interfaces:**
- Consumes: `CORDOVA_CENTER` from `@/constants/location` (existing); `prisma` from `@/lib/prisma` (existing); `AppError` from `@/utils/AppError` (existing); `TideStatus` Prisma model with the new fields (Task 1).
- Produces: `tideService.getLatest()`'s return type gains `airTemperatureC: number`, `weatherDescription: string`. Consumed by Task 4's frontend type (the controller already spreads `getLatest()`'s return into the response — no controller change needed).

- [ ] **Step 1: Confirm the live Stormglass weather response shape**

Before changing code, verify the actual field names/units against the real API (the exact nesting — e.g. whether it's `{"sg": 27.3}` per parameter like the existing sea-level call, under a different source key, or shaped differently — isn't confirmed from this session). With the backend's `.env` `STORMGLASS_API_KEY` value:

```bash
curl "https://api.stormglass.io/v2/weather/point?lat=10.2515&lng=123.9499&params=airTemperature,cloudCover,precipitation&start=$(date -u +%Y-%m-%dT%H:%M:%S)&end=$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%S)" -H "Authorization: <your STORMGLASS_API_KEY>"
```

Expected: a `200` JSON body with a `data` array; each entry has `airTemperature`, `cloudCover`, `precipitation` keys, each an object with at least one numeric source key (e.g. `sg`). If the actual shape differs from what Step 2 below assumes (source key isn't `sg`, or a parameter is missing/nested differently), adjust the `StormglassWeatherResponse` type and the extraction in `fetchFromStormglass()` accordingly before proceeding — this mirrors the same kind of adjustment already noted in this file's comment above `seaLevelPoint.sg`.

- [ ] **Step 2: Replace `tide.service.ts` with the extended version**

```ts
// src/services/tide.service.ts
import { CORDOVA_CENTER } from "@/constants/location";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/AppError";

const STORMGLASS_BASE_URL = "https://api.stormglass.io/v2";

// Skip a redundant Stormglass call if we already have a recent reading --
// guards against `tsx watch` restarting the server (and re-polling) on
// every file save during development, and against overlapping polls
// burning quota if a previous run is slow.
const FRESHNESS_WINDOW_MS = 60 * 60 * 1000; // 1 hour

type StormglassSeaLevelResponse = {
    data: { time: string; sg: number }[];
};

type StormglassExtremesResponse = {
    data: { time: string; type: "high" | "low"; height: number }[];
};

type StormglassWeatherResponse = {
    data: {
        time: string;
        airTemperature: { sg: number };
        cloudCover: { sg: number };
        precipitation: { sg: number };
    }[];
};

// Response shapes per Stormglass v2 docs (tide/sea-level/point,
// tide/extremes/point, weather/point). If your account returns a different
// source key than "sg" for any parameter, adjust the extraction below after
// checking the raw response (see this task's Step 1).
async function fetchFromStormglass(): Promise<{
    seaLevelM: number;
    nextExtremeAt: Date | null;
    nextExtremeType: "high" | "low" | null;
    airTemperatureC: number;
    cloudCoverPct: number;
    precipitationMm: number;
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
    const weatherUrl =
        `${STORMGLASS_BASE_URL}/weather/point` +
        `?lat=${CORDOVA_CENTER.latitude}&lng=${CORDOVA_CENTER.longitude}` +
        `&start=${now.toISOString()}&end=${oneHourOut.toISOString()}` +
        `&params=airTemperature,cloudCover,precipitation`;

    const [seaLevelRes, extremesRes, weatherRes] = await Promise.all([
        fetch(seaLevelUrl, { headers, signal: AbortSignal.timeout(15_000) }),
        fetch(extremesUrl, { headers, signal: AbortSignal.timeout(15_000) }),
        fetch(weatherUrl, { headers, signal: AbortSignal.timeout(15_000) }),
    ]);

    if (!seaLevelRes.ok || !extremesRes.ok || !weatherRes.ok) {
        throw new AppError(
            `Stormglass request failed (sea-level ${seaLevelRes.status}, extremes ${extremesRes.status}, weather ${weatherRes.status})`,
            502,
        );
    }

    const seaLevelBody = (await seaLevelRes.json()) as StormglassSeaLevelResponse;
    const extremesBody = (await extremesRes.json()) as StormglassExtremesResponse;
    const weatherBody = (await weatherRes.json()) as StormglassWeatherResponse;

    const seaLevelPoint = seaLevelBody.data?.[0];
    if (!seaLevelPoint || typeof seaLevelPoint.sg !== "number") {
        throw new AppError("Stormglass returned malformed sea-level data", 502);
    }

    const weatherPoint = weatherBody.data?.[0];
    if (
        !weatherPoint ||
        typeof weatherPoint.airTemperature?.sg !== "number" ||
        typeof weatherPoint.cloudCover?.sg !== "number" ||
        typeof weatherPoint.precipitation?.sg !== "number"
    ) {
        throw new AppError("Stormglass returned malformed weather data", 502);
    }

    const nextExtreme = Array.isArray(extremesBody.data) ? extremesBody.data[0] : undefined;

    return {
        seaLevelM: seaLevelPoint.sg,
        nextExtremeAt: nextExtreme ? new Date(nextExtreme.time) : null,
        nextExtremeType: nextExtreme ? nextExtreme.type : null,
        airTemperatureC: weatherPoint.airTemperature.sg,
        cloudCoverPct: weatherPoint.cloudCover.sg,
        precipitationMm: weatherPoint.precipitation.sg,
    };
}

// Placeholder thresholds -- not calibrated against real Cordova flood-stage
// data yet. Retune once MDRRMO/PAGASA figures are available.
function deriveFloodRiskLevel(seaLevelM: number): "normal" | "watch" | "warning" {
    if (seaLevelM > 1.0) return "warning";
    if (seaLevelM > 0.6) return "watch";
    return "normal";
}

// Placeholder thresholds -- not calibrated against real conditions. Retune
// once real weather-condition data is available to compare against.
function deriveWeatherDescription(cloudCoverPct: number, precipitationMm: number): string {
    if (precipitationMm > 4) return "Heavy rain";
    if (precipitationMm > 0.5) return "Light rain";
    if (cloudCoverPct > 70) return "Cloudy";
    if (cloudCoverPct > 30) return "Partly cloudy";
    return "Clear skies";
}

async function refreshTideStatus(): Promise<void> {
    const existing = await prisma.tideStatus.findUnique({ where: { id: "current" } });
    if (existing && Date.now() - existing.updatedAt.getTime() < FRESHNESS_WINDOW_MS) {
        return;
    }

    const { seaLevelM, nextExtremeAt, nextExtremeType, airTemperatureC, cloudCoverPct, precipitationMm } =
        await fetchFromStormglass();
    const floodRiskLevel = deriveFloodRiskLevel(seaLevelM);
    const weatherDescription = deriveWeatherDescription(cloudCoverPct, precipitationMm);
    const fetchedAt = new Date();

    await prisma.tideStatus.upsert({
        where: { id: "current" },
        create: {
            id: "current",
            seaLevelM,
            nextExtremeAt,
            nextExtremeType,
            floodRiskLevel,
            airTemperatureC,
            weatherDescription,
            fetchedAt,
        },
        update: {
            seaLevelM,
            nextExtremeAt,
            nextExtremeType,
            floodRiskLevel,
            airTemperatureC,
            weatherDescription,
            fetchedAt,
        },
    });
}

async function getLatest(): Promise<{
    seaLevelM: number;
    nextExtremeAt: Date | null;
    nextExtremeType: string | null;
    floodRiskLevel: string;
    airTemperatureC: number;
    weatherDescription: string;
    updatedAt: Date;
}> {
    const row = await prisma.tideStatus.findUnique({ where: { id: "current" } });
    if (!row) {
        throw new AppError("Tide data not yet available", 503);
    }

    return {
        seaLevelM: row.seaLevelM,
        nextExtremeAt: row.nextExtremeAt,
        nextExtremeType: row.nextExtremeType,
        floodRiskLevel: row.floodRiskLevel,
        airTemperatureC: row.airTemperatureC,
        weatherDescription: row.weatherDescription,
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

Expected: no errors.

- [ ] **Step 4: Run and verify with curl**

```bash
npm run dev
```

Expected: `Server running on port 8000` logged, no crash. Wait for the first poll (immediate on startup), then in another terminal:

```bash
curl http://localhost:8000/api/tide
```

Expected: `200` JSON including `airTemperatureC` (a plausible Cordova value, roughly 24–34) and `weatherDescription` (one of `"Clear skies"`, `"Partly cloudy"`, `"Cloudy"`, `"Light rain"`, `"Heavy rain"`), alongside the existing tide fields. If `STORMGLASS_API_KEY` or the weather call has a problem, the server logs `Tide poll failed: ...` and stays up — fix the underlying issue before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/services/tide.service.ts
git commit -m "feat: fold weather data into the tide poller"
```

---

### Task 3: Frontend — extend `tide.service.ts`

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Frontend\services\tide.service.ts`

**Interfaces:**
- Consumes: `apiGet` from `@/services/api` (existing, unchanged).
- Produces: `TideStatus` type gains `airTemperatureC: number`, `weatherDescription: string`. Consumed by Task 4's `home.tsx`.

- [ ] **Step 1: Update the type and guard**

Replace `services/tide.service.ts` with:

```ts
// services/tide.service.ts
import { apiGet } from "./api";

export type TideStatus = {
  seaLevelM: number;
  nextExtremeAt: string | null;
  nextExtremeType: "high" | "low" | null;
  floodRiskLevel: "normal" | "watch" | "warning";
  airTemperatureC: number;
  weatherDescription: string;
  updatedAt: string;
};

export async function getTideStatus(): Promise<TideStatus> {
  const response = await apiGet<{ success: true; tide: TideStatus }>("/api/tide");
  const tide = response.tide;
  if (!tide || typeof tide.seaLevelM !== "number" || typeof tide.airTemperatureC !== "number") {
    throw new Error("Malformed tide response from server");
  }
  return tide;
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
git commit -m "feat: add weather fields to TideStatus type"
```

---

### Task 4: Frontend — wire `home.tsx` to real weather data

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Frontend\app\(tabs)\home.tsx`

**Interfaces:**
- Consumes: `TideStatus` (Task 3) — `tideStatus.airTemperatureC`, `tideStatus.weatherDescription`; existing `TideBanner` component (`components/home/TideBanner.tsx`, props unchanged: `temperatureC: number`, `weatherDescription: string`).

- [ ] **Step 1: Remove the mock constants**

In `app/(tabs)/home.tsx`, delete these two lines:

```ts
const MOCK_TEMPERATURE_C = 29;
const MOCK_WEATHER_DESCRIPTION = "Partly cloudy";
```

- [ ] **Step 2: Pass real values into `TideBanner`**

In the existing `<TideBanner ... />` call (already conditional on `tideStatus` being loaded), replace:

```tsx
temperatureC={MOCK_TEMPERATURE_C}
weatherDescription={MOCK_WEATHER_DESCRIPTION}
```

with:

```tsx
temperatureC={Math.round(tideStatus.airTemperatureC)}
weatherDescription={tideStatus.weatherDescription}
```

(This sits inside the existing `tideStatus ? (...) : null` conditional / prop block, so `tideStatus` is already known non-null at this point — no new null check needed.)

- [ ] **Step 3: Typecheck and lint**

```bash
cd C:\Users\kianr\CordovaRiskQ-Frontend
npx tsc --noEmit -p .
npx eslint "app/(tabs)/home.tsx"
```

Expected: no errors.

- [ ] **Step 4: Run against the local backend and verify**

With the backend from Task 2 running, run the app (`npx expo start`, on a device/simulator — not `--web`, broken for this project for unrelated `@rnmapbox/maps` reasons) and open the Home tab.

Expected: the tide card's temperature/description show real Stormglass-derived values instead of the old hardcoded "29° / Partly cloudy". Stop the backend and reload the app: the whole tide card (tide and weather together) simply doesn't render — no partial card, no crash.

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/home.tsx"
git commit -m "feat: wire Home tide card to real weather data"
```

---

## Self-Review Notes

- **Spec coverage:** all 6 scope items from the spec map to tasks — `TideStatus` model extension (Task 1), Stormglass weather fetch + derivation + upsert/read (Task 2), `GET /api/tide` response (automatic via Task 2, no controller change), frontend `TideStatus` type (Task 3), `home.tsx` wiring (Task 4). Out-of-scope items (dynamic icon, separate `WeatherStatus` resource, calibrated thresholds, automated tests) are untouched, matching the spec.
- **Placeholder scan:** no TBD/TODO; every step has real code or an exact command with exact expected output. Task 2 Step 1's live-verification step is explicitly a manual check with instructions to adjust the following step's code if needed — not a placeholder, since the spec itself flags this as an open question that can only be resolved against the live API.
- **Type consistency:** `fetchFromStormglass()`'s return fields (Task 2) match exactly what `refreshTideStatus()` destructures and what `deriveWeatherDescription()` consumes; `getLatest()`'s return shape matches field-for-field what the frontend `TideStatus` type (Task 3) expects, which matches what `home.tsx` (Task 4) reads (`airTemperatureC`, `weatherDescription`) — no mismatched names across tasks.
