# Tide Level Backend Integration — Design

**Date:** 2026-08-27
**Repos touched:** `CordovaRiskQ-Frontend` (this repo) and `CordovaRiskQ-Bacnkend` (sibling repo, `C:\Users\kianr\CordovaRiskQ-Bacnkend` — Express + Prisma/Postgres + JWT, TypeScript, ESM with `@/` path aliases).

## Purpose

The Home screen's tide card (`components/home/TideBanner.tsx`, composed in `app/(tabs)/home.tsx`) currently renders hardcoded `MOCK_TIDE` values. This spec replaces that with real tide data: the backend polls [Stormglass.io](https://stormglass.io) for Cordova, Cebu on a schedule, stores the latest reading, and serves it over a new endpoint that the app fetches on Home mount.

Temperature/weather description on the same card stay mocked — out of scope here, tracked as separate follow-up work.

## Scope

1. Backend: `TideStatus` Prisma model (singleton row).
2. Backend: a scheduled poller that fetches Stormglass sea-level + tide-extremes data for Cordova and upserts the row.
3. Backend: `GET /api/tide`, unauthenticated, returning the latest reading.
4. Frontend: `services/tide.service.ts` with `getTideStatus()`.
5. Frontend: `app/(tabs)/home.tsx` fetches on mount and passes formatted values to `TideBanner`, replacing `MOCK_TIDE`.

## Out of scope

- **Weather (temperature/"Partly cloudy") data.** `MOCK_TEMPERATURE_C`/`MOCK_WEATHER_DESCRIPTION` in `home.tsx` are untouched. A later pass can add this, likely via the same Stormglass account's weather endpoint.
- **Multi-location support.** One row, one place (Cordova). No `locationId`, no per-barangay tide data.
- **Calibrated flood-risk thresholds.** The `seaLevelM` → `floodRiskLevel` cutoffs below are a placeholder (see Architecture → Backend). Real thresholds from MDRRMO/PAGASA are future work; this spec just makes the field real and easy to retune.
- **Realtime push/websocket updates.** The app polls on screen mount only, like every other Home data source today (evacuation centers, notifications).
- **Automated tests.** Neither repo has a test setup; verification is manual (see Testing below), consistent with prior specs in this series (e.g. [2026-08-03-user-profile-backend-design.md](./2026-08-03-user-profile-backend-design.md)).

## Architecture

### Backend

**Prisma schema** (`prisma/schema.prisma`) gains:

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

A migration (`npm run db:migrate`) adds the table. The row is always upserted with `id: "current"` — there's exactly one, so no list/lookup logic is needed anywhere.

**`src/constants/location.ts`** (new, small): `CORDOVA_CENTER = { latitude: 10.2515, longitude: 123.9499 }`, mirroring the existing frontend constant in `constants/cordovaBarangays.ts` (kept in sync manually — no shared package between the two repos today).

**`src/services/tide.service.ts`** (new):
- `fetchFromStormglass()`: calls Stormglass's `/v2/tide/sea-level/point` (current interpolated sea level) and `/v2/tide/extremes/point` (next high/low) for `CORDOVA_CENTER`, using `process.env.STORMGLASS_API_KEY`. Node's built-in `fetch` is used — no new HTTP dependency.
- `deriveFloodRiskLevel(seaLevelM: number)`: placeholder thresholds — `< 0.6` → `"normal"`, `0.6–1.0` → `"watch"`, `> 1.0` → `"warning"`. Commented clearly as provisional, pending real local flood-stage data.
- `refreshTideStatus()`: calls the two functions above, upserts the `TideStatus` singleton row via Prisma.
- `getLatest()`: reads the singleton row (used by the controller). Throws `AppError(503, "Tide data not yet available")` if the table is empty (only possible in the brief window before the first poll completes after a fresh deploy).

**Scheduling**: a small `startTidePolling()` function (new `src/lib/tidePolling.ts`), called once from `src/server.ts` after `app.listen(...)`. Runs `refreshTideStatus()` immediately, then every hour via `setInterval` (no new dependency like `node-cron` — a plain interval is enough for one recurring job). Errors from a poll are logged and swallowed, not thrown — a failed refresh just means the next hourly attempt tries again, and `getLatest()` keeps serving the last good row in the meantime.

**Route/controller**, following the existing `test.*` layering exactly (see `src/routes/test.routes.ts`, `src/controllers/test.controller.ts`):
- `src/controllers/tide.controller.ts` — `getStatus`: calls `tideService.getLatest()`, returns `{ success: true, tide: {...} }`.
- `src/routes/tide.routes.ts` — `router.get("/tide", tideController.getStatus)`, **no `authenticate` middleware** (public safety data, same reasoning as evacuation centers on the frontend having no auth gate). Mounted in `src/routes/index.ts` alongside the existing route files.

