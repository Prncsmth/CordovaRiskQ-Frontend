# Responder Dashboard Barangay Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group the responder Dashboard's incident list by Barangay (derived client-side from each incident's coordinates), with Barangay sections prioritized by urgency and activity, so a responder can immediately see where incidents are happening.

**Architecture:** A new pure function (`groupIncidentsByBarangay`) turns the existing flat `Incident[]` into sorted `BarangayGroup[]`, reusing the project's existing `getNearestBarangay()` lookup for barangay assignment. The Dashboard screen (`app/responder/index.tsx`) switches from `FlatList` to `SectionList`, rendering one `BarangaySectionHeader` per group and the existing (lightly extended) `IncidentCard` per incident. No backend, API, or database changes.

**Tech Stack:** React Native + Expo Router, TypeScript, React Native Reanimated (existing), Jest + `jest-expo` (new, for this plan's unit tests).

**Spec:** `docs/superpowers/specs/2026-09-07-responder-barangay-grouping-design.md`

## Global Constraints

- No backend/API/database changes. Barangay is derived entirely client-side.
- No changes to incident status logic, accept/decline flow, or navigation behavior.
- No changes to existing Mapbox/map functionality beyond the one mechanical rename in Task 2.
- Responder screens continue to follow the app's existing light/dark theme toggle — do not force dark mode.
- Filters, search, and showing Barangay on `[id].tsx`/`navigate.tsx` are out of scope for this plan (Phase 2, separate spec).
- Only 3 urgency levels exist and are used: `"high" | "medium" | "low"` — no "critical" tier.
- Reuse `getNearestBarangay()` from `constants/cordovaBarangays.ts` for all barangay lookups — do not write a second implementation.

---

### Task 1: Add Jest test infrastructure

The project currently has zero test tooling (no Jest, no config, no `test` script). This task adds the minimum needed to unit-test the pure grouping function in Task 3.

**Files:**
- Create: `babel.config.js`
- Create: `jest.config.js`
- Modify: `package.json` (add `test` script)

**Interfaces:**
- Produces: a working `npm test` (`jest`) command that later tasks' test files run under.

- [ ] **Step 1: Install Jest dependencies**

Run:

```bash
npx expo install jest-expo jest @types/jest --dev
```

This installs versions compatible with the project's Expo SDK (57).
`babel-preset-expo` is already present as a transitive dependency
(verified: `node_modules/babel-preset-expo` v57.0.10), so it does not need
to be installed separately.

- [ ] **Step 2: Create `babel.config.js`**

Jest does not go through Metro, so it needs its own explicit Babel config
even though the app itself currently has none (Metro applies
`babel-preset-expo` implicitly).

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
```

- [ ] **Step 3: Create `jest.config.js`**

```js
module.exports = {
  preset: "jest-expo",
};
```

- [ ] **Step 4: Add the `test` script**

In `package.json`, add `"test": "jest"` to the `scripts` object (alongside
the existing `"lint": "expo lint"` line).

- [ ] **Step 5: Verify the harness boots**

Run: `npx jest`
Expected output includes `No tests found` (not a config or dependency
error) — this proves Jest, the Babel config, and the `jest-expo` preset
are wired correctly, even before any test files exist.

- [ ] **Step 6: Commit**

```bash
git add babel.config.js jest.config.js package.json package-lock.json
git commit -m "chore: add minimal Jest test infrastructure"
```

---

### Task 2: Consolidate the duplicate nearest-barangay lookup

`constants/cordovaBarangays.ts` has two near-identical functions:
`getNearestBarangay` (haversine-based, used by `home.tsx` and `report.tsx`)
and `findNearestBarangay` (squared-distance approximation, used only by
`map.tsx`). This task removes the duplicate before Task 3 adds a new
caller.

**Files:**
- Modify: `constants/cordovaBarangays.ts:55-69` (delete `findNearestBarangay`)
- Modify: `app/(tabs)/map.tsx:23` (import), `app/(tabs)/map.tsx:232` (call site)

**Interfaces:**
- Produces: `getNearestBarangay(latitude: number, longitude: number): Barangay` — the single canonical lookup, already exported, unchanged signature.

- [ ] **Step 1: Delete `findNearestBarangay` from `constants/cordovaBarangays.ts`**

Remove this entire block (currently lines 55-69):

```ts
// Nearest-barangay lookup by plain squared distance -- Cordova is small
// enough (a few km across) that this is accurate enough for labeling a
// pinned point without needing a real reverse-geocoding API.
export function findNearestBarangay(
  latitude: number,
  longitude: number,
): Barangay {
  return CORDOVA_BARANGAYS.reduce((closest, barangay) => {
    const d =
      (barangay.latitude - latitude) ** 2 + (barangay.longitude - longitude) ** 2;
    const closestD =
      (closest.latitude - latitude) ** 2 + (closest.longitude - longitude) ** 2;
    return d < closestD ? barangay : closest;
  });
}
```

- [ ] **Step 2: Update `app/(tabs)/map.tsx`'s import**

In the `@/constants/cordovaBarangays` import block, replace:

```ts
import {
    CORDOVA_BARANGAYS,
    CORDOVA_CENTER,
    findNearestBarangay,
    type Barangay,
} from "@/constants/cordovaBarangays";
```

with:

```ts
import {
    CORDOVA_BARANGAYS,
    CORDOVA_CENTER,
    getNearestBarangay,
    type Barangay,
} from "@/constants/cordovaBarangays";
```

- [ ] **Step 3: Update the one call site in `handleMapPress`**

Replace:

```ts
    const nearest = findNearestBarangay(coords.latitude, coords.longitude);
```

with:

```ts
    const nearest = getNearestBarangay(coords.latitude, coords.longitude);
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no new errors (the pre-existing, unrelated `components/tabs/TabBar.tsx` error may still appear — that's fine, it predates this work).

- [ ] **Step 5: Manually verify map pin-drop still works**

Open the app, go to Map, tap the pin button, tap a point on the map.
Confirm the report location still gets set with a "Near Barangay X,
Cordova" address, same as before.

- [ ] **Step 6: Commit**

```bash
git add constants/cordovaBarangays.ts "app/(tabs)/map.tsx"
git commit -m "refactor: consolidate duplicate nearest-barangay lookup"
```

---

### Task 3: Build `groupIncidentsByBarangay` with unit tests

The core grouping/prioritization logic, as a pure function — no React, no
hooks, fully unit-testable.

**Files:**
- Create: `components/responder/groupIncidentsByBarangay.ts`
- Test: `components/responder/groupIncidentsByBarangay.test.ts`

**Interfaces:**
- Consumes: `getNearestBarangay(latitude: number, longitude: number): Barangay` from `@/constants/cordovaBarangays` (Task 2); `type Incident` from `@/types/responder` (existing: `{ id, type, location, urgency: "high"|"medium"|"low", distanceKm?, status, maxResponders, team, etaMinutes?, responderCoords?, incidentCoords? }`).
- Produces:
  - `export type BarangayGroup = { id: string; name: string; incidents: Incident[]; hasHighUrgency: boolean; mostRecentFirstSeenAt: number }`
  - `export const UNKNOWN_LOCATION_ID = "unknown"`
  - `export const UNKNOWN_LOCATION_NAME = "Unknown Location"`
  - `export function sortIncidents(incidents: Incident[]): Incident[]` — sorts by urgency (high→medium→low) then `distanceKm` ascending (undefined last). Used by Task 6 (`app/responder/index.tsx` currently has its own copy at lines 49-63 that Task 6 removes in favor of this one).
  - `export function groupIncidentsByBarangay(incidents: Incident[], firstSeenAt: Record<string, number>): BarangayGroup[]` — used by Task 6.

- [ ] **Step 1: Write the failing tests**

Create `components/responder/groupIncidentsByBarangay.test.ts`:

```ts
import {
  groupIncidentsByBarangay,
  sortIncidents,
  UNKNOWN_LOCATION_ID,
  UNKNOWN_LOCATION_NAME,
} from "./groupIncidentsByBarangay";
import type { Incident } from "@/types/responder";

// Exact coordinates of real entries in constants/cordovaBarangays.ts, so
// getNearestBarangay resolves them deterministically (distance to an
// identical point is always the minimum).
const BUAGSONG_COORDS = { latitude: 10.2507, longitude: 123.9403 };
const GABI_COORDS = { latitude: 10.2626, longitude: 123.9606 };
const POBLACION_COORDS = { latitude: 10.2525, longitude: 123.9502 };

function makeIncident(overrides: Partial<Incident> & { id: string }): Incident {
  return {
    type: "Test Incident",
    location: "Test Location",
    urgency: "low",
    status: "pending",
    maxResponders: 1,
    team: [],
    ...overrides,
  };
}

describe("sortIncidents", () => {
  it("sorts by urgency first, then by distance ascending with unknown distance last", () => {
    const incidents = [
      makeIncident({ id: "a", urgency: "low", distanceKm: 1 }),
      makeIncident({ id: "b", urgency: "high" }),
      makeIncident({ id: "c", urgency: "high", distanceKm: 3 }),
    ];

    const sorted = sortIncidents(incidents);

    expect(sorted.map((i) => i.id)).toEqual(["c", "b", "a"]);
  });
});

describe("groupIncidentsByBarangay", () => {
  it("returns an empty array for no incidents", () => {
    expect(groupIncidentsByBarangay([], {})).toEqual([]);
  });

  it("groups incidents by nearest barangay and sorts within a group", () => {
    const incidents = [
      makeIncident({ id: "a", urgency: "low", distanceKm: 2, incidentCoords: BUAGSONG_COORDS }),
      makeIncident({ id: "b", urgency: "high", distanceKm: 5, incidentCoords: BUAGSONG_COORDS }),
      makeIncident({ id: "c", urgency: "high", distanceKm: 1, incidentCoords: BUAGSONG_COORDS }),
    ];

    const groups = groupIncidentsByBarangay(incidents, {});

    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("Buagsong");
    expect(groups[0].incidents.map((i) => i.id)).toEqual(["c", "b", "a"]);
  });

  it("prioritizes a barangay with a high-urgency incident over one with more incidents but no high urgency", () => {
    const incidents = [
      makeIncident({ id: "gabi-1", urgency: "medium", incidentCoords: GABI_COORDS }),
      makeIncident({ id: "gabi-2", urgency: "medium", incidentCoords: GABI_COORDS }),
      makeIncident({ id: "gabi-3", urgency: "low", incidentCoords: GABI_COORDS }),
      makeIncident({ id: "buagsong-1", urgency: "high", incidentCoords: BUAGSONG_COORDS }),
    ];

    const groups = groupIncidentsByBarangay(incidents, {});

    expect(groups.map((g) => g.name)).toEqual(["Buagsong", "Gabi"]);
  });

  it("breaks a tie in urgency by incident count", () => {
    const incidents = [
      makeIncident({ id: "gabi-1", urgency: "medium", incidentCoords: GABI_COORDS }),
      makeIncident({ id: "buagsong-1", urgency: "medium", incidentCoords: BUAGSONG_COORDS }),
      makeIncident({ id: "buagsong-2", urgency: "low", incidentCoords: BUAGSONG_COORDS }),
    ];

    const groups = groupIncidentsByBarangay(incidents, {});

    expect(groups.map((g) => g.name)).toEqual(["Buagsong", "Gabi"]);
  });

  it("breaks a tie in urgency and count by most recent first-seen activity", () => {
    const incidents = [
      makeIncident({ id: "gabi-1", urgency: "medium", incidentCoords: GABI_COORDS }),
      makeIncident({ id: "buagsong-1", urgency: "medium", incidentCoords: BUAGSONG_COORDS }),
    ];
    const firstSeenAt = { "gabi-1": 1000, "buagsong-1": 2000 };

    const groups = groupIncidentsByBarangay(incidents, firstSeenAt);

    expect(groups.map((g) => g.name)).toEqual(["Buagsong", "Gabi"]);
  });

  it("falls back to alphabetical order as the final tie-breaker", () => {
    const incidents = [
      makeIncident({ id: "gabi-1", urgency: "medium", incidentCoords: GABI_COORDS }),
      makeIncident({ id: "buagsong-1", urgency: "medium", incidentCoords: BUAGSONG_COORDS }),
    ];

    const groups = groupIncidentsByBarangay(incidents, {});

    expect(groups.map((g) => g.name)).toEqual(["Buagsong", "Gabi"]);
  });

  it("always sorts the Unknown Location bucket last, even with a high-urgency incident", () => {
    const incidents = [
      makeIncident({ id: "unknown-1", urgency: "high" }),
      makeIncident({ id: "poblacion-1", urgency: "low", incidentCoords: POBLACION_COORDS }),
    ];

    const groups = groupIncidentsByBarangay(incidents, {});

    expect(groups.map((g) => g.id)).toEqual(["poblacion", "unknown"]);
    expect(groups[1].name).toBe(UNKNOWN_LOCATION_NAME);
    expect(groups[1].id).toBe(UNKNOWN_LOCATION_ID);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest groupIncidentsByBarangay`
Expected: FAIL — `Cannot find module './groupIncidentsByBarangay'` (the
implementation file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `components/responder/groupIncidentsByBarangay.ts`:

```ts
// components/responder/groupIncidentsByBarangay.ts
// Groups the responder Dashboard's incidents by Barangay (derived from
// each incident's coordinates) and orders both the groups and the
// incidents within them so the most urgent, most active locations surface
// first. See docs/superpowers/specs/2026-09-07-responder-barangay-grouping-design.md.
import { getNearestBarangay } from "@/constants/cordovaBarangays";
import type { Incident } from "@/types/responder";

export const UNKNOWN_LOCATION_ID = "unknown";
export const UNKNOWN_LOCATION_NAME = "Unknown Location";

export type BarangayGroup = {
  id: string;
  name: string;
  incidents: Incident[];
  hasHighUrgency: boolean;
  mostRecentFirstSeenAt: number;
};

const URGENCY_RANK: Record<Incident["urgency"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function sortIncidents(incidents: Incident[]): Incident[] {
  return [...incidents].sort((a, b) => {
    const rankDiff = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (rankDiff !== 0) return rankDiff;
    if (a.distanceKm == null) return b.distanceKm == null ? 0 : 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });
}

export function groupIncidentsByBarangay(
  incidents: Incident[],
  firstSeenAt: Record<string, number>,
): BarangayGroup[] {
  const groups = new Map<string, BarangayGroup>();

  for (const incident of incidents) {
    const { id, name } = incident.incidentCoords
      ? getNearestBarangay(
          incident.incidentCoords.latitude,
          incident.incidentCoords.longitude,
        )
      : { id: UNKNOWN_LOCATION_ID, name: UNKNOWN_LOCATION_NAME };

    let group = groups.get(id);
    if (!group) {
      group = {
        id,
        name,
        incidents: [],
        hasHighUrgency: false,
        mostRecentFirstSeenAt: 0,
      };
      groups.set(id, group);
    }

    group.incidents.push(incident);
    if (incident.urgency === "high") group.hasHighUrgency = true;
    const seenAt = firstSeenAt[incident.id] ?? 0;
    if (seenAt > group.mostRecentFirstSeenAt) group.mostRecentFirstSeenAt = seenAt;
  }

  for (const group of groups.values()) {
    group.incidents = sortIncidents(group.incidents);
  }

  return [...groups.values()].sort((a, b) => {
    if (a.id === UNKNOWN_LOCATION_ID) return b.id === UNKNOWN_LOCATION_ID ? 0 : 1;
    if (b.id === UNKNOWN_LOCATION_ID) return -1;

    if (a.hasHighUrgency !== b.hasHighUrgency) return a.hasHighUrgency ? -1 : 1;
    if (a.incidents.length !== b.incidents.length) {
      return b.incidents.length - a.incidents.length;
    }
    if (a.mostRecentFirstSeenAt !== b.mostRecentFirstSeenAt) {
      return b.mostRecentFirstSeenAt - a.mostRecentFirstSeenAt;
    }
    return a.name.localeCompare(b.name);
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest groupIncidentsByBarangay`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add components/responder/groupIncidentsByBarangay.ts components/responder/groupIncidentsByBarangay.test.ts
git commit -m "feat: add barangay grouping and prioritization logic"
```

---

### Task 4: Add `BarangaySectionHeader` component

**Files:**
- Create: `components/responder/BarangaySectionHeader.tsx`

**Interfaces:**
- Consumes: `type BarangayGroup` from `@/components/responder/groupIncidentsByBarangay` (Task 3); `type Urgency` from `@/types/responder` (existing: `"high" | "medium" | "low"`); `useThemeColors`, `RADIUS`, `SPACING`, `TYPOGRAPHY`, `type ColorPalette` from `@/theme` (existing).
- Produces: `export default function BarangaySectionHeader({ group }: { group: BarangayGroup }): JSX.Element` — used by Task 6.

- [ ] **Step 1: Create the component**

```tsx
// components/responder/BarangaySectionHeader.tsx
// Section header for one Barangay's group of incidents on the responder
// Dashboard -- shows the Barangay name, its active incident count, and a
// severity dot colored by the most urgent incident in the group (the
// group's incidents are already sorted urgency-first by
// groupIncidentsByBarangay, so incidents[0].urgency is that value).
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BarangayGroup } from "@/components/responder/groupIncidentsByBarangay";
import {
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Urgency } from "@/types/responder";

function severityColor(urgency: Urgency, COLORS: ColorPalette): string {
  if (urgency === "high") return COLORS.primary;
  if (urgency === "medium") return COLORS.warning;
  return COLORS.success;
}

export default function BarangaySectionHeader({ group }: { group: BarangayGroup }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const topUrgency: Urgency = group.incidents[0]?.urgency ?? "low";

  return (
    <View style={styles.row}>
      <View
        style={[styles.dot, { backgroundColor: severityColor(topUrgency, COLORS) }]}
      />
      <Text style={styles.name}>{group.name}</Text>
      <Text style={styles.count}>
        {group.incidents.length} Active Incident
        {group.incidents.length === 1 ? "" : "s"}
      </Text>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.xs,
      backgroundColor: COLORS.surface,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: RADIUS.full,
    },
    name: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "800",
      color: COLORS.text,
      letterSpacing: 0.3,
      textTransform: "uppercase",
    },
    count: {
      marginLeft: "auto",
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
      fontWeight: "600",
    },
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/responder/BarangaySectionHeader.tsx
git commit -m "feat: add BarangaySectionHeader component"
```

(No automated test for this task — it's a small presentational component with no branching logic beyond the already-tested `severityColor` mapping. It's wired into the screen and manually verified in Task 6.)

---

### Task 5: Add a time-ago caption to `IncidentCard`

**Files:**
- Modify: `components/responder/IncidentCard.tsx`

**Interfaces:**
- Consumes: `formatRelativeTime(value: string | Date): string` from `@/utils/formatter` (existing).
- Produces: `IncidentCard` now takes an additional required prop `firstSeenAt: number` (a `Date.now()`-style epoch millisecond timestamp, or `0` if unknown). Used by Task 6.

- [ ] **Step 1: Add the import**

In `components/responder/IncidentCard.tsx`, add to the imports:

```ts
import { formatRelativeTime } from "@/utils/formatter";
```

- [ ] **Step 2: Add the `firstSeenAt` prop**

Change the props type (currently):

```ts
export default function IncidentCard({
  incident,
  isNew,
  onPress,
}: {
  incident: Incident;
  isNew?: boolean;
  onPress: () => void;
}) {
```

to:

```ts
export default function IncidentCard({
  incident,
  isNew,
  firstSeenAt,
  onPress,
}: {
  incident: Incident;
  isNew?: boolean;
  firstSeenAt: number;
  onPress: () => void;
}) {
```

- [ ] **Step 3: Render the time caption**

Replace the existing distance/ETA text block:

```tsx
            <Text style={styles.cardDistance}>
              {incident.distanceKm != null
                ? `${incident.distanceKm.toFixed(1)} km`
                : "Distance unknown"}
              {incident.etaMinutes ? ` · ${incident.etaMinutes} min` : ""}
            </Text>
```

with:

```tsx
            <Text style={styles.cardDistance}>
              {firstSeenAt > 0
                ? `${formatRelativeTime(new Date(firstSeenAt)).toLowerCase()} · `
                : ""}
              {incident.distanceKm != null
                ? `${incident.distanceKm.toFixed(1)} km`
                : "Distance unknown"}
              {incident.etaMinutes ? ` · ${incident.etaMinutes} min` : ""}
            </Text>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: a new error at every current call site of `<IncidentCard ... />` missing the now-required `firstSeenAt` prop (only `app/responder/index.tsx`) — this is expected and gets fixed in Task 6. Confirm the error is exactly that (a missing-prop error on `IncidentCard`, nothing else new).

- [ ] **Step 5: Commit**

```bash
git add components/responder/IncidentCard.tsx
git commit -m "feat: add time-ago caption to IncidentCard"
```

---

### Task 6: Wire grouping into the Dashboard screen

Replaces the flat `FlatList` with a grouped `SectionList`, and fixes the
`firstSeenRef` bug this design surfaced: today, an incident already
pending on the very first load gets `firstSeenAt = 0`, which would make
Task 5's new time caption read "Just now" for something that could
already be old. This task separates "when did this device first observe
this incident" (always a real timestamp, used for the time caption and
group recency) from "was this incident present on the very first load"
(used only to gate the NEW badge).

**Files:**
- Modify: `app/responder/index.tsx`

**Interfaces:**
- Consumes: `groupIncidentsByBarangay`, `type BarangayGroup` from `@/components/responder/groupIncidentsByBarangay` (Task 3); `BarangaySectionHeader` from `@/components/responder/BarangaySectionHeader` (Task 4); `IncidentCard` with its new `firstSeenAt` prop (Task 5).

- [ ] **Step 1: Update imports**

Replace `FlatList` with `SectionList` in the `react-native` import
(currently line 13):

```ts
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
```

becomes:

```ts
import {
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
```

Add new imports (after the existing `IncidentCard`/`RButton` imports):

```ts
import BarangaySectionHeader from "@/components/responder/BarangaySectionHeader";
import { groupIncidentsByBarangay, type BarangayGroup } from "@/components/responder/groupIncidentsByBarangay";
```

- [ ] **Step 2: Remove the now-relocated `sortIncidents`/`URGENCY_RANK`**

Delete these lines (currently lines 49-63):

```ts
const URGENCY_RANK: Record<Incident["urgency"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function sortIncidents(incidents: Incident[]): Incident[] {
  return [...incidents].sort((a, b) => {
    const rankDiff = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (rankDiff !== 0) return rankDiff;
    if (a.distanceKm == null) return b.distanceKm == null ? 0 : 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });
}
```

`NEW_BADGE_DURATION_MS` and `POLL_INTERVAL_MS` (the lines above and below
this block) stay — only the sort helper and its rank map move to Task 3's
module.

- [ ] **Step 3: Fix `firstSeenRef` semantics and add `initialIncidentIdsRef`**

Replace the current ref declarations and comment (currently lines 87-92):

```ts
  // First-seen timestamp per incident id, used to show a "NEW" badge on
  // arrivals since the dashboard's last poll -- 0 marks an incident that
  // was already present on the very first load, so opening the dashboard
  // never floods it with "NEW" badges.
  const firstSeenRef = useRef<Record<string, number>>({});
  const hasLoadedOnceRef = useRef(false);
```

with:

```ts
  // Real first-observed timestamp per incident id -- always set to the
  // actual time this device first saw the incident. Used for the "time
  // ago" caption and the barangay group recency tiebreak. Never
  // special-cased to 0, so the time caption never reads "Just now" for an
  // incident that was already pending before this dashboard opened.
  const firstSeenRef = useRef<Record<string, number>>({});
  // Incident ids present at the very first successful load. Excluded
  // from the "NEW" badge forever, so opening the dashboard doesn't flood
  // it with NEW badges for incidents that were already pending. `null`
  // until the first load completes.
  const initialIncidentIdsRef = useRef<Set<string> | null>(null);
```

- [ ] **Step 4: Rewrite `loadIncidents`**

Replace the current `loadIncidents` body (currently lines 94-118):

```ts
  const loadIncidents = useCallback(
    async (responderLocation?: Coordinates) => {
      if (!token) return;
      const data = await getIncidents(token, responderLocation);
      const now = Date.now();
      for (const incident of data) {
        if (!(incident.id in firstSeenRef.current)) {
          firstSeenRef.current[incident.id] = hasLoadedOnceRef.current ? now : 0;
        }
      }
      hasLoadedOnceRef.current = true;
      const newIds = new Set(
        data
          .filter((incident) => {
            const firstSeenAt = firstSeenRef.current[incident.id];
            return firstSeenAt > 0 && now - firstSeenAt < NEW_BADGE_DURATION_MS;
          })
          .map((incident) => incident.id),
      );
      setNewIncidentIds(newIds);
      setIncidents(sortIncidents(data));
      setLastUpdatedAt(new Date());
    },
    [token],
  );
```

with:

```ts
  const loadIncidents = useCallback(
    async (responderLocation?: Coordinates) => {
      if (!token) return;
      const data = await getIncidents(token, responderLocation);
      const now = Date.now();

      for (const incident of data) {
        if (!(incident.id in firstSeenRef.current)) {
          firstSeenRef.current[incident.id] = now;
        }
      }
      if (initialIncidentIdsRef.current === null) {
        initialIncidentIdsRef.current = new Set(data.map((incident) => incident.id));
      }

      const newIds = new Set(
        data
          .filter((incident) => {
            if (initialIncidentIdsRef.current!.has(incident.id)) return false;
            const firstSeenAt = firstSeenRef.current[incident.id];
            return now - firstSeenAt < NEW_BADGE_DURATION_MS;
          })
          .map((incident) => incident.id),
      );

      setNewIncidentIds(newIds);
      setIncidents(data);
      setLastUpdatedAt(new Date());
    },
    [token],
  );
```

Note `setIncidents(data)` no longer sorts inline — sorting now happens
per-group inside `groupIncidentsByBarangay` (Step 6).

- [ ] **Step 5: Typecheck the ref/loadIncidents change in isolation**

Run: `npx tsc --noEmit -p .`
Expected: exactly the same single "missing `firstSeenAt` prop on
IncidentCard" error carried over from Task 5 (not fixed until Step 6
below), plus the pre-existing unrelated `TabBar.tsx` error. No other new
errors — confirms Steps 2-4 didn't break anything on their own.

- [ ] **Step 6: Compute grouped sections and switch to `SectionList`**

Add this derived value inside the component, after the `highUrgencyCount`/
`firstName` lines (currently lines 162-163):

```ts
  const sections = useMemo(
    () =>
      groupIncidentsByBarangay(incidents, firstSeenRef.current).map((group) => ({
        title: group,
        data: group.incidents,
      })),
    [incidents],
  );
```

Then replace the `FlatList` block (currently lines 307-325):

```tsx
        <FlatList
          data={incidents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          renderItem={({ item }) => (
            <IncidentCard
              incident={item}
              isNew={newIncidentIds.has(item.id)}
              onPress={() =>
                router.push({
                  pathname: "/responder/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
        />
```

with:

```tsx
        <SectionList<Incident, { title: BarangayGroup }>
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          renderSectionHeader={({ section }) => (
            <BarangaySectionHeader group={section.title} />
          )}
          renderItem={({ item }) => (
            <IncidentCard
              incident={item}
              isNew={newIncidentIds.has(item.id)}
              firstSeenAt={firstSeenRef.current[item.id] ?? 0}
              onPress={() =>
                router.push({
                  pathname: "/responder/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
        />
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no new errors (only the pre-existing, unrelated
`components/tabs/TabBar.tsx` error may remain).

- [ ] **Step 8: Run the full test suite**

Run: `npx jest`
Expected: PASS — the 8 tests from Task 3 still green (this task doesn't
touch `groupIncidentsByBarangay.ts`).

- [ ] **Step 9: Lint**

Run: `npx expo lint`
Expected: the same 53 pre-existing problems (45 errors/8 warnings) as
before this plan — confirm no new ones were introduced by this task. (If
the count differs, investigate before proceeding — see the "Verification"
step in the project's established pattern of tracing each new lint hit
back to `git show` on the pre-change file before treating it as
pre-existing.)

- [ ] **Step 10: Manually verify on device/simulator**

Confirm, with the responder Dashboard online and showing incidents from
2+ different barangays:
- Incidents are grouped under Barangay section headers, not one flat list.
- A barangay containing a high-urgency incident's section appears above
  ones that don't (all else equal).
- Each incident card shows a "Xm ago" caption that does **not** read
  "Just now" for incidents that were already present when the dashboard
  first loaded (this is the bug this task's `firstSeenRef` fix addresses).
- The "NEW" badge still only appears on incidents that arrive via a poll
  *after* the dashboard's first load, not on the initial batch.
- Pull-to-refresh still works.
- Tapping an incident card still opens its detail screen as before.

- [ ] **Step 11: Commit**

```bash
git add app/responder/index.tsx
git commit -m "feat: group responder dashboard incidents by barangay"
```

---

## Self-Review Notes

- **Spec coverage:** Barangay derivation (Task 3), consolidation of the
  duplicate lookup (Task 2), prioritization algorithm with all 4 tiers +
  unknown-location-last (Task 3, tested), redesigned card hierarchy via
  the time caption addition (Task 5), section header with count + severity
  dot (Task 4), `SectionList` wiring (Task 6), the `firstSeenRef` timing
  bug fix identified during design (Task 6). Explicitly-out-of-scope items
  (filters/search, detail-screen barangay display, forced dark mode,
  backend changes) have no tasks, matching the spec.
- **Type consistency:** `BarangayGroup` (Task 3) is consumed identically
  in Task 4's props and Task 6's `SectionList` generic and
  `renderSectionHeader` — same field names (`id`, `name`, `incidents`,
  `hasHighUrgency`, `mostRecentFirstSeenAt`) throughout. `IncidentCard`'s
  `firstSeenAt: number` prop (Task 5) matches exactly how Task 6 passes it
  (`firstSeenRef.current[item.id] ?? 0`).
- **No placeholders:** every step has runnable commands or complete code;
  none deferred to "similar to Task N."
