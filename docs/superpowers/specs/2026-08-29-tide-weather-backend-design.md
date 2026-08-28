# Tide-Weather Backend Extension — Design

**Date:** 2026-08-29
**Repos touched:** `CordovaRiskQ-Frontend` (this repo) and `CordovaRiskQ-Bacnkend` (sibling repo, `C:\Users\kianr\CordovaRiskQ-Bacnkend` — Express + Prisma/Postgres + JWT, TypeScript, ESM with `@/` path aliases).
**Builds on:** [2026-08-27-tide-level-backend-design.md](./2026-08-27-tide-level-backend-design.md), which shipped the `TideStatus` singleton + 8-hourly Stormglass poller + `GET /api/tide` and explicitly deferred weather as out of scope.

## Purpose

The Home screen's tide card (`components/home/TideBanner.tsx`) shows real tide data but still renders hardcoded `MOCK_TEMPERATURE_C`/`MOCK_WEATHER_DESCRIPTION` for its temperature/weather readout. This spec replaces those with real data from the same Stormglass account, riding along on the existing 8-hourly poll rather than standing up a separate resource: one combined poll, one cached row, every client reads the same result.

## Scope

1. Backend: extend the `TideStatus` Prisma model with `airTemperatureC` and `weatherDescription`.
2. Backend: extend `fetchFromStormglass()` to also call `/v2/weather/point`, in the same `Promise.all` as the existing sea-level/extremes calls.
3. Backend: a threshold-based `deriveWeatherDescription()`, mirroring the existing `deriveFloodRiskLevel()`.
4. Backend: `GET /api/tide`'s `tide` object gains the two new fields — no new endpoint.
5. Frontend: `services/tide.service.ts`'s `TideStatus` type gains the two fields.
6. Frontend: `app/(tabs)/home.tsx` drops `MOCK_TEMPERATURE_C`/`MOCK_WEATHER_DESCRIPTION` and passes real values to `TideBanner`.

## Out of scope

- **A dynamic weather icon.** `PartlyCloudyIcon` is a single fixed sun-behind-cloud graphic today and stays that way — real temperature/description text ships now, a condition-driven icon set is separate future work (explicitly deferred per brainstorming discussion).
- **A separate `WeatherStatus` resource.** Weather is folded into the existing `TideStatus` row/poller/endpoint rather than getting its own model, poll cycle, and route.
- **Calibrated weather thresholds.** Like `deriveFloodRiskLevel`'s existing flood cutoffs, `deriveWeatherDescription`'s cloud-cover/precipitation bands below are a placeholder, not tuned against real conditions.
- **Automated tests.** Same as the parent spec — neither repo has a test framework; verification is manual.

## Architecture

### Backend

**Prisma schema** (`prisma/schema.prisma`) — `TideStatus` gains two fields:

