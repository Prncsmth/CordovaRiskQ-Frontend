# Responder Completed-Incidents History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a responder see every incident they personally worked that has since been marked completed, via a new page reachable from Settings.

**Architecture:** A new backend endpoint (`GET /api/incidents/completed`) scoped to the requesting responder's own non-declined roster participation, mirroring the existing `list`/`listMine`/`getById` controller pattern exactly. A new frontend screen mirrors the citizen "Report History" screen's structure (list + empty state) but uses the responder's own icon/color language and has no detail drill-down. Reached from a new Settings row shown only to responders.

**Tech Stack:** Express 5 + Prisma 7 (backend), Expo Router 57 + React Native + TypeScript strict (frontend), Jest (frontend tests), Node's built-in `tsx --test` (backend tests, none added by this plan).

**Spec:** `docs/superpowers/specs/2026-09-12-responder-completed-incidents-design.md`

## Global Constraints

- **No pagination** — mirrors `GET /api/incidents/mine`'s existing unpaginated list behavior.
- **Completed only, not cancelled** — explicit scope decision in the spec.
- **Only this responder's own incidents** — not a team-wide view.
- **No detail screen** — cards are not pressable; this is a read-only history list.
- **Route registration order matters**: `GET /incidents/completed` MUST be registered before `GET /incidents/:id` in `src/routes/incident.routes.ts`, or Express will greedily match "completed" as `:id`.
- **No backend test added** — matches this project's existing convention of not unit-testing Prisma-backed service methods (only pure logic files like `incidentRoster.ts` get unit tests).
- **One frontend unit test added** — for the pure `toCompletedIncident` mapping function, mirroring the existing `toIncident` test in the same file.

---

## Task 1: Backend service method

**Files:**
- Modify: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend\src\services\incident.service.ts`

**Interfaces:**
- Produces: `incidentService.listCompletedByResponder(responderId: string): Promise<Incident[]>` (Prisma's generated `Incident` model type — the raw row, same return shape as `list()`/`listByReporter()`) for Task 2 to call.

- [ ] **Step 1: Add the service method**

In `src/services/incident.service.ts`, add this method to the `incidentService` object, right after the existing `listByReporter` method (around line 276, immediately before the blank line preceding `async getById`):

```ts
    async listCompletedByResponder(responderId: string) {
        return prisma.incident.findMany({
            where: {
                status: "completed",
                responders: { some: { responderId, status: { not: "declined" } } },
            },
            orderBy: { updatedAt: "desc" },
        });
    },

```

- [ ] **Step 2: Verify**

Run: `cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend" && npx tsc --noEmit`
Expected: no errors.

Run: `cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend" && npm test`
Expected: 18/18 existing tests still pass (this method has no test of its own — see Global Constraints).

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend"
git add src/services/incident.service.ts
git commit -m "feat: add listCompletedByResponder service method"
```

---

## Task 2: Backend controller + route

**Files:**
- Modify: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend\src\controllers\incident.controller.ts`
- Modify: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend\src\routes\incident.routes.ts`

**Interfaces:**
- Consumes: `incidentService.listCompletedByResponder(responderId: string)` (Task 1).
- Produces: `GET /api/incidents/completed` → `{ success: true, incidents: IncidentRow[] }` (same row shape `GET /api/incidents` and `GET /api/incidents/mine` already return) for Task 3 (frontend) to call.

- [ ] **Step 1: Add the controller method**

In `src/controllers/incident.controller.ts`, add this method to the `incidentController` object, right after the existing `listMine` method (around line 21, immediately before the blank line preceding `getById`):

```ts
    listCompleted: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const incidents = await incidentService.listCompletedByResponder(req.userId!);
        res.status(200).json({ success: true, incidents });
    }),

```

- [ ] **Step 2: Register the route — BEFORE `/incidents/:id`**

In `src/routes/incident.routes.ts`, the current relevant lines (19-21) read:

```ts
router.get("/incidents", authenticate, incidentController.list);
router.get("/incidents/mine", authenticate, incidentController.listMine);
router.get("/incidents/:id", authenticate, incidentController.getById);
```

Change to:

```ts
router.get("/incidents", authenticate, incidentController.list);
router.get("/incidents/mine", authenticate, incidentController.listMine);
router.get("/incidents/completed", authenticate, incidentController.listCompleted);
router.get("/incidents/:id", authenticate, incidentController.getById);
```

(The new line goes between `/incidents/mine` and `/incidents/:id` — it must come before the `:id` wildcard route, per the Global Constraints note above.)

- [ ] **Step 3: Verify**

Run: `cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend" && npx tsc --noEmit`
Expected: no errors.

