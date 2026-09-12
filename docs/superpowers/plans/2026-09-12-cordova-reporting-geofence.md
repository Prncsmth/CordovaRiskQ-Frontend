# Cordova-Only Reporting Geofence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict incident reports and SOS alerts to citizens who are physically inside the Municipality of Cordova, Cebu, submitting from a location also inside Cordova — enforced identically on the frontend (instant feedback) and the Express backend (the real authority).

**Architecture:** A single shared point-in-polygon check (`isInsideCordova`), backed by the same OpenStreetMap-sourced Cordova boundary GeoJSON, duplicated once per repo (no shared package between them today). The frontend gates three entry points — the map's pin-drop, the incident report submit button, and the SOS confirm flow — each requiring a fresh GPS fix before proceeding. The backend independently re-validates every incident/SOS request via Express middleware before it reaches the database.

**Tech Stack:** React Native (Expo, `@rnmapbox/maps` + Leaflet/WebView fallback), Express + Zod + Prisma, `@turf/boolean-point-in-polygon`.

**Spec:** `docs/superpowers/specs/2026-09-12-cordova-reporting-geofence-design.md`

## Global Constraints

- Boundary source: OpenStreetMap relation `10337872` (admin boundary for Cordova, Cebu) — exact coordinates given in Task 1/4, do not re-fetch.
- Point-in-polygon library: `@turf/boolean-point-in-polygon@7.4.0` only (no `@turf/helpers` needed — pass a plain `[longitude, latitude]` tuple as the point argument).
- Live map "outside Cordova" ambient status uses a **2-consecutive-outside** streak rule (jitter-resistant); every discrete action (pin button tap, report submit, SOS confirm) instead takes **one fresh GPS fix** and decides immediately — never the streak state.
- Fresh-fix timeout: **10 seconds**, single attempt, no accuracy-threshold retry loop (see spec's "Frontend: fresh location fetch" section for rationale).
- An unresolvable/unverifiable location is treated identically to a confirmed-outside-Cordova location for blocking purposes — no separate message.
- Colors: use the app's existing `COLORS.danger` / `COLORS.warning` theme tokens (`theme/colors.ts`) — never hardcode hex values.
- Exact copy (verbatim, do not paraphrase):
  - Toast (map tap outside): **"Outside Cordova — Please select a location within Cordova."**
  - Modal "Reporting Not Available": **"You must be physically within the Municipality of Cordova, Cebu to submit an incident report."**
  - Modal "Location Permission Required": **"CORDOVA RISKQ requires your location to verify that reports are submitted from within Cordova."**
  - Modal "SOS Not Available": **"This feature is only available within the Municipality of Cordova, Cebu."**
  - Locating caption: **"Getting your accurate location..."**
  - Backend incident 403: **"Incident reports are only allowed within the Municipality of Cordova, Cebu."**
  - Backend SOS 403: **"SOS is only available within the Municipality of Cordova, Cebu."**
- Reporter's live GPS at incident-submit time is validated but **never persisted** — no Prisma migration in this plan.
- Two repos, no shared package: `C:\CORDOVA RISKQ\CordovaRiskQ-Frontend` (this repo) and `C:\CORDOVA RISKQ\CordovaRiskQ-Bacnkend`. Every task states which repo it operates in.

---

## Task 1: Backend — boundary data + `isInsideCordova` utility

**Repo:** `C:\CORDOVA RISKQ\CordovaRiskQ-Bacnkend`

**Files:**
- Create: `src/constants/cordovaBoundary.geojson.json`
- Create: `src/utils/geofence.ts`
- Test: `src/utils/geofence.test.ts`
- Modify: `package.json` (add `@turf/boolean-point-in-polygon`)

**Interfaces:**
- Produces: `isInsideCordova(latitude: number, longitude: number): boolean` — every later backend task (middleware) imports this from `@/utils/geofence`.

- [ ] **Step 1: Install the dependency**

Run: `npm install @turf/boolean-point-in-polygon@7.4.0`

- [ ] **Step 2: Create the boundary GeoJSON asset**

Create `src/constants/cordovaBoundary.geojson.json` with exactly this content (fetched from OpenStreetMap's Nominatim API for relation 10337872, the official administrative boundary for Cordova, Cebu — verified to include the mainland peninsula, Gilutongan Island, and surrounding municipal waters):

```json
{
  "type": "Feature",
  "properties": {
    "name": "Cordova, Cebu",
    "source": "OpenStreetMap",
    "osmType": "relation",
    "osmId": 10337872,
    "fetchedAt": "2026-09-12"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[123.8896035,10.2463015],[123.9022943,10.1491519],[123.9134356,10.1500236],[123.9359816,10.1532873],[123.950691,10.1522489],[123.9837862,10.151678],[123.9959253,10.1561236],[124.0096209,10.1656977],[124.0199951,10.1789047],[124.0163325,10.1867926],[124.0116119,10.1940576],[124.0050029,10.2009],[124.0047454,10.2062218],[124.0047454,10.208756],[124.0056037,10.2160205],[123.9868926,10.2329141],[123.9715289,10.2270859],[123.9686965,10.2399246],[123.9666366,10.2518865],[123.9666688,10.2558244],[123.9677632,10.2569963],[123.9685357,10.2583793],[123.969233,10.259435],[123.9693403,10.2603218],[123.9696514,10.2617471],[123.9697266,10.2628767],[123.9692974,10.2640907],[123.9689326,10.2646397],[123.9677364,10.2657165],[123.9664113,10.2666297],[123.9655262,10.2672315],[123.9640188,10.2680549],[123.9627099,10.2693587],[123.9606178,10.2703669],[123.9598614,10.270805],[123.9593196,10.2712484],[123.9587724,10.2720243],[123.9581716,10.2727686],[123.9579409,10.2729639],[123.9577693,10.2732384],[123.9572167,10.2738032],[123.9570987,10.2738454],[123.9568637,10.2741495],[123.9567232,10.2744471],[123.9567768,10.2748694],[123.9567768,10.27507],[123.9563477,10.2757139],[123.9559936,10.2766746],[123.955704,10.2773397],[123.9552963,10.2777514],[123.9549744,10.2783954],[123.9550066,10.2790288],[123.9551568,10.2796094],[123.9546847,10.2799577],[123.953923,10.2796516],[123.9532685,10.2794299],[123.9526999,10.2794616],[123.9524746,10.2794193],[123.9523351,10.2792504],[123.9518845,10.2791343],[123.9508545,10.2781631],[123.9502215,10.2766957],[123.9498353,10.276284],[123.9498675,10.2759884],[123.9498675,10.2757562],[123.9495778,10.275355],[123.9492881,10.2751439],[123.94858,10.2748589],[123.9481509,10.2745844],[123.9479899,10.2743521],[123.9479041,10.2739404],[123.9477432,10.2737187],[123.9473033,10.2734126],[123.946917,10.2733598],[123.9463162,10.2732225],[123.9457476,10.2729692],[123.9452112,10.2725364],[123.9444533,10.2716662],[123.9441309,10.2711444],[123.943802,10.2705486],[123.9421207,10.2692787],[123.941635,10.2684971],[123.9409625,10.2672895],[123.9398146,10.26654],[123.9387094,10.2650093],[123.9378619,10.2637424],[123.9338493,10.2613564],[123.9298796,10.2597306],[123.925867,10.2584638],[123.9226913,10.2613776],[123.9193868,10.2641225],[123.9157819,10.2681764],[123.8958263,10.2555077],[123.8928222,10.2536074],[123.8896035,10.2463015]]]
  }
}
```

- [ ] **Step 3: Write the failing test**

Create `src/utils/geofence.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { isInsideCordova } from "@/utils/geofence";

test("isInsideCordova is true for the Cordova municipal center", () => {
    assert.equal(isInsideCordova(10.2515, 123.9499), true);
});

test("isInsideCordova is true for Gilutongan Island (part of Cordova)", () => {
    assert.equal(isInsideCordova(10.207, 123.988), true);
});

test("isInsideCordova is true exactly on a boundary vertex", () => {
    assert.equal(isInsideCordova(10.2463015, 123.8896035), true);
});

test("isInsideCordova is false for Lapu-Lapu City center", () => {
    assert.equal(isInsideCordova(10.3103, 123.9494), false);
});

test("isInsideCordova is false for Cebu City center", () => {
    assert.equal(isInsideCordova(10.3157, 123.8854), false);
});

test("isInsideCordova is false for Mandaue City center", () => {
    assert.equal(isInsideCordova(10.3236, 123.9227), false);
});

test("isInsideCordova is false far out in the open ocean", () => {
    assert.equal(isInsideCordova(10.25, 124.5), false);
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx tsx --test src/utils/geofence.test.ts`
Expected: FAIL — `Cannot find module '@/utils/geofence'` (the file doesn't exist yet).

- [ ] **Step 5: Write the implementation**

Create `src/utils/geofence.ts`:

```ts
// src/utils/geofence.ts
// Mirrors the frontend's utils/geofence.ts -- same boundary GeoJSON, same
// function signature, no shared package between the two repos (see
// constants/location.ts's header comment for that existing convention).
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

import cordovaBoundary from "@/constants/cordovaBoundary.geojson.json";

export function isInsideCordova(latitude: number, longitude: number): boolean {
    return booleanPointInPolygon([longitude, latitude], cordovaBoundary as any);
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx tsx --test src/utils/geofence.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 7: Commit**

```bash
git add src/constants/cordovaBoundary.geojson.json src/utils/geofence.ts src/utils/geofence.test.ts package.json package-lock.json
git commit -m "feat: add Cordova boundary geofence utility"
```

---

## Task 2: Backend — geofence middleware

**Repo:** `C:\CORDOVA RISKQ\CordovaRiskQ-Bacnkend`

**Files:**
- Create: `src/middlewares/geofence.middleware.ts`
- Test: `src/middlewares/geofence.middleware.test.ts`

**Interfaces:**
- Consumes: `isInsideCordova(latitude, longitude): boolean` from Task 1.
- Produces: `requireIncidentInsideCordova(req, res, next)` and `requireSosInsideCordova(req, res, next)` Express middleware — Task 3 wires these into the routes.

- [ ] **Step 1: Write the failing test**

Create `src/middlewares/geofence.middleware.test.ts`. This calls the middleware functions directly as plain functions (no HTTP server needed — this codebase has no supertest-style integration test infra, so middleware is tested the same way `incidentRoster.ts`'s pure functions are: directly, in isolation):

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { requireIncidentInsideCordova, requireSosInsideCordova } from "@/middlewares/geofence.middleware";
import { AppError } from "@/utils/AppError";

const INSIDE = { latitude: 10.2515, longitude: 123.9499 }; // Cordova center
const OUTSIDE = { latitude: 10.3103, longitude: 123.9494 }; // Lapu-Lapu City center

function makeNextSpy() {
    const calls: unknown[] = [];
    const next = (arg?: unknown) => calls.push(arg);
    return { next, calls };
}

test("requireIncidentInsideCordova calls next() with no error when both points are inside Cordova", () => {
    const { next, calls } = makeNextSpy();
    const req: any = {
        body: {
            latitude: INSIDE.latitude,
            longitude: INSIDE.longitude,
            reporterLatitude: INSIDE.latitude,
            reporterLongitude: INSIDE.longitude,
        },
    };
    requireIncidentInsideCordova(req, {} as any, next);
    assert.deepEqual(calls, [undefined]);
});

test("requireIncidentInsideCordova blocks when the pin is outside Cordova", () => {
    const { next, calls } = makeNextSpy();
    const req: any = {
        body: {
            latitude: OUTSIDE.latitude,
            longitude: OUTSIDE.longitude,
            reporterLatitude: INSIDE.latitude,
            reporterLongitude: INSIDE.longitude,
        },
    };
    requireIncidentInsideCordova(req, {} as any, next);
    assert.equal(calls.length, 1);
    const err = calls[0] as AppError;
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 403);
    assert.equal(err.message, "Incident reports are only allowed within the Municipality of Cordova, Cebu.");
});

test("requireIncidentInsideCordova blocks when the reporter's GPS is outside Cordova", () => {
    const { next, calls } = makeNextSpy();
    const req: any = {
        body: {
            latitude: INSIDE.latitude,
            longitude: INSIDE.longitude,
            reporterLatitude: OUTSIDE.latitude,
            reporterLongitude: OUTSIDE.longitude,
        },
    };
    requireIncidentInsideCordova(req, {} as any, next);
    const err = calls[0] as AppError;
    assert.equal(err.statusCode, 403);
});

test("requireSosInsideCordova calls next() with no error when inside Cordova", () => {
    const { next, calls } = makeNextSpy();
    const req: any = { body: { latitude: INSIDE.latitude, longitude: INSIDE.longitude } };
    requireSosInsideCordova(req, {} as any, next);
    assert.deepEqual(calls, [undefined]);
});

test("requireSosInsideCordova blocks when outside Cordova", () => {
    const { next, calls } = makeNextSpy();
    const req: any = { body: { latitude: OUTSIDE.latitude, longitude: OUTSIDE.longitude } };
    requireSosInsideCordova(req, {} as any, next);
    assert.equal(calls.length, 1);
    const err = calls[0] as AppError;
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 403);
    assert.equal(err.message, "SOS is only available within the Municipality of Cordova, Cebu.");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/middlewares/geofence.middleware.test.ts`
Expected: FAIL — `Cannot find module '@/middlewares/geofence.middleware'`.

- [ ] **Step 3: Write the implementation**

Create `src/middlewares/geofence.middleware.ts`:

```ts
import { NextFunction, Request, Response } from "express";
import { AppError } from "@/utils/AppError";
import { isInsideCordova } from "@/utils/geofence";

const INCIDENT_MESSAGE = "Incident reports are only allowed within the Municipality of Cordova, Cebu.";
const SOS_MESSAGE = "SOS is only available within the Municipality of Cordova, Cebu.";

// Runs after validate(schema) in the route chain, so req.body's fields are
// already guaranteed present and numeric -- this only does the polygon math.
export function requireIncidentInsideCordova(req: Request, res: Response, next: NextFunction) {
    const { latitude, longitude, reporterLatitude, reporterLongitude } = req.body;
    const pinOk = isInsideCordova(latitude, longitude);
    const reporterOk = isInsideCordova(reporterLatitude, reporterLongitude);
    if (!pinOk || !reporterOk) {
        return next(new AppError(INCIDENT_MESSAGE, 403));
    }
    next();
}

export function requireSosInsideCordova(req: Request, res: Response, next: NextFunction) {
    const { latitude, longitude } = req.body;
    if (!isInsideCordova(latitude, longitude)) {
        return next(new AppError(SOS_MESSAGE, 403));
    }
    next();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/middlewares/geofence.middleware.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/middlewares/geofence.middleware.ts src/middlewares/geofence.middleware.test.ts
git commit -m "feat: add Cordova geofence middleware for incidents and SOS"
```

---

## Task 3: Backend — required fields + route wiring

**Repo:** `C:\CORDOVA RISKQ\CordovaRiskQ-Bacnkend`

**Files:**
- Modify: `src/validations/incident.validation.ts`
- Modify: `src/validations/sos.validation.ts`
- Modify: `src/routes/incident.routes.ts`
- Modify: `src/routes/sos.routes.ts`
- Modify: `src/services/sos.service.ts` (type annotation only)

**Interfaces:**
- Consumes: `requireIncidentInsideCordova`, `requireSosInsideCordova` from Task 2.
- Produces: `POST /api/incidents` now requires `reporterLatitude`/`reporterLongitude` in the body (in addition to the existing `latitude`/`longitude`); `POST /api/sos` now requires `latitude`/`longitude` (previously optional). Frontend tasks 11-12 must send these.

- [ ] **Step 1: Add the required reporter-GPS fields to the incident schema**

In `src/validations/incident.validation.ts`, change:

```ts
export const createIncidentSchema = z.object({
    category: z.enum(["flood", "fire", "medical", "road-accident", "other"]),
    details: z.string().optional(),
    locationLabel: z.string().min(1, "Location is required"),
    latitude: z.number(),
    longitude: z.number(),
});
```

to:

```ts
export const createIncidentSchema = z.object({
    category: z.enum(["flood", "fire", "medical", "road-accident", "other"]),
    details: z.string().optional(),
    locationLabel: z.string().min(1, "Location is required"),
    latitude: z.number(),
    longitude: z.number(),
    reporterLatitude: z.number(),
    reporterLongitude: z.number(),
});
```

- [ ] **Step 2: Make the SOS schema's coordinates required**

In `src/validations/sos.validation.ts`, change:

```ts
export const triggerSosSchema = z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    locationLabel: z.string().optional(),
});
```

to:

```ts
export const triggerSosSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
    locationLabel: z.string().optional(),
});
```

- [ ] **Step 3: Narrow the SOS service's type annotation to match**

In `src/services/sos.service.ts`, change:

```ts
    async trigger(
        userId: string,
        data: { latitude?: number; longitude?: number; locationLabel?: string }
    ) {
```

to:

```ts
    async trigger(
        userId: string,
        data: { latitude: number; longitude: number; locationLabel?: string }
    ) {
```

- [ ] **Step 4: Wire the geofence middleware into both routes**

In `src/routes/incident.routes.ts`, add the import and insert the middleware between `validate` and the controller:

```ts
import { Router } from "express";
import { incidentController } from "@/controllers/incident.controller";
import { authenticate } from "@/middlewares/authenticate.middleware";
import { requireIncidentInsideCordova } from "@/middlewares/geofence.middleware";
import { validate } from "@/middlewares/validate.middleware";
import {
    createIncidentSchema,
    updateIncidentStatusSchema,
    updateMyResponderStatusSchema,
} from "@/validations/incident.validation";

const router = Router();

router.post(
    "/incidents",
    authenticate,
    validate(createIncidentSchema),
    requireIncidentInsideCordova,
    incidentController.create
);
```

(the remaining routes in that file are unchanged — leave `GET /incidents`, `/incidents/mine`, etc. exactly as they are).

In `src/routes/sos.routes.ts`:

```ts
import { Router } from "express";
import { sosController } from "@/controllers/sos.controller";
import { authenticate } from "@/middlewares/authenticate.middleware";
import { requireSosInsideCordova } from "@/middlewares/geofence.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { triggerSosSchema } from "@/validations/sos.validation";

const router = Router();

router.post(
    "/sos",
    authenticate,
    validate(triggerSosSchema),
    requireSosInsideCordova,
    sosController.trigger
);

export default router;
```

- [ ] **Step 5: Run the full backend test suite**

Run: `npm test`
Expected: PASS — all existing tests plus Task 1/2's new tests are green. `incidentService.create` and `sosController.trigger` are untouched by this task, so no other test should regress.

- [ ] **Step 6: Manual smoke test against a running server**

This repo has no HTTP-level test infra (no supertest), so verify the wiring by hand:

Run: `npm run dev` (leave running), then in a second terminal, register a throwaway test user and capture the token (there's no pre-seeded regular citizen account — `prisma/seed.ts` only seeds an admin, which uses a separate `/api/admin-auth` login, not the one `/api/incidents` and `/api/sos` authenticate against):

```bash
curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"geofence-test@example.com","password":"testpass123","name":"Geofence Test"}'
# Copy the "token" field from the JSON response into TOKEN below.
TOKEN="<paste the token here>"
```

Then, using `$TOKEN` as the bearer token:

```bash
# Inside Cordova pin + inside Cordova reporter GPS -> expect 201
curl -X POST http://localhost:8000/api/incidents \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"category":"fire","locationLabel":"Test","latitude":10.2515,"longitude":123.9499,"reporterLatitude":10.2515,"reporterLongitude":123.9499}'

# Pin outside Cordova (Lapu-Lapu) -> expect 403 with the exact incident message
curl -X POST http://localhost:8000/api/incidents \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"category":"fire","locationLabel":"Test","latitude":10.3103,"longitude":123.9494,"reporterLatitude":10.2515,"reporterLongitude":123.9499}'

# SOS inside Cordova -> expect 201
curl -X POST http://localhost:8000/api/sos \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"latitude":10.2515,"longitude":123.9499}'

# SOS outside Cordova -> expect 403 with the exact SOS message
curl -X POST http://localhost:8000/api/sos \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"latitude":10.3103,"longitude":123.9494}'

# SOS missing coordinates entirely -> expect 400 (zod validation, before the geofence check ever runs)
curl -X POST http://localhost:8000/api/sos \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{}'
```

Confirm each response's status code and `message` field match what's described above.

- [ ] **Step 7: Commit**

```bash
git add src/validations/incident.validation.ts src/validations/sos.validation.ts src/routes/incident.routes.ts src/routes/sos.routes.ts src/services/sos.service.ts
git commit -m "feat: enforce Cordova-only geofence on incident and SOS routes"
```

---

## Task 4: Frontend — boundary data + `isInsideCordova` utility

**Repo:** `C:\CORDOVA RISKQ\CordovaRiskQ-Frontend`

**Files:**
- Create: `constants/cordovaBoundary.geojson.json`
- Create: `utils/geofence.ts`
- Test: `utils/geofence.test.ts`
- Modify: `package.json` (add `@turf/boolean-point-in-polygon`)

**Interfaces:**
- Produces: `isInsideCordova(latitude: number, longitude: number): boolean` — every later frontend task imports this from `@/utils/geofence`.

- [ ] **Step 1: Install the dependency**

Run: `npm install @turf/boolean-point-in-polygon@7.4.0`

- [ ] **Step 2: Create the boundary GeoJSON asset**

Create `constants/cordovaBoundary.geojson.json` with the **exact same content** as Task 1 Step 2 (identical file, both repos keep their own copy — see `constants/cordovaBarangays.ts`'s existing PhilAtlas-sourced-data convention for why duplication is intentional here):

```json
{
  "type": "Feature",
  "properties": {
    "name": "Cordova, Cebu",
    "source": "OpenStreetMap",
    "osmType": "relation",
    "osmId": 10337872,
    "fetchedAt": "2026-09-12"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[123.8896035,10.2463015],[123.9022943,10.1491519],[123.9134356,10.1500236],[123.9359816,10.1532873],[123.950691,10.1522489],[123.9837862,10.151678],[123.9959253,10.1561236],[124.0096209,10.1656977],[124.0199951,10.1789047],[124.0163325,10.1867926],[124.0116119,10.1940576],[124.0050029,10.2009],[124.0047454,10.2062218],[124.0047454,10.208756],[124.0056037,10.2160205],[123.9868926,10.2329141],[123.9715289,10.2270859],[123.9686965,10.2399246],[123.9666366,10.2518865],[123.9666688,10.2558244],[123.9677632,10.2569963],[123.9685357,10.2583793],[123.969233,10.259435],[123.9693403,10.2603218],[123.9696514,10.2617471],[123.9697266,10.2628767],[123.9692974,10.2640907],[123.9689326,10.2646397],[123.9677364,10.2657165],[123.9664113,10.2666297],[123.9655262,10.2672315],[123.9640188,10.2680549],[123.9627099,10.2693587],[123.9606178,10.2703669],[123.9598614,10.270805],[123.9593196,10.2712484],[123.9587724,10.2720243],[123.9581716,10.2727686],[123.9579409,10.2729639],[123.9577693,10.2732384],[123.9572167,10.2738032],[123.9570987,10.2738454],[123.9568637,10.2741495],[123.9567232,10.2744471],[123.9567768,10.2748694],[123.9567768,10.27507],[123.9563477,10.2757139],[123.9559936,10.2766746],[123.955704,10.2773397],[123.9552963,10.2777514],[123.9549744,10.2783954],[123.9550066,10.2790288],[123.9551568,10.2796094],[123.9546847,10.2799577],[123.953923,10.2796516],[123.9532685,10.2794299],[123.9526999,10.2794616],[123.9524746,10.2794193],[123.9523351,10.2792504],[123.9518845,10.2791343],[123.9508545,10.2781631],[123.9502215,10.2766957],[123.9498353,10.276284],[123.9498675,10.2759884],[123.9498675,10.2757562],[123.9495778,10.275355],[123.9492881,10.2751439],[123.94858,10.2748589],[123.9481509,10.2745844],[123.9479899,10.2743521],[123.9479041,10.2739404],[123.9477432,10.2737187],[123.9473033,10.2734126],[123.946917,10.2733598],[123.9463162,10.2732225],[123.9457476,10.2729692],[123.9452112,10.2725364],[123.9444533,10.2716662],[123.9441309,10.2711444],[123.943802,10.2705486],[123.9421207,10.2692787],[123.941635,10.2684971],[123.9409625,10.2672895],[123.9398146,10.26654],[123.9387094,10.2650093],[123.9378619,10.2637424],[123.9338493,10.2613564],[123.9298796,10.2597306],[123.925867,10.2584638],[123.9226913,10.2613776],[123.9193868,10.2641225],[123.9157819,10.2681764],[123.8958263,10.2555077],[123.8928222,10.2536074],[123.8896035,10.2463015]]]
  }
}
```

- [ ] **Step 3: Write the failing test**

Create `utils/geofence.test.ts`:

```ts
import { isInsideCordova } from "./geofence";

describe("isInsideCordova", () => {
  it("is true for the Cordova municipal center", () => {
    expect(isInsideCordova(10.2515, 123.9499)).toBe(true);
  });

  it("is true for Gilutongan Island (part of Cordova)", () => {
    expect(isInsideCordova(10.207, 123.988)).toBe(true);
  });

  it("is true exactly on a boundary vertex", () => {
    expect(isInsideCordova(10.2463015, 123.8896035)).toBe(true);
  });

  it("is false for Lapu-Lapu City center", () => {
    expect(isInsideCordova(10.3103, 123.9494)).toBe(false);
  });

  it("is false for Cebu City center", () => {
    expect(isInsideCordova(10.3157, 123.8854)).toBe(false);
  });

  it("is false for Mandaue City center", () => {
    expect(isInsideCordova(10.3236, 123.9227)).toBe(false);
  });

  it("is false far out in the open ocean", () => {
    expect(isInsideCordova(10.25, 124.5)).toBe(false);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx jest utils/geofence.test.ts`
Expected: FAIL — `Cannot find module './geofence'`.

- [ ] **Step 5: Write the implementation**

Create `utils/geofence.ts`:

```ts
// utils/geofence.ts
// Mirrors the backend's src/utils/geofence.ts -- same boundary GeoJSON, same
// function signature, no shared package between the two repos (see
// constants/location.ts on the backend for that existing convention).
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

import cordovaBoundary from "@/constants/cordovaBoundary.geojson.json";

export function isInsideCordova(latitude: number, longitude: number): boolean {
  return booleanPointInPolygon([longitude, latitude], cordovaBoundary as any);
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest utils/geofence.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 7: Commit**

```bash
git add constants/cordovaBoundary.geojson.json utils/geofence.ts utils/geofence.test.ts package.json package-lock.json
git commit -m "feat: add Cordova boundary geofence utility"
```

---

## Task 5: Frontend — boundary rendering on the Mapbox engine

**Repo:** `C:\CORDOVA RISKQ\CordovaRiskQ-Frontend`

**Files:**
- Modify: `components/map/types.ts` (add `showCordovaBoundary` prop)
- Modify: `components/map/MapboxMap.tsx`

**Interfaces:**
- Consumes: `constants/cordovaBoundary.geojson.json` from Task 4.
- Produces: `MapEngineProps.showCordovaBoundary?: boolean` — Task 6 (Leaflet) implements the same flag; Task 10 (map screen) passes it.

- [ ] **Step 1: Add the prop to the shared contract**

In `components/map/types.ts`, add to `MapEngineProps` (after `showLayerSwitcher?: boolean;`):

```ts
  showCordovaBoundary?: boolean;
```

- [ ] **Step 2: Render the boundary on the Mapbox engine**

In `components/map/MapboxMap.tsx`:

Add the import (after the existing `CORDOVA_BOUNDS` import):

```ts
import cordovaBoundary from "@/constants/cordovaBoundary.geojson.json";
```

Add `FillLayer` to the `MapboxModule` type:

```ts
type MapboxModule = {
  default: { setAccessToken: (token: string) => void };
  MapView: React.ComponentType<any>;
  Camera: React.ForwardRefExoticComponent<any>;
  MarkerView: React.ComponentType<any>;
  UserLocation: React.ComponentType<any>;
  ShapeSource: React.ComponentType<any>;
  LineLayer: React.ComponentType<any>;
  FillLayer: React.ComponentType<any>;
};
```

Add `showCordovaBoundary = false` to the destructured props (after `showLayerSwitcher = false,`):

```ts
    showLayerSwitcher = false,
    showCordovaBoundary = false,
```

Destructure `FillLayer` alongside the others:

```ts
  const { MapView, Camera, MarkerView, UserLocation, ShapeSource, LineLayer, FillLayer } = mapbox;
```

Render the boundary as the first child inside `<MapView>`, right after `<Camera .../>` and before `<UserLocation>` / polylines / markers (so the fill sits underneath the live location dot and pins):

```tsx
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [center.longitude, center.latitude],
            zoomLevel: zoom,
          }}
          maxBounds={CORDOVA_BOUNDS}
          minZoomLevel={minZoom}
          maxZoomLevel={maxZoom}
        />

        {showCordovaBoundary && (
          <ShapeSource id="cordova-boundary" shape={cordovaBoundary as any}>
            <FillLayer
              id="cordova-boundary-fill"
              style={{ fillColor: COLORS.tide, fillOpacity: 0.12 }}
            />
            <LineLayer
              id="cordova-boundary-outline"
              style={{ lineColor: COLORS.tide, lineWidth: 2 }}
            />
          </ShapeSource>
        )}

        {interactive && <UserLocation visible showsUserHeadingIndicator />}
```

- [ ] **Step 3: Manually verify on a dev-client build**

This component has no existing test coverage (map rendering isn't unit-tested anywhere in this codebase — see `map.tsx`'s absence of a test file). Verify by hand:

Run the app on a dev client (not Expo Go — Mapbox needs the native module): `npx expo run:android` or `npx expo run:ios`. Temporarily pass `showCordovaBoundary` to any screen using `AppMap` (e.g. add it to the `<AppMap>` call in `app/(tabs)/map.tsx` for this manual check only — Task 10 will do this permanently) and confirm:
- A light blue translucent fill covers Cordova's mainland peninsula and Gilutongan Island.
- A solid blue outline traces the boundary.
- Zoom/pan/rotation still work normally.
- Existing markers and the layer switcher still render correctly on top of the fill.

Revert the temporary prop pass-through before committing (Task 10 wires it properly).

- [ ] **Step 4: Commit**

```bash
git add components/map/types.ts components/map/MapboxMap.tsx
git commit -m "feat: render Cordova boundary on the Mapbox map engine"
```

---

## Task 6: Frontend — boundary rendering on the Leaflet engine

**Repo:** `C:\CORDOVA RISKQ\CordovaRiskQ-Frontend`

**Files:**
- Modify: `components/map/LeafletMap.tsx`

**Interfaces:**
- Consumes: `constants/cordovaBoundary.geojson.json` from Task 4, `MapEngineProps.showCordovaBoundary` from Task 5.
- Produces: same boundary visual on the Expo Go fallback engine, so `showCordovaBoundary` behaves identically regardless of which engine `AppMap` picks.

- [ ] **Step 1: Add the import and pass the boundary + color into `buildHtml`**

In `components/map/LeafletMap.tsx`, add the import (near the top, after `import { CORDOVA_BOUNDS } from "@/constants/cordovaBarangays";`):

```ts
import cordovaBoundary from "@/constants/cordovaBoundary.geojson.json";
```

Update `buildHtml`'s options type and destructure to accept the boundary flag and color:

```ts
function buildHtml(options: {
  centerLat: number;
  centerLng: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  interactive: boolean;
  showLayerSwitcher: boolean;
  showCordovaBoundary: boolean;
  boundaryColor: string;
}): string {
  const { centerLat, centerLng, zoom, minZoom, maxZoom, interactive, showLayerSwitcher, showCordovaBoundary, boundaryColor } = options;
```

- [ ] **Step 2: Inject the boundary layer into the generated HTML/JS**

Inside the template literal's `<script>` block, right after the `var satellite = ...` / `var terrain = ...` tile-layer definitions and before the `if (${showLayerSwitcher}) {...}` block, add:

```js
  var cordovaBoundary = ${JSON.stringify(cordovaBoundary)};
  if (${showCordovaBoundary}) {
    L.geoJSON(cordovaBoundary, {
      style: {
        color: '${boundaryColor}',
        weight: 2,
        fillColor: '${boundaryColor}',
        fillOpacity: 0.12
      }
    }).addTo(map);
  }
```

- [ ] **Step 3: Pass the new options from the component**

In the `LeafletMap` component body, destructure `showCordovaBoundary = false` alongside the existing `showLayerSwitcher = true,` prop default:

```ts
    interactive = true,
    showLayerSwitcher = true,
    showCordovaBoundary = false,
```

Update the `buildHtml` call inside the `useMemo`:

```ts
  const html = useMemo(
    () =>
      buildHtml({
        centerLat: center.latitude,
        centerLng: center.longitude,
        zoom,
        minZoom,
        maxZoom,
        interactive,
        showLayerSwitcher,
        showCordovaBoundary,
        boundaryColor: COLORS.tide,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
```

(`COLORS` is already available in this component via `const COLORS = useThemeColors();` at the top of the function body — no new import needed.)

- [ ] **Step 4: Manually verify in Expo Go**

Run: `npx expo start` and open in Expo Go. Same temporary pass-through as Task 5 Step 3 (add `showCordovaBoundary` to the `<AppMap>` call in `map.tsx` for this check only, revert after). Confirm the same light-blue-fill-plus-outline boundary appears, matching the Mapbox version's look as closely as Leaflet allows, and that pan/zoom still work.

- [ ] **Step 5: Commit**

```bash
git add components/map/LeafletMap.tsx
git commit -m "feat: render Cordova boundary on the Leaflet map engine"
```

---

## Task 7: Frontend — `GeofenceBlockedModal` component

**Repo:** `C:\CORDOVA RISKQ\CordovaRiskQ-Frontend`

**Files:**
- Create: `components/common/GeofenceBlockedModal.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type GeofenceModalVariant = "reporting-unavailable" | "permission-required" | "sos-unavailable";

  export default function GeofenceBlockedModal(props: {
    visible: boolean;
    variant: GeofenceModalVariant;
    onDismiss: () => void;
    onRetry?: () => void; // only used by "permission-required"
  }): JSX.Element | null
  ```
  Tasks 10, 11, and 12 all import and render this component.

This component has no unit test — it's a pure presentational overlay (same as the existing `SosOverlay.tsx`, which also has no test file). Verified visually in Task 10/11/12's manual checks.

- [ ] **Step 1: Create the component**

Create `components/common/GeofenceBlockedModal.tsx`:

```tsx
// components/common/GeofenceBlockedModal.tsx
// Shared blocking overlay for the three Cordova-geofence "you can't proceed"
// states. Follows the same backdrop+dialog visual pattern as
// components/sos/SosOverlay.tsx's ConfirmView.
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  FONT_FAMILY,
  RADIUS,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

export type GeofenceModalVariant =
  | "reporting-unavailable"
  | "permission-required"
  | "sos-unavailable";

const COPY: Record<GeofenceModalVariant, { title: string; message: string; icon: keyof typeof Ionicons.glyphMap }> = {
  "reporting-unavailable": {
    title: "Reporting Not Available",
    message:
      "You must be physically within the Municipality of Cordova, Cebu to submit an incident report.",
    icon: "alert-circle",
  },
  "permission-required": {
    title: "Location Permission Required",
    message:
      "CORDOVA RISKQ requires your location to verify that reports are submitted from within Cordova.",
    icon: "location-outline",
  },
  "sos-unavailable": {
    title: "SOS Not Available",
    message: "This feature is only available within the Municipality of Cordova, Cebu.",
    icon: "alert-circle",
  },
};

export default function GeofenceBlockedModal({
  visible,
  variant,
  onDismiss,
  onRetry,
}: {
  visible: boolean;
  variant: GeofenceModalVariant;
  onDismiss: () => void;
  onRetry?: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  if (!visible) return null;

  const copy = COPY[variant];
  const iconColor = variant === "permission-required" ? COLORS.warning : COLORS.danger;

  return (
    <View style={styles.container}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.dialogIcon}>
            <Ionicons name={copy.icon} size={28} color={iconColor} />
          </View>
          <Text style={styles.dialogTitle}>{copy.title}</Text>
          <Text style={styles.dialogMessage}>{copy.message}</Text>

          {variant === "permission-required" ? (
            <View style={styles.dialogActions}>
              <Pressable
                style={[styles.dialogButton, styles.dialogButtonSecondary]}
                onPress={onRetry}
              >
                <Text style={styles.dialogButtonSecondaryText}>Retry</Text>
              </Pressable>
              <Pressable
                style={[styles.dialogButton, styles.dialogButtonPrimary]}
                onPress={() => {
                  Linking.openSettings();
                }}
              >
                <Text style={styles.dialogButtonPrimaryText}>Open Settings</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.dialogActions}>
              <Pressable
                style={[styles.dialogButton, styles.dialogButtonPrimary]}
                onPress={onDismiss}
              >
                <Text style={styles.dialogButtonPrimaryText}>OK</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 200,
      elevation: 200,
    },
    backdrop: {
      flex: 1,
      backgroundColor: COLORS.scrim,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: SPACING.lg,
    },
    dialog: {
      width: "100%",
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.xl,
      padding: SPACING.lg,
      alignItems: "center",
      ...SHADOW_LG,
    },
    dialogIcon: {
      width: 56,
      height: 56,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primaryTint,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.sm,
    },
    dialogTitle: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.subtitle,
      color: COLORS.text,
      textAlign: "center",
    },
    dialogMessage: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      textAlign: "center",
      marginTop: SPACING.xs,
      lineHeight: 20,
    },
    dialogActions: {
      flexDirection: "row",
      gap: SPACING.sm,
      marginTop: SPACING.lg,
      width: "100%",
    },
    dialogButton: {
      flex: 1,
      height: 48,
      borderRadius: RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
    },
    dialogButtonSecondary: {
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    dialogButtonSecondaryText: {
      color: COLORS.text,
      fontWeight: "700",
      fontSize: TYPOGRAPHY.body,
    },
    dialogButtonPrimary: {
      backgroundColor: COLORS.primary,
    },
    dialogButtonPrimaryText: {
      color: COLORS.white,
      fontWeight: "700",
      fontSize: TYPOGRAPHY.body,
    },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from this file (it isn't consumed by anything yet, so this just confirms the file itself is well-typed).

- [ ] **Step 3: Commit**

```bash
git add components/common/GeofenceBlockedModal.tsx
git commit -m "feat: add shared GeofenceBlockedModal component"
```

---

## Task 8: Frontend — `getVerifiedLocation` helper

**Repo:** `C:\CORDOVA RISKQ\CordovaRiskQ-Frontend`

**Files:**
- Modify: `services/location.service.ts`
- Modify: `services/location.service.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type VerifiedLocationResult =
    | { status: "granted"; coords: Coordinates }
    | { status: "denied" }
    | { status: "unavailable" };

  export async function getVerifiedLocation(): Promise<VerifiedLocationResult>
  ```
  Tasks 10, 11, and 12 all call this instead of `getCurrentLocation()`.

- [ ] **Step 1: Write the failing tests**

Add to the bottom of `services/location.service.test.ts` (the existing `jest.mock("expo-location", ...)` at the top of the file needs `Accuracy: { Highest: 5 }` added to its mock object — update that mock first):

```ts
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  Accuracy: { Highest: 5 },
}));
```

Then add this new `import` alongside the existing one:

```ts
import { getCurrentLocation, getVerifiedLocation } from "./location.service";
```

And append this new describe block at the end of the file:

```ts
describe("getVerifiedLocation", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns denied when permission is refused", async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({ status: "denied" });

    const result = await getVerifiedLocation();

    expect(result).toEqual({ status: "denied" });
    expect(getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it("returns granted with coords when a fresh fix resolves before the timeout", async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 10.2515, longitude: 123.9499 },
    });

    const result = await getVerifiedLocation();

    expect(result).toEqual({
      status: "granted",
      coords: { latitude: 10.2515, longitude: 123.9499 },
    });
  });

  it("returns unavailable when the fresh fix times out", async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));

    const resultPromise = getVerifiedLocation();
    await jest.advanceTimersByTimeAsync(10_000);
    const result = await resultPromise;

    expect(result).toEqual({ status: "unavailable" });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest services/location.service.test.ts`
Expected: FAIL — `getVerifiedLocation is not a function` (or similar import error).

- [ ] **Step 3: Implement `getVerifiedLocation`**

Append to `services/location.service.ts` (after the existing `getCurrentLocation` function):

```ts
const VERIFIED_FIX_TIMEOUT_MS = 10_000;

export type VerifiedLocationResult =
  | { status: "granted"; coords: Coordinates }
  | { status: "denied" }
  | { status: "unavailable" };

// Used only where a fresh, permission-aware fix must gate a real action --
// entering pin-drop mode, submitting an incident report, or confirming SOS
// (see utils/geofence.ts). getCurrentLocation() above collapses
// permission-denied and GPS-failure into the same `undefined`, which isn't
// enough to show the right modal ("Location Permission Required" vs
// "Reporting Not Available" / "SOS Not Available"). Deliberately does one
// single high-accuracy request rather than a multi-attempt accuracy-
// threshold retry loop -- see the design spec for why.
export async function getVerifiedLocation(): Promise<VerifiedLocationResult> {
  try {
    const module = require("expo-location") as typeof import("expo-location");
    const requestFn =
      (module as any).requestForegroundPermissionsAsync ??
      (module as any).default?.requestForegroundPermissionsAsync;
    const getCurrentPositionFn =
      (module as any).getCurrentPositionAsync ??
      (module as any).default?.getCurrentPositionAsync;
    const AccuracyEnum = (module as any).Accuracy ?? (module as any).default?.Accuracy;

    if (typeof requestFn !== "function" || typeof getCurrentPositionFn !== "function") {
      return { status: "unavailable" };
    }

    const { status } = await requestFn();
    if (status !== "granted") return { status: "denied" };

    const position = await withTimeout(
      getCurrentPositionFn({ accuracy: AccuracyEnum?.Highest }),
      VERIFIED_FIX_TIMEOUT_MS,
    );
    if (!position) return { status: "unavailable" };

    return {
      status: "granted",
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
    };
  } catch {
    return { status: "unavailable" };
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest services/location.service.test.ts`
Expected: PASS — all tests in the file (both `getCurrentLocation`'s existing 3 and `getVerifiedLocation`'s new 3) are green.

- [ ] **Step 5: Commit**

```bash
git add services/location.service.ts services/location.service.test.ts
git commit -m "feat: add getVerifiedLocation for geofence-gated actions"
```

---

## Task 9: Frontend — map tap validation + toast

**Repo:** `C:\CORDOVA RISKQ\CordovaRiskQ-Frontend`

**Files:**
- Create: `components/common/GeofenceToast.tsx`
- Modify: `app/(tabs)/map.tsx`

**Interfaces:**
- Consumes: `isInsideCordova` from Task 4.
- Produces: tapping outside Cordova while in pin mode never places a pin and shows a toast instead. Task 10 builds on this same file for the pin-button fresh-fix gate and live streak check.

- [ ] **Step 1: Create the toast component**

Create `components/common/GeofenceToast.tsx`:

```tsx
// components/common/GeofenceToast.tsx
// Small auto-dismissing rejection toast -- used when a map tap lands outside
// Cordova. Unlike GeofenceBlockedModal, this never blocks interaction: the
// map stays fully usable, the toast just confirms why nothing was placed.
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { RADIUS, SHADOW_LG, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

const AUTO_DISMISS_MS = 2500;

export default function GeofenceToast({
  visible,
  message,
  onDismiss,
  style,
}: {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <View style={styles.pill}>
        <Ionicons name="warning" size={16} color={COLORS.white} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: {
      position: "absolute",
      left: SPACING.md,
      right: SPACING.md,
      alignItems: "center",
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
      backgroundColor: COLORS.danger,
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      maxWidth: "100%",
      ...SHADOW_LG,
    },
    text: {
      color: COLORS.white,
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      flexShrink: 1,
    },
  });
}
```

- [ ] **Step 2: Wire the toast and tap-rejection into `map.tsx`**

In `app/(tabs)/map.tsx`, add the imports (alongside the existing `MapFirstTimeGuide` import):

```ts
import GeofenceToast from "@/components/common/GeofenceToast";
import { isInsideCordova } from "@/utils/geofence";
```

Add a toast-visibility state near the other `useState` declarations (after `const [showMapGuide, setShowMapGuide] = useState(false);`):

```ts
  const [showOutsideCordovaToast, setShowOutsideCordovaToast] = useState(false);
```

Change `handleMapPress` from:

```ts
  const handleMapPress = (coords: { latitude: number; longitude: number }) => {
    if (!pinMode) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPickedPoint(coords);

    const nearest = getNearestBarangay(coords.latitude, coords.longitude);
    setReportLocation({
      address: `Near Barangay ${nearest.name}, Cordova`,
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    setPinMode(false);
  };
```

to:

```ts
  const handleMapPress = (coords: { latitude: number; longitude: number }) => {
    if (!pinMode) return;

    if (!isInsideCordova(coords.latitude, coords.longitude)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowOutsideCordovaToast(true);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPickedPoint(coords);

    const nearest = getNearestBarangay(coords.latitude, coords.longitude);
    setReportLocation({
      address: `Near Barangay ${nearest.name}, Cordova`,
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    setPinMode(false);
  };
```

Add `showCordovaBoundary` to the `<AppMap>` call (this is the permanent wiring the Task 5/6 manual checks referenced):

```tsx
        <AppMap
          ref={mapRef}
          style={styles.map}
          center={CORDOVA_CENTER}
          zoom={14}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          markers={markers}
          userLocation={locationDenied ? null : userLocation}
          showLayerSwitcher
          showCordovaBoundary
          onMarkerPress={(id) => {
            if (id === "picked-report-location") return;
            router.push(`/evacuation-detail/${id}`);
          }}
          onMapPress={handleMapPress}
          onRegionChange={(region) => setZoomLevel(region.zoom)}
        />
```

Render the toast inside `styles.mapContainer`, after the `pinHint` block and before `<SearchBar .../>`:

```tsx
        <GeofenceToast
          visible={showOutsideCordovaToast}
          message="Outside Cordova — Please select a location within Cordova."
          onDismiss={() => setShowOutsideCordovaToast(false)}
          style={{ top: insets.top + SPACING.sm + 60 }}
        />
```

The `style` prop lets this float in the same vertical zone as the `pinHint` bubble above it, positioned per the `top` override passed above.

- [ ] **Step 3: Manually verify**

Run the app (Expo Go or dev client — either engine, since Task 6 gave Leaflet the same boundary rendering). Enable pin mode, tap a point clearly outside Cordova (e.g. north toward Lapu-Lapu City / Mactan-Cebu International Airport). Confirm:
- No pin appears.
- The red toast reads exactly "Outside Cordova — Please select a location within Cordova." and disappears after ~2.5s.
- Pin mode stays active — tapping a point inside Cordova immediately after still works normally (places the pin, exits pin mode).

- [ ] **Step 4: Commit**

```bash
git add components/common/GeofenceToast.tsx "app/(tabs)/map.tsx"
git commit -m "feat: reject out-of-Cordova map taps with a toast instead of a pin"
```

---

## Task 10: Frontend — pin button fresh-fix gate + live streak check

**Repo:** `C:\CORDOVA RISKQ\CordovaRiskQ-Frontend`

**Files:**
- Modify: `components/map/PinButton.tsx`
- Modify: `app/(tabs)/map.tsx`

**Interfaces:**
- Consumes: `isInsideCordova` (Task 4), `getVerifiedLocation` (Task 8), `GeofenceBlockedModal` (Task 7).
- Produces: entering pin mode requires a fresh in-Cordova GPS fix; the map screen tracks an ambient "citizen is outside Cordova" status that disables the pin button and shows the blocking modal.

- [ ] **Step 1: Add `loading`/`disabled` to `PinButton`**

In `components/map/PinButton.tsx`, change the props type and add an `ActivityIndicator` branch:

```tsx
// components/map/PinButton.tsx
// Floating toggle for pin-drop mode on the map screen. Forwards its ref
// so MapFirstTimeGuide can measure it as a tour target.
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { RADIUS, SHADOW_LG, SPACING, useThemeColors, type ColorPalette } from "@/theme";

export default React.forwardRef<View, {
  active: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}>(function PinButton({ active, loading = false, disabled = false, onPress, style }, ref) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <Pressable
      ref={ref}
      collapsable={false}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.pinButtonOuter, (disabled || loading) && styles.pinButtonDisabled, style]}
      accessibilityLabel={active ? "Cancel pinning emergency location" : "Pin emergency location"}
    >
      {loading ? (
        <BlurView intensity={60} tint={COLORS.glassTint} style={styles.pinButton}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </BlurView>
      ) : active ? (
        <View style={styles.pinButtonActive}>
          <Ionicons name="location" size={22} color={COLORS.white} />
        </View>
      ) : (
        <BlurView intensity={60} tint={COLORS.glassTint} style={styles.pinButton}>
          <Ionicons name="location-outline" size={22} color={COLORS.primary} />
        </BlurView>
      )}
    </Pressable>
  );
});

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    pinButtonOuter: {
      position: "absolute",
      right: SPACING.md,
      width: 44,
      height: 44,
      borderRadius: RADIUS.full,
      overflow: "hidden",
      ...SHADOW_LG,
    },
    pinButtonDisabled: {
      opacity: 0.5,
    },
    pinButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.glassOverlay,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
    },
    pinButtonActive: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.primary,
    },
  });
}
```

- [ ] **Step 2: Add the fresh-fix gate and live streak check to `map.tsx`**

Add imports:

```ts
import GeofenceBlockedModal from "@/components/common/GeofenceBlockedModal";
import { getVerifiedLocation } from "@/services/location.service";
```

Add state (near the other `useState` declarations):

```ts
  const [pinButtonLoading, setPinButtonLoading] = useState(false);
  const [citizenOutsideCordova, setCitizenOutsideCordova] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const outsideStreakRef = useRef(0);
  const wasOutsideRef = useRef(false);
```

Update the `watchPositionAsync` callback (inside the existing `useEffect` that starts with `let mounted = true;` / `let subscription: ... = null;`) to add the streak check. Change:

```ts
          (position: Location.LocationObject) => {
            if (!mounted) return;
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
            if (!hasCenteredOnUser.current) {
              hasCenteredOnUser.current = true;
              mapRef.current?.flyTo(
                position.coords.latitude,
                position.coords.longitude,
                15,
              );
            }
          },
```

to:

```ts
          (position: Location.LocationObject) => {
            if (!mounted) return;
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
            if (!hasCenteredOnUser.current) {
              hasCenteredOnUser.current = true;
              mapRef.current?.flyTo(
                position.coords.latitude,
                position.coords.longitude,
                15,
              );
            }

            if (isInsideCordova(position.coords.latitude, position.coords.longitude)) {
              outsideStreakRef.current = 0;
              wasOutsideRef.current = false;
              setCitizenOutsideCordova(false);
            } else {
              outsideStreakRef.current += 1;
              if (outsideStreakRef.current >= 2 && !wasOutsideRef.current) {
                wasOutsideRef.current = true;
                setCitizenOutsideCordova(true);
                setPinMode(false);
                setPickedPoint(null);
              }
            }
          },
```

Update `handleTogglePinMode` — entering pin mode now requires a fresh fix. Change:

```ts
  const handleTogglePinMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPinMode((v) => !v);
  };
```

to:

```ts
  const handleTogglePinMode = async () => {
    if (pinMode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPinMode(false);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPinButtonLoading(true);
    const result = await getVerifiedLocation();
    setPinButtonLoading(false);

    if (result.status === "denied") {
      setShowPermissionModal(true);
      return;
    }
    if (result.status === "unavailable" || !isInsideCordova(result.coords.latitude, result.coords.longitude)) {
      setCitizenOutsideCordova(true);
      return;
    }

    setPinMode(true);
  };
```

Update the `<PinButton>` JSX to pass the new props:

```tsx
        <PinButton
          ref={pinTargetRef}
          active={pinMode}
          loading={pinButtonLoading}
          disabled={citizenOutsideCordova}
          onPress={handleTogglePinMode}
          style={{
            bottom:
              insets.bottom + SPACING.lg + 44 + SPACING.sm + 88 + SPACING.sm,
          }}
        />
```

Add the two modals right before the closing `</View>` of the top-level `return` (after the existing `{showMapGuide ? (...) : null}` block):

```tsx
      <GeofenceBlockedModal
        visible={citizenOutsideCordova}
        variant="reporting-unavailable"
        onDismiss={() => setCitizenOutsideCordova(false)}
      />

      <GeofenceBlockedModal
        visible={showPermissionModal}
        variant="permission-required"
        onDismiss={() => setShowPermissionModal(false)}
        onRetry={() => {
          setShowPermissionModal(false);
          handleTogglePinMode();
        }}
      />
```

- [ ] **Step 3: Manually verify**

On a real device (or a simulator with a mocked location outside Cordova, e.g. Xcode Simulator's custom location or Android emulator's extended controls):
- With location permission denied: tap the Pin button → "Location Permission Required" modal appears with Open Settings / Retry; Pin button never enters active state.
- With location set to somewhere outside Cordova (e.g. Lapu-Lapu City): tap the Pin button → "Reporting Not Available" modal appears; pin mode never activates.
- Simulate the device moving from inside to outside Cordova while the screen is open (e.g. via simulator location simulation) → after two consecutive outside GPS updates, the Pin button visually dims/disables and the "Reporting Not Available" modal appears once (not repeatedly on every subsequent update).
- Move back inside Cordova → the disabled state and modal both clear, Pin button works normally again.
- With location genuinely inside Cordova: tap Pin → brief spinner on the button → pin mode activates normally.

- [ ] **Step 4: Commit**

```bash
git add components/map/PinButton.tsx "app/(tabs)/map.tsx"
git commit -m "feat: gate pin mode behind a fresh in-Cordova GPS check"
```

---

## Task 11: Frontend — report submit gating

**Repo:** `C:\CORDOVA RISKQ\CordovaRiskQ-Frontend`

**Files:**
- Modify: `services/report.service.ts`
- Modify: `app/(tabs)/report.tsx`

**Interfaces:**
- Consumes: `getVerifiedLocation` (Task 8), `isInsideCordova` (Task 4), `GeofenceBlockedModal` (Task 7).
- Produces: `createReport`'s payload gains `reporterLatitude`/`reporterLongitude` (matches the backend's Task 3 schema).

- [ ] **Step 1: Add the reporter-GPS fields to `createReport`'s payload type**

In `services/report.service.ts`, change:

```ts
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
```

to:

```ts
export async function createReport(
  token: string,
  payload: {
    category: CategoryId;
    details: string;
    locationLabel: string;
    latitude: number;
    longitude: number;
    reporterLatitude: number;
    reporterLongitude: number;
  },
) {
```

- [ ] **Step 2: Add the submit-phase state machine to `report.tsx`**

Add imports:

```ts
import GeofenceBlockedModal from "@/components/common/GeofenceBlockedModal";
import { getVerifiedLocation } from "@/services/location.service";
import { isInsideCordova } from "@/utils/geofence";
```

Add state (near the other `useState` declarations):

```ts
  const [submitPhase, setSubmitPhase] = useState<"idle" | "locating" | "submitting">("idle");
  const [geofenceModal, setGeofenceModal] = useState<"none" | "reporting-unavailable" | "permission-required">("none");
```

Replace `handleSubmit`:

```ts
  const handleSubmit = async () => {
    if (!category || details.trim().length === 0 || !token) return;

    setSubmitPhase("locating");
    const result = await getVerifiedLocation();

    if (result.status === "denied") {
      setSubmitPhase("idle");
      setGeofenceModal("permission-required");
      return;
    }
    if (result.status === "unavailable" || !isInsideCordova(result.coords.latitude, result.coords.longitude)) {
      setSubmitPhase("idle");
      setGeofenceModal("reporting-unavailable");
      return;
    }
    if (!isInsideCordova(activeLocation.latitude, activeLocation.longitude)) {
      setSubmitPhase("idle");
      setGeofenceModal("reporting-unavailable");
      return;
    }

    setSubmitPhase("submitting");
    try {
      const submitResult = await createReport(token, {
        category,
        details,
        locationLabel: activeLocation.address,
        latitude: activeLocation.latitude,
        longitude: activeLocation.longitude,
        reporterLatitude: result.coords.latitude,
        reporterLongitude: result.coords.longitude,
      });
      router.push({
        pathname: "/report-confirmation",
        params: { ref: submitResult.ref, category, location: activeLocation.address },
      });
    } catch (err) {
      Alert.alert(
        "Couldn't submit report",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSubmitPhase("idle");
    }
  };
```

Update the submit button's JSX and add a locating caption plus the modal. Change:

```tsx
        <View ref={submitTargetRef} collapsable={false}>
          <PrimaryButton
            title="Submit Report"
            onPress={handleSubmit}
            disabled={!canSubmit}
          />
        </View>
```

to:

```tsx
        <View ref={submitTargetRef} collapsable={false}>
          {submitPhase === "locating" && (
            <Text style={styles.locatingCaption}>Getting your accurate location...</Text>
          )}
          <PrimaryButton
            title="Submit Report"
            onPress={handleSubmit}
            disabled={!canSubmit || submitPhase !== "idle"}
            loading={submitPhase !== "idle"}
          />
        </View>
```

Add the modal right before the closing `</View>` of the top-level `return` (after the existing `{showReportGuide ? (...) : null}` block):

```tsx
      <GeofenceBlockedModal
        visible={geofenceModal !== "none"}
        variant={geofenceModal === "permission-required" ? "permission-required" : "reporting-unavailable"}
        onDismiss={() => setGeofenceModal("none")}
        onRetry={() => {
          setGeofenceModal("none");
          handleSubmit();
        }}
      />
```

Add the `locatingCaption` style to `createStyles` (alongside `optionalTag`):

```ts
    locatingCaption: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
      textAlign: "center",
      marginBottom: SPACING.xs,
    },
```

- [ ] **Step 3: Manually verify**

Fill in a category and details, then tap Submit:
- With location inside Cordova: brief "Getting your accurate location..." caption + spinner, then the report submits and navigates to the confirmation screen as before.
- With location permission denied: "Location Permission Required" modal appears; report is not submitted.
- With location resolvable but outside Cordova: "Reporting Not Available" modal appears; report is not submitted.
- Confirm the button is disabled (can't double-submit) for the whole `locating`/`submitting` duration.

- [ ] **Step 4: Commit**

```bash
git add services/report.service.ts "app/(tabs)/report.tsx"
git commit -m "feat: gate incident report submission behind a fresh in-Cordova GPS check"
```

---

## Task 12: Frontend — SOS hard block

**Repo:** `C:\CORDOVA RISKQ\CordovaRiskQ-Frontend`

**Files:**
- Modify: `services/sos.service.ts`
- Modify: `context/SosContext.tsx`
- Modify: `components/sos/SosOverlay.tsx`

**Interfaces:**
- Consumes: `getVerifiedLocation` (Task 8), `isInsideCordova` (Task 4), `GeofenceBlockedModal` (Task 7).
- Produces: `triggerSOS` is only ever called with a verified, in-Cordova coordinate; `SosStage` gains `"verifying"`.

- [ ] **Step 1: Make `triggerSOS`'s location required**

In `services/sos.service.ts`, change:

```ts
export async function triggerSOS(
  token: string,
  location?: Coordinates,
  locationLabel?: string,
): Promise<SosAlert> {
  const response = await apiPost<{ success: true; alert: SosAlert }>(
    "/api/sos",
    { ...location, ...(locationLabel ? { locationLabel } : {}) },
    token,
  );
  return response.alert;
}
```

to:

```ts
export async function triggerSOS(
  token: string,
  location: Coordinates,
  locationLabel?: string,
): Promise<SosAlert> {
  const response = await apiPost<{ success: true; alert: SosAlert }>(
    "/api/sos",
    { ...location, ...(locationLabel ? { locationLabel } : {}) },
    token,
  );
  return response.alert;
}
```

- [ ] **Step 2: Add the `verifying` stage and hard-block logic to `SosContext`**

Replace the full contents of `context/SosContext.tsx`:

```tsx
// context/SosContext.tsx
import React, { createContext, useContext, useMemo, useState } from "react";

import { getNearestBarangay } from "@/constants/cordovaBarangays";
import { useAuth } from "@/context/AuthContext";
import { getVerifiedLocation } from "@/services/location.service";
import { triggerSOS } from "@/services/sos.service";
import { isInsideCordova } from "@/utils/geofence";

type SosStage = "idle" | "confirm" | "verifying" | "active";
type SosBlockedReason = "permission" | "unavailable" | null;

type SosContextValue = {
  stage: SosStage;
  blockedReason: SosBlockedReason;
  openConfirm: () => void;
  confirmSOS: () => void;
  cancelSOS: () => void;
  dismissBlocked: () => void;
  retryConfirm: () => void;
};

const SosContext = createContext<SosContextValue | undefined>(undefined);

export function SosProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<SosStage>("idle");
  const [blockedReason, setBlockedReason] = useState<SosBlockedReason>(null);
  const { token } = useAuth();

  const runConfirm = async () => {
    setStage("verifying");
    const result = await getVerifiedLocation();

    if (result.status === "denied") {
      setStage("idle");
      setBlockedReason("permission");
      return;
    }
    if (result.status === "unavailable" || !isInsideCordova(result.coords.latitude, result.coords.longitude)) {
      setStage("idle");
      setBlockedReason("unavailable");
      return;
    }

    setStage("active");
    if (!token) return;

    const locationLabel = `Barangay ${getNearestBarangay(result.coords.latitude, result.coords.longitude).name}, Cordova`;
    triggerSOS(token, result.coords, locationLabel).catch((error) =>
      console.warn("Failed to send SOS alert", error),
    );
  };

  const value = useMemo(
    () => ({
      stage,
      blockedReason,
      openConfirm: () => setStage("confirm"),
      confirmSOS: () => {
        void runConfirm();
      },
      cancelSOS: () => setStage("idle"),
      dismissBlocked: () => setBlockedReason(null),
      retryConfirm: () => {
        setBlockedReason(null);
        void runConfirm();
      },
    }),
    [stage, blockedReason, token],
  );

  return <SosContext.Provider value={value}>{children}</SosContext.Provider>;
}

export function useSos() {
  const context = useContext(SosContext);

  if (!context) {
    throw new Error("useSos must be used within a SosProvider");
  }

  return context;
}
```

- [ ] **Step 3: Add the verifying view and blocked modal to `SosOverlay`**

In `components/sos/SosOverlay.tsx`, add imports:

```ts
import { ActivityIndicator } from "react-native";
import GeofenceBlockedModal, { type GeofenceModalVariant } from "@/components/common/GeofenceBlockedModal";
```

(add `ActivityIndicator` to the existing `react-native` import line rather than a separate one).

Change the top of the component:

```tsx
export default function SosOverlay() {
  const { stage, blockedReason, confirmSOS, cancelSOS, dismissBlocked, retryConfirm } = useSos();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const blockedVariant: GeofenceModalVariant | null =
    blockedReason === "permission"
      ? "permission-required"
      : blockedReason === "unavailable"
        ? "sos-unavailable"
        : null;

  return (
    <>
      {stage !== "idle" && (
        <View style={styles.container}>
          {stage === "confirm" ? (
            <ConfirmView onConfirm={confirmSOS} onCancel={cancelSOS} COLORS={COLORS} styles={styles} />
          ) : stage === "verifying" ? (
            <VerifyingView COLORS={COLORS} styles={styles} />
          ) : (
            <ActiveView onCancel={cancelSOS} COLORS={COLORS} styles={styles} />
          )}
        </View>
      )}

      <GeofenceBlockedModal
        visible={blockedVariant !== null}
        variant={blockedVariant ?? "sos-unavailable"}
        onDismiss={dismissBlocked}
        onRetry={retryConfirm}
      />
    </>
  );
}

function VerifyingView({
  COLORS,
  styles,
}: {
  COLORS: ColorPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.dialog}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.dialogTitle, { marginTop: SPACING.sm }]}>
          Getting your accurate location...
        </Text>
      </View>
    </View>
  );
}
```

(leave `ConfirmView` and `ActiveView` exactly as they are — only the top-level `SosOverlay` function and the new `VerifyingView` are added/changed. Note `SPACING` is already imported in this file.)

- [ ] **Step 4: Manually verify**

- With location inside Cordova: tap SOS → Confirm → "Getting your accurate location..." briefly → normal "Help Is On The Way" active screen, and confirm (e.g. via a network inspector or backend log) that `POST /api/sos` was actually called with the verified coordinates.
- With location permission denied: tap SOS → Confirm → verifying briefly → "Location Permission Required" modal (Open Settings / Retry) → confirm `POST /api/sos` was **never** called.
- With location resolvable but outside Cordova: tap SOS → Confirm → verifying briefly → "SOS Not Available" modal → confirm `POST /api/sos` was **never** called.
- Cancelling from the confirm dialog (before tapping "Send SOS") still works exactly as before, with no verifying step.

- [ ] **Step 5: Commit**

```bash
git add services/sos.service.ts context/SosContext.tsx components/sos/SosOverlay.tsx
git commit -m "feat: hard-block SOS outside Cordova with a verified GPS check"
```