```prisma
model TideStatus {
  id                String    @id
  seaLevelM         Float
  nextExtremeAt     DateTime?
  nextExtremeType   String?
  floodRiskLevel    String
  airTemperatureC   Float
  weatherDescription String   // "Clear skies" | "Partly cloudy" | "Cloudy" | "Light rain" | "Heavy rain"
  fetchedAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

Adding two non-nullable columns to a table that already has the one singleton row would normally force a backfill value. Sidestep that instead of fabricating a fake temperature: **before** running the migration, delete the existing row (`DELETE FROM "TideStatus";` via `psql`/Prisma Studio — there is exactly one, and `refreshTideStatus()`'s freshness check (`FRESHNESS_WINDOW_MS`, 1 hour) would otherwise skip a real re-fetch if the row was updated recently, leaving fabricated defaults live for up to an hour). With the table empty, `npm run db:migrate -- --name add_weather_to_tide_status` adds the columns with no prompt for a default, and `startTidePolling()`'s existing immediate on-startup fetch repopulates the row in full on the very next server start.

**`src/services/tide.service.ts`** — `fetchFromStormglass()` adds a third parallel call:

```
weatherUrl = `${STORMGLASS_BASE_URL}/weather/point?lat=...&lng=...&start=...&end=...`
```

using the same `now`/`oneHourOut` window already computed for sea-level. Response shape:

```ts
type StormglassWeatherResponse = {
  data: { time: string; airTemperature: { sg: number }; cloudCover: { sg: number }; precipitation: { sg: number } }[];
};
```

**Flagged assumption:** Stormglass's weather-point response nests each parameter under a source key (`sg`, `noaa`, etc.), matching the pattern the existing sea-level code already handles (`seaLevelPoint.sg`). The exact field names (`airTemperature`/`cloudCover`/`precipitation`) and units (°C, %, mm) are taken from Stormglass's general parameter naming conventions, not confirmed against a live response — this doc's implementation plan must open with a manual curl/Postman check against the real endpoint and adjust field names before wiring the rest, exactly as the original tide work flagged for `sg` on sea-level.

The existing `seaLevelRes.ok && extremesRes.ok` guard extends to `&& weatherRes.ok` — one failed leg fails the whole `fetchFromStormglass()` call, so `refreshTideStatus()` doesn't write a partial update; the cached row simply stays as the last fully-successful combined reading (same behavior the parent spec already established for the tide-only fields).

**`deriveWeatherDescription(cloudCoverPct: number, precipitationMm: number): string`** (new, alongside `deriveFloodRiskLevel`):

```ts
// Placeholder thresholds -- not calibrated. Retune once real condition data
// is available to compare against.
function deriveWeatherDescription(cloudCoverPct: number, precipitationMm: number): string {
  if (precipitationMm > 4) return "Heavy rain";
  if (precipitationMm > 0.5) return "Light rain";
  if (cloudCoverPct > 70) return "Cloudy";
  if (cloudCoverPct > 30) return "Partly cloudy";
  return "Clear skies";
}
```

`refreshTideStatus()` calls it alongside `deriveFloodRiskLevel()` and includes `airTemperatureC`/`weatherDescription` in both the `create` and `update` branches of the existing upsert.

`getLatest()`'s return type and destructuring gain the two fields — no other change to its shape or the `503`-when-empty behavior.

**Route/controller**: unchanged. `tideController.getStatus` already spreads whatever `tideService.getLatest()` returns into `{ success: true, tide }`, so the two new fields flow through automatically.

### Frontend

**`services/tide.service.ts`** — `TideStatus` type gains:

```ts
export type TideStatus = {
  seaLevelM: number;
  nextExtremeAt: string | null;
  nextExtremeType: "high" | "low" | null;
  floodRiskLevel: "normal" | "watch" | "warning";
  airTemperatureC: number;
  weatherDescription: string;
  updatedAt: string;
};
```

`getTideStatus()`'s existing malformed-response guard (`typeof tide.seaLevelM !== "number"`) extends to also check `typeof tide.airTemperatureC !== "number"`.

**`app/(tabs)/home.tsx`**: delete the `MOCK_TEMPERATURE_C`/`MOCK_WEATHER_DESCRIPTION` constants. In the existing `<TideBanner />` call (already conditional on `tideStatus`), replace:

```tsx
temperatureC={MOCK_TEMPERATURE_C}
weatherDescription={MOCK_WEATHER_DESCRIPTION}
```

with:

```tsx
temperatureC={Math.round(tideStatus.airTemperatureC)}
weatherDescription={tideStatus.weatherDescription}
```

`TideBanner`'s props (`temperatureC: number`, `weatherDescription: string`) and its rendering (`PartlyCloudyIcon` stays static, `{temperatureC}°` text) need no changes — this is a pure data-source swap.

## Data flow

1. **Backend poll** (unchanged trigger, extended payload): 8-hourly `refreshTideStatus()` now fetches sea-level + extremes + weather in one `Promise.all`, derives both `floodRiskLevel` and `weatherDescription`, upserts one row with all fields.
2. **App load** (unchanged): `home.tsx` → `getTideStatus()` → `GET /api/tide` → one JSON object with tide and weather fields together → passed to `TideBanner`.
3. **Partial Stormglass failure**: if the weather leg fails but tide would have succeeded (or vice versa), the whole poll is treated as failed — same all-or-nothing semantics as today, so the frontend never sees a row with real tide data next to stale/default weather data or vice versa.

## Error handling

Unchanged from the parent spec, extended to cover the new fields: a failed poll (any of the three Stormglass calls) is logged and swallowed by `refreshTideStatus()`, the poller keeps running every 8 hours, and `getLatest()` keeps serving the last fully-successful row. `getTideStatus()` on the frontend still only throws on a genuinely malformed response; network/`503` failures are still swallowed by `home.tsx`'s existing `.catch(() => {})`. The card itself always renders (a deliberate pre-existing safety pattern, see commit `70de2fc`) — it never disappears or hides itself. Instead, `home.tsx` degrades each `TideBanner` prop independently with per-field fallback text/values when tide data is missing or stale, so the card stays visible and honest rather than showing a partial or misleadingly-confident status.

## Testing

Manual verification, consistent with the parent spec:

**Backend**, via curl against the running dev server:
- Before writing the derivation logic, curl Stormglass's `/v2/weather/point` directly (same lat/lng/key as the existing sea-level call) and confirm the actual field names/source-key/units, adjusting `StormglassWeatherResponse` and the extraction code to match.
- After a poll, `GET /api/tide` → 200 includes `airTemperatureC` (a plausible Cordova temperature, e.g. 24–34) and `weatherDescription` (one of the five placeholder strings).
- After deleting the existing row and running the migration, confirm `GET /api/tide` returns `503` until the first poll completes, then `200` with all fields populated — no partial/null weather fields at any point.

**Frontend**, running the app against the local backend:
- Home screen's tide card shows a real temperature and weather description instead of the old hardcoded "29° / Partly cloudy".
- Stop the backend; confirm the tide card still renders with its per-field fallback text/values (no crash, no disappearing card) — same degraded-state behavior as before this change.