Run: `cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend" && npm test`
Expected: 18/18 existing tests still pass.

Manual check (route ordering): `grep -n "incidents/completed\|incidents/:id" src/routes/incident.routes.ts` — expected output shows `/incidents/completed` on a lower line number than `/incidents/:id`.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend"
git add src/controllers/incident.controller.ts src/routes/incident.routes.ts
git commit -m "feat: add GET /api/incidents/completed endpoint"
```

---

## Task 3: Frontend service, type, and test

**Files:**
- Modify: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend\responder\services\incident.service.ts`
- Modify: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend\responder\services\incident.service.test.ts`

**Interfaces:**
- Consumes: `GET /api/incidents/completed` (Task 2) — response shape `{ success: true; incidents: IncidentApiRow[] }` where each row now also carries `updatedAt: string`.
- Produces: `export type CompletedIncident = { id: string; type: string; location: string; completedDate: string; ref: string }`, `export function toCompletedIncident(row: IncidentApiRow): CompletedIncident`, `export async function getCompletedIncidents(token: string): Promise<CompletedIncident[]>` — for Task 4 (card) and Task 5 (screen) to import.

- [ ] **Step 1: Write the failing test**

In `responder/services/incident.service.test.ts`, add this `describe` block at the end of the file (after the existing `describe("toIncident", ...)` block, i.e. after its closing `});` on the current last line):

```ts