**Env**: `STORMGLASS_API_KEY` added to `.env` (you already have a Stormglass account/key) and to whatever `.env.example`/docs list the other vars, alongside `DATABASE_URL`/`JWT_SECRET`/etc. No code change needed to load it — the existing vars already work via `process.env` without an explicit `dotenv.config()` call in this codebase.

### Frontend

**`services/tide.service.ts`** (new), following the existing service pattern (e.g. `services/evacuation.service.ts`):

```ts
export type TideStatus = {
  seaLevelM: number;
  nextExtremeAt: string | null;   // ISO timestamp
  nextExtremeType: "high" | "low" | null;
  floodRiskLevel: "normal" | "watch" | "warning";
  updatedAt: string;              // ISO timestamp
};

export async function getTideStatus(): Promise<TideStatus> {
  const response = await apiGet<{ success: true; tide: TideStatus }>("/api/tide");
  return response.tide;
}
```

**`app/(tabs)/home.tsx`**: add a `tideStatus` state (`TideStatus | null`), fetched in the existing `useEffect` alongside notifications/evacuation centers, via `getTideStatus().then(setTideStatus).catch(() => {})` (same silent-catch pattern already used there). Remove `MOCK_TIDE`. Render `<TideBanner />` only when `tideStatus` is non-null — same conditional-render convention already used for `nearestCenter`.

Formatting (client-side, mirroring how `HomeActionList` already formats `distanceKm.toFixed(1)` rather than trusting a pre-formatted string from the backend):

- `level`: `tideStatus.floodRiskLevel` passed straight through (already matches `TideBanner`'s existing `TideLevel` union).
- `detail`: `` `${seaLevelM.toFixed(1)} m · ${trend} until ${formatTime(nextExtremeAt)}` `` where `trend` is `nextExtremeType === "low" ? "falling" : "rising"` and `formatTime` is the existing helper in `utils/formatter.ts`. If `nextExtremeAt`/`nextExtremeType` is `null` (Stormglass gap), falls back to just `` `${seaLevelM.toFixed(1)} m` `` with no trend clause.
- `floodMessage`: a small local map keyed by `floodRiskLevel` (`normal` → "No flood risk detected in your area", `watch` → "Elevated water levels — stay alert", `warning` → "Flood risk in low-lying areas — avoid the causeway"), same spirit as `TideBanner`'s existing `LEVEL_LABEL` map.
- `updatedLabel`: `` `Updated ${formatTime(updatedAt)}` ``.

`temperatureC`/`weatherDescription` keep coming from the existing `MOCK_TEMPERATURE_C`/`MOCK_WEATHER_DESCRIPTION` constants (out of scope, see above).

## Data flow

1. **Backend startup**: `server.ts` → `startTidePolling()` → `refreshTideStatus()` runs immediately → Stormglass fetched → `TideStatus` row upserted. Repeats every hour.
2. **App load**: `home.tsx` mounts → `getTideStatus()` → `GET /api/tide` (no auth) → controller → `tideService.getLatest()` reads the singleton row → `{ success: true, tide: {...} }` → `home.tsx` formats and passes to `TideBanner`.
3. **Stale/missing data**: if the backend has just been deployed and the first poll hasn't completed, `getLatest()` throws `503`; the frontend's `.catch(() => {})` means the tide card simply doesn't render that session (same degrade-gracefully behavior the evacuation-center card already has when centers haven't loaded yet) rather than showing broken data.

## Error handling

- Backend: `refreshTideStatus()` catches and logs Stormglass fetch failures (network error, non-2xx, rate limit) without throwing — the poller keeps running on its interval, and `getLatest()` keeps serving the last successful row. `getLatest()` itself only throws (`503`) in the narrow case of no row existing yet at all.
- Frontend: `getTideStatus()` failures (network error, `503`) are swallowed by the existing `.catch(() => {})` convention already used for notifications/evacuation centers in `home.tsx`; the tide card just doesn't render rather than showing an error state, matching how the rest of this screen already degrades.

## Testing

Manual verification (neither repo has an automated test setup):

**Backend**, via curl/Postman against the running dev server:
- After startup, confirm a log line (or a DB check) shows the first Stormglass poll completed and `TideStatus` has a row.
- `GET /api/tide` → 200 with `seaLevelM`/`nextExtremeAt`/`nextExtremeType`/`floodRiskLevel`/`updatedAt`, no `Authorization` header required.
- Temporarily set an invalid `STORMGLASS_API_KEY`, restart, confirm the poll failure is logged but the server stays up and `GET /api/tide` still returns the last-known row (or `503` if there's truly never been a successful poll).

**Frontend**, running the app against the local backend:
- Home screen's tide card shows a real `seaLevelM`-derived level/detail/updated time instead of the old hardcoded "Normal / 0.4 m · falling until 11:40".
- Stop the backend (or block `/api/tide`); confirm the tide card simply doesn't render rather than crashing the screen or showing stale/broken text.