describe("toCompletedIncident", () => {
  it("maps an API row into a completed-incident history item", () => {
    const item = toCompletedIncident({
      id: "inc-3",
      category: "fire",
      locationLabel: "Near the market",
      latitude: 10.25,
      longitude: 123.95,
      urgency: "high",
      status: "completed",
      createdAt: "2026-01-01T12:00:00.000Z",
      updatedAt: "2026-01-03T09:30:00.000Z",
    });

    expect(item).toEqual({
      id: "inc-3",
      type: "Fire",
      location: "Near the market",
      completedDate: new Date("2026-01-03T09:30:00.000Z").toLocaleDateString(),
      ref: "INC-3",
    });
  });

  it("falls back to the raw category when it's not in CATEGORY_LABELS", () => {
    const item = toCompletedIncident({
      id: "inc-4",
      category: "unmapped-category",
      locationLabel: "Riverside",
      latitude: null,
      longitude: null,
      urgency: "low",
      status: "completed",
      createdAt: "2026-01-01T12:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });

    expect(item.type).toBe("unmapped-category");
  });
});
```

Also update the two existing `toIncident` fixtures (around lines 5-19 and 30-39) to each add `updatedAt: "2026-01-01T12:00:00.000Z",` right after their existing `createdAt` line — `IncidentApiRow` is about to gain a required `updatedAt` field (Step 3 below), and without this both existing tests will fail to type-check.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend" && npx jest responder/services/incident.service.test.ts`
Expected: FAIL — `toCompletedIncident` is not exported / not defined.

- [ ] **Step 3: Add `updatedAt` to `IncidentApiRow`**

In `responder/services/incident.service.ts`, the current `IncidentApiRow` type (lines 6-17) ends with `createdAt: string;`. Add one line:

```diff
   myStatus?: MyResponderStatus;
   createdAt: string;
+  updatedAt: string;
 };
```

- [ ] **Step 4: Add the type, mapping function, and service function**

In the same file, add this block right after the `toIncident` function's closing `}` (currently ends around line 51, right before `export async function getIncidents`):

```ts

export type CompletedIncident = {
  id: string;
  type: string;
  location: string;
  completedDate: string;
  ref: string;
};

export function toCompletedIncident(row: IncidentApiRow): CompletedIncident {
  return {
    id: row.id,
    type: CATEGORY_LABELS[row.category] ?? row.category,
    location: row.locationLabel,
    completedDate: formatDate(row.updatedAt),
    ref: row.id.slice(0, 8).toUpperCase(),
  };
}

export async function getCompletedIncidents(token: string): Promise<CompletedIncident[]> {
  const response = await apiGet<{ success: true; incidents: IncidentApiRow[] }>(
    "/api/incidents/completed",
    token,
  );
  return response.incidents.map(toCompletedIncident);
}
```

Add the missing import at the top of the file (alongside the existing `import { apiGet, ... } from "@/services/api";` line):

```ts
import { formatDate } from "@/utils/formatter";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend" && npx jest responder/services/incident.service.test.ts`
Expected: PASS, 4/4 tests (2 existing `toIncident` + 2 new `toCompletedIncident`).

- [ ] **Step 6: Verify the whole project**

Run: `cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend" && npx tsc --noEmit`
Expected: no errors except the one pre-existing, unrelated `components/tabs/TabBar.tsx(57,31)` error.

Run: `cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend" && npx jest --testPathIgnorePatterns="\.claude/worktrees"`
Expected: all suites pass (excludes unrelated nested worktree checkouts for other in-flight plans — established convention in this repo's history).

- [ ] **Step 7: Commit**

```bash
cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend"
git add responder/services/incident.service.ts responder/services/incident.service.test.ts
git commit -m "feat(responder): add getCompletedIncidents service function"
```

---

## Task 4: Card component

**Files:**
- Create: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend\responder\components\completed\CompletedIncidentCard.tsx`

**Interfaces:**
- Consumes: `CompletedIncident` type (Task 3), `getIncidentVisual(type: string): { icon: keyof typeof Ionicons.glyphMap; color: string }` (existing, `@/responder/components/shared/incidentVisual`).
- Produces: `export default function CompletedIncidentCard({ item }: { item: CompletedIncident })` for Task 5 to import.

- [ ] **Step 1: Create the component**

```tsx
// responder/components/completed/CompletedIncidentCard.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getIncidentVisual } from "@/responder/components/shared/incidentVisual";
import type { CompletedIncident } from "@/responder/services/incident.service";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

export default function CompletedIncidentCard({ item }: { item: CompletedIncident }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const visual = getIncidentVisual(item.type);

  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: `${visual.color}1A` }]}>
        <Ionicons name={visual.icon} size={18} color={visual.color} />
      </View>

      <View style={styles.textCol}>
        <Text style={styles.type} numberOfLines={1}>
          {item.type}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {item.location}
        </Text>
        <Text style={styles.meta}>
          {item.completedDate} · {item.ref}
        </Text>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      padding: SPACING.md,
      ...SHADOW,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
    },
    textCol: {
      flex: 1,
      gap: 2,
    },
    type: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.text,
    },
    location: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
    },
    meta: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
      marginTop: 2,
    },
  });
}
```

- [ ] **Step 2: Verify**

Run: `cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend" && npx tsc --noEmit`
Expected: no errors except the one pre-existing, unrelated `TabBar.tsx` error.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend"
git add responder/components/completed/CompletedIncidentCard.tsx
git commit -m "feat(responder): add CompletedIncidentCard component"
```

---

## Task 5: Screen + route stub

**Files:**
- Create: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend\responder\screens\CompletedIncidentsScreen.tsx`
- Create: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend\app\responder\completed.tsx`

**Interfaces:**
- Consumes: `getCompletedIncidents(token: string): Promise<CompletedIncident[]>` (Task 3), `CompletedIncidentCard` (Task 4), `EmptyState` (existing, `@/components/common/EmptyState`, props `{ icon?: keyof typeof Ionicons.glyphMap; message: string; subtitle?: string }`), `BackButton` (existing, `@/components/common/BackButton`, props `{ onPress: () => void; style?: StyleProp<ViewStyle> }`).
- Produces: default-exported `CompletedIncidentsScreen` component, re-exported at the `/responder/completed` route for Task 6 to link to.

- [ ] **Step 1: Create the screen**

```tsx
// responder/screens/CompletedIncidentsScreen.tsx
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuth } from "@/context/AuthContext";
import CompletedIncidentCard from "@/responder/components/completed/CompletedIncidentCard";
import { getCompletedIncidents } from "@/responder/services/incident.service";
import type { CompletedIncident } from "@/responder/services/incident.service";
import {
  FONT_FAMILY,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

export default function CompletedIncidentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [incidents, setIncidents] = useState<CompletedIncident[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token) return;

    getCompletedIncidents(token)
      .then(setIncidents)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [token]);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={styles.backButton} />
        <Text style={styles.headerTitle}>Completed Incidents</Text>
      </View>

      {loaded && incidents.length === 0 ? (
        <EmptyState
          icon="checkmark-done-outline"
          message="No completed incidents yet."
          subtitle="Incidents you resolve will appear here."
        />
      ) : (
        <View style={styles.list}>
          {incidents.length > 0 ? (
            <Text style={styles.sectionHeading}>
              {incidents.length} {incidents.length === 1 ? "Incident" : "Incidents"}
            </Text>
          ) : null}
          {incidents.map((item) => (
            <CompletedIncidentCard key={item.id} item={item} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    content: {
      paddingHorizontal: SPACING.md,
      gap: SPACING.lg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    backButton: {
      position: "absolute",
      left: 0,
    },
    headerTitle: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.subtitle,
      color: COLORS.text,
    },
    sectionHeading: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginLeft: 2,
    },
    list: {
      gap: SPACING.sm,
    },
  });
}
```

- [ ] **Step 2: Create the route stub**

```ts
// app/responder/completed.tsx
export { default } from "@/responder/screens/CompletedIncidentsScreen";
```

- [ ] **Step 3: Verify**

Run: `cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend" && npx tsc --noEmit`
Expected: no errors except the one pre-existing, unrelated `TabBar.tsx` error.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend"
git add responder/screens/CompletedIncidentsScreen.tsx app/responder/completed.tsx
git commit -m "feat(responder): add Completed Incidents screen and route"
```

---

## Task 6: Settings entry point

**Files:**
- Modify: `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend\app\settings\index.tsx`

**Interfaces:**
- Consumes: the `/responder/completed` route (Task 5).

- [ ] **Step 1: Add the new row**

In `app/settings/index.tsx`, the current `accountRows` array (lines 58-78) reads:

```ts
  const accountRows: NavRow[] = [
    {
      key: "user-profile",
      icon: "person-outline",
      label: "User Profile",
      onPress: () => router.push("/user-profile"),
    },
    {
      key: "change-password",
      icon: "lock-closed-outline",
      label: "Change Password",
      onPress: () => router.push("/change-password"),
    },
    {
      key: "logout",
      icon: "log-out-outline",
      label: "Log Out",
      onPress: handleLogout,
      danger: true,
    },
  ];
```

Change to:

```ts
  const accountRows: NavRow[] = [
    {
      key: "user-profile",
      icon: "person-outline",
      label: "User Profile",
      onPress: () => router.push("/user-profile"),
    },
    {
      key: "change-password",
      icon: "lock-closed-outline",
      label: "Change Password",
      onPress: () => router.push("/change-password"),
    },
    ...(isResponder
      ? [
          {
            key: "completed-incidents",
            icon: "checkmark-done-outline",
            label: "Completed Incidents",
            onPress: () => router.push("/responder/completed"),
          } satisfies NavRow,
        ]
      : []),
    {
      key: "logout",
      icon: "log-out-outline",
      label: "Log Out",
      onPress: handleLogout,
      danger: true,
    },
  ];
```

(This is the exact same conditional-spread pattern already used later in the same file for `supportRows`'s `view-tutorial` row — `isResponder` is already computed at the top of the component, no new logic needed.)

- [ ] **Step 2: Verify**

Run: `cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend" && npx tsc --noEmit`
Expected: no errors except the one pre-existing, unrelated `TabBar.tsx` error.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend"
git add app/settings/index.tsx
git commit -m "feat(responder): link Completed Incidents from Settings"
```

---

## Task 7: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full backend check**

Run: `cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend" && npx tsc --noEmit && npm test`
Expected: clean type-check, 18/18 tests pass.

- [ ] **Step 2: Full frontend check**

Run: `cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend" && npx tsc --noEmit`
Expected: no errors except the one pre-existing, unrelated `TabBar.tsx` error.

Run: `cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend" && npx jest --testPathIgnorePatterns="\.claude/worktrees"`
Expected: all suites pass, including the 2 new `toCompletedIncident` tests from Task 3.

- [ ] **Step 3: Bundle check (no device available in this environment)**

Run: `cd "C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Frontend" && npx expo export --platform web`
Expected: succeeds with zero resolution errors, and the output includes a route for `/responder/completed`.

- [ ] **Step 4: Manual walkthrough (flag as still needed)**

No device/simulator is available in this environment. Before treating this feature as fully shipped, a human should: mark an incident resolved as a responder, open Settings → Completed Incidents, and confirm it appears with the correct type/location/date. Report this as an open item if Steps 1-3 are clean but this hasn't been done yet.

- [ ] **Step 5: Commit (only if a fix was needed)**

If Steps 1-3 are clean, there is nothing to commit here. If something needed fixing, fix it, re-run Steps 1-3, and commit:

```bash
git add -A
git commit -m "fix: correct issue found in completed-incidents verification"
```
