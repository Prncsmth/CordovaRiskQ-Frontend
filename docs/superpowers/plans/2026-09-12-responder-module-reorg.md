# Responder Module Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all responder-domain code (components, services, types, theme colors, and screens) out of the app's shared top-level folders into one new `responder/` module organized by which screen owns each piece, with `app/responder/*.tsx` route files reduced to one-line re-exports.

**Architecture:** A new top-level `responder/` folder (sibling to `app/`, `components/`, `services/`, `types/`, `theme/`) holds `screens/`, `components/{dashboard,incident-detail,shared}/`, `services/`, `types/`, `theme/`. Each task moves one dependency layer (types → theme → services → shared components → dashboard components → incident-detail components → screens/routes) and fixes every reference to that layer everywhere in the codebase in the same task, so every task leaves the project fully type-checking and passing tests — no task depends on a later task's move having already happened.

**Tech Stack:** Expo 57 / Expo Router 57 (file-based routing, `@/*` → repo root path alias per `tsconfig.json`), React Native 0.86, TypeScript strict mode, Jest (`jest-expo` preset, no custom `testMatch`/path restriction).

**Spec:** `docs/superpowers/specs/2026-09-11-responder-module-reorg-design.md`

## Global Constraints

- **No behavior change.** This is a pure structural refactor — same URLs, same components, same runtime behavior, same test assertions. If a step would change behavior, stop and flag it rather than proceeding.
- **Route paths are fixed.** `app/responder/index.tsx`, `app/responder/[id].tsx`, `app/responder/navigate.tsx`, `app/responder/welcome.tsx`, `app/responder/_layout.tsx` must keep their exact filenames and location — Expo Router resolves routes by file path. Only the *contents* of the four screen files change (to one-line re-exports); `_layout.tsx` doesn't change at all.
- **No barrel files.** Neither the old code nor this reorg uses an `index.ts` re-export barrel anywhere in the responder area — every import is a direct path to the specific file. Do not introduce one.
- **`@/*` resolves to the repo root** (`tsconfig.json`'s `paths`), so `@/responder/...` works the moment the `responder/` folder exists — no tsconfig change needed.
- **Use `git mv`** for every file relocation (preserves history), never delete+recreate.
- **Each task must leave `npx tsc --noEmit` clean and the relevant Jest tests passing** before its commit — fix every reference to a moved file in the same task as the move, even in files that haven't themselves moved yet.

---

## Task 1: Move `types/responder.ts`

**Files:**
- Move: `types/responder.ts` → `responder/types/responder.ts`
- Modify (import path only, `"@/types/responder"` → `"@/responder/types/responder"`):
  - `services/incidentSocket.service.ts`
  - `services/incident.service.ts`
  - `app/responder/index.tsx`
  - `app/responder/navigate.tsx`
  - `app/responder/[id].tsx`
  - `components/responder/BarangaySectionHeader.tsx`
  - `components/responder/filterIncidents.ts`
  - `components/responder/filterIncidents.test.ts`
  - `components/responder/groupIncidentsByBarangay.ts`
  - `components/responder/groupIncidentsByBarangay.test.ts`
  - `components/responder/IncidentCard.tsx`
  - `components/responder/IncidentFilterBar.tsx`
  - `components/responder/incident-detail/ArrivedView.tsx`
  - `components/responder/incident-detail/OnTheWayView.tsx`
  - `components/responder/incident-detail/LobbyView.tsx`
  - `components/responder/incident-detail/PendingView.tsx`
  - `components/responder/mergeIncidentUpdate.ts`
  - `components/responder/mergeIncidentUpdate.test.ts`
  - `components/responder/phaseForMyStatus.ts`
  - `components/responder/responderStatusColors.ts`
  - `components/responder/selectNearestIncidents.ts`
  - `components/responder/selectNearestIncidents.test.ts`
  - `components/responder/TeamMemberRow.tsx`
  - `components/responder/UrgencyBadge.tsx`

**Interfaces:**
- Produces: `responder/types/responder.ts` exporting the same types as before (`Urgency`, `IncidentStatus`, `MyResponderStatus`, `ResponderStatus`, `Coordinates`, `TeamMember`, `Incident`) — unchanged content, only its path changes. All later tasks import types from `@/responder/types/responder`.

- [ ] **Step 1: Move the file**

```bash
git mv types/responder.ts responder/types/responder.ts
```

- [ ] **Step 2: Fix every import**

In each file below, replace the quoted import path `"@/types/responder"` with `"@/responder/types/responder"` (the imported names on that line don't change — only the path string):

| File |
|---|
| `services/incidentSocket.service.ts` |
| `services/incident.service.ts` |
| `app/responder/index.tsx` |
| `app/responder/navigate.tsx` |
| `app/responder/[id].tsx` |
| `components/responder/BarangaySectionHeader.tsx` |
| `components/responder/filterIncidents.ts` |
| `components/responder/filterIncidents.test.ts` |
| `components/responder/groupIncidentsByBarangay.ts` |
| `components/responder/groupIncidentsByBarangay.test.ts` |
| `components/responder/IncidentCard.tsx` |
| `components/responder/IncidentFilterBar.tsx` |
| `components/responder/incident-detail/ArrivedView.tsx` |
| `components/responder/incident-detail/OnTheWayView.tsx` |
| `components/responder/incident-detail/LobbyView.tsx` |
| `components/responder/incident-detail/PendingView.tsx` |
| `components/responder/mergeIncidentUpdate.ts` |
| `components/responder/mergeIncidentUpdate.test.ts` |
| `components/responder/phaseForMyStatus.ts` |
| `components/responder/responderStatusColors.ts` |
| `components/responder/selectNearestIncidents.ts` |
| `components/responder/selectNearestIncidents.test.ts` |
| `components/responder/TeamMemberRow.tsx` |
| `components/responder/UrgencyBadge.tsx` |

Example (identical pattern in every file above, only the imported names differ):
```diff
-import type { Incident } from "@/types/responder";
+import type { Incident } from "@/responder/types/responder";
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors referencing `types/responder` or any file in the table above.

Run: `npx jest components/responder services/incident.service.test.ts`
Expected: all PASS (these are the old paths — none of these files have moved yet).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(responder): move types/responder.ts into responder/types/"
```

---

## Task 2: Move `theme/responderColors.ts`

**Files:**
- Move: `theme/responderColors.ts` → `responder/theme/responderColors.ts`

**Interfaces:**
- Produces: `responder/theme/responderColors.ts` exporting `RESPONDER_COLORS`, unchanged content.
- Note: a repo-wide grep confirms `RESPONDER_COLORS` has zero current importers (it was used by `app/responder/index.tsx` at an earlier point in the codebase's history but that usage has since been removed) and it was never re-exported through `theme/index.ts`'s barrel. This step is a pure move with no import fixups.

- [ ] **Step 1: Move the file**

```bash
git mv theme/responderColors.ts responder/theme/responderColors.ts
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `grep -rn "RESPONDER_COLORS" --include="*.ts*" app components services types theme responder` (excluding `.claude/worktrees`)
Expected: only the definition itself, in `responder/theme/responderColors.ts`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor(responder): move theme/responderColors.ts into responder/theme/"
```

---

## Task 3: Move `services/incident.service.ts` (+ test) and `services/incidentSocket.service.ts`

**Files:**
- Move: `services/incident.service.ts` → `responder/services/incident.service.ts`
- Move: `services/incident.service.test.ts` → `responder/services/incident.service.test.ts`
- Move: `services/incidentSocket.service.ts` → `responder/services/incidentSocket.service.ts`
- Modify (relative imports broken by the move, plus consumer import paths):
  - `responder/services/incident.service.ts` (its own relative imports)
  - `responder/services/incidentSocket.service.ts` (its own relative import)
  - `app/responder/index.tsx`
  - `app/responder/navigate.tsx`
  - `app/responder/[id].tsx`
  - `components/responder/mergeIncidentUpdate.ts`

**Interfaces:**
- Consumes: `@/responder/types/responder` (from Task 1).
- Produces: `responder/services/incident.service.ts` exporting the same functions as before (`toIncident`, `getIncidents`, `getIncidentById`, `joinIncident`, `declineIncident`, `updateMyResponderStatus`, `ringTeam`, `updateIncidentStatus`) and `responder/services/incidentSocket.service.ts` exporting `connectToIncidentSocket` and the `IncidentRealtimeUpdate` type — unchanged behavior, new import path `@/responder/services/incident.service` / `@/responder/services/incidentSocket.service` for all later tasks.

- [ ] **Step 1: Move the files**

```bash
git mv services/incident.service.ts responder/services/incident.service.ts
git mv services/incident.service.test.ts responder/services/incident.service.test.ts
git mv services/incidentSocket.service.ts responder/services/incidentSocket.service.ts
```

- [ ] **Step 2: Fix the two service files' own relative imports**

`services/api.ts` and `services/location.service.ts` are generic, app-wide services and are **not** moving — `incident.service.ts` and `incidentSocket.service.ts` used relative imports to reach them as siblings, which breaks now that they've moved to `responder/services/`. In `responder/services/incident.service.ts`:

```diff
-import { apiGet, apiPatch, apiPost } from "./api";
-import type { Coordinates } from "./location.service";
+import { apiGet, apiPatch, apiPost } from "@/services/api";
+import type { Coordinates } from "@/services/location.service";
```

In `responder/services/incidentSocket.service.ts`:

```diff
-import { API_BASE_URL } from "./api";
+import { API_BASE_URL } from "@/services/api";
```

`responder/services/incident.service.test.ts`'s `import { toIncident } from "./incident.service";` needs no change — both files moved into the same folder together.

- [ ] **Step 3: Fix consumer imports**

In each file below, replace the quoted import path (only the path string changes, not the imported names):

```diff
-from "@/services/incident.service"
+from "@/responder/services/incident.service"
```
Applies to: `app/responder/index.tsx`, `app/responder/navigate.tsx`, `app/responder/[id].tsx`.

```diff
-from "@/services/incidentSocket.service"
+from "@/responder/services/incidentSocket.service"
```
Applies to: `app/responder/[id].tsx`, `components/responder/mergeIncidentUpdate.ts`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx jest responder/services components/responder`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(responder): move incident services into responder/services/"
```

---

## Task 4: Move shared components (`RButton`, `UrgencyBadge`, `LiveIncidentMap`, `colorUtils`, `incidentVisual`, `responderStatusColors`)

**Files:**
- Move: `components/responder/RButton.tsx` → `responder/components/shared/RButton.tsx`
- Move: `components/responder/UrgencyBadge.tsx` → `responder/components/shared/UrgencyBadge.tsx`
- Move: `components/responder/LiveIncidentMap.tsx` → `responder/components/shared/LiveIncidentMap.tsx`
- Move: `components/responder/colorUtils.ts` → `responder/components/shared/colorUtils.ts`
- Move: `components/responder/incidentVisual.ts` → `responder/components/shared/incidentVisual.ts`
- Move: `components/responder/responderStatusColors.ts` → `responder/components/shared/responderStatusColors.ts`
- Modify (consumer import paths, including two relative imports that cross the new shared/incident-detail folder boundary):
  - `app/responder/index.tsx`, `app/responder/navigate.tsx`, `app/responder/[id].tsx`
  - `components/responder/IncidentCard.tsx`, `components/responder/TeamMemberRow.tsx`
  - `components/responder/incident-detail/ArrivedView.tsx`, `LobbyView.tsx`, `OnTheWayView.tsx`, `PendingView.tsx`, `GradientIconCircle.tsx`

**Interfaces:**
- Produces: `responder/components/shared/{RButton,UrgencyBadge,LiveIncidentMap,colorUtils,incidentVisual,responderStatusColors}` — same exports as before, new path `@/responder/components/shared/<name>` for all later tasks.

- [ ] **Step 1: Move the files**

```bash
git mv components/responder/RButton.tsx responder/components/shared/RButton.tsx
git mv components/responder/UrgencyBadge.tsx responder/components/shared/UrgencyBadge.tsx
git mv components/responder/LiveIncidentMap.tsx responder/components/shared/LiveIncidentMap.tsx
git mv components/responder/colorUtils.ts responder/components/shared/colorUtils.ts
git mv components/responder/incidentVisual.ts responder/components/shared/incidentVisual.ts
git mv components/responder/responderStatusColors.ts responder/components/shared/responderStatusColors.ts
```

`RButton.tsx`'s and `UrgencyBadge.tsx`'s own `import { darken } from "./colorUtils";` need no change — both files moved into `shared/` together with `colorUtils.ts`.

- [ ] **Step 2: Fix the two relative imports that now cross a folder boundary**

`OnTheWayView.tsx` and `GradientIconCircle.tsx` (both staying in `components/responder/incident-detail/` for now, moving in Task 6) reach `colorUtils` via a parent-relative import. `colorUtils.ts` no longer lives one level up from `incident-detail/` — it's now a sibling group under `responder/components/`. Fix both to the new absolute path:

In `components/responder/incident-detail/OnTheWayView.tsx`:
```diff
-import { darken } from "../colorUtils";
+import { darken } from "@/responder/components/shared/colorUtils";
```

In `components/responder/incident-detail/GradientIconCircle.tsx`:
```diff
-import { darken } from "../colorUtils";
+import { darken } from "@/responder/components/shared/colorUtils";
```

- [ ] **Step 3: Fix every other consumer import**

Replace the quoted import path in each file (imported names unchanged):

```diff
-from "@/components/responder/RButton"
+from "@/responder/components/shared/RButton"
```
Applies to: `app/responder/index.tsx`, `app/responder/navigate.tsx`, `app/responder/[id].tsx`, `components/responder/incident-detail/ArrivedView.tsx`, `LobbyView.tsx`, `OnTheWayView.tsx`, `PendingView.tsx`.

```diff
-from "@/components/responder/UrgencyBadge"
+from "@/responder/components/shared/UrgencyBadge"
```
Applies to: `components/responder/IncidentCard.tsx`, `components/responder/incident-detail/PendingView.tsx`.

```diff
-from "@/components/responder/LiveIncidentMap"
+from "@/responder/components/shared/LiveIncidentMap"
```
Applies to: `app/responder/navigate.tsx`, `components/responder/incident-detail/OnTheWayView.tsx`.

```diff
-from "@/components/responder/colorUtils"
+from "@/responder/components/shared/colorUtils"
```
Applies to: `app/responder/navigate.tsx`.

```diff
-from "@/components/responder/incidentVisual"
+from "@/responder/components/shared/incidentVisual"
```
Applies to: `app/responder/navigate.tsx`, `components/responder/IncidentCard.tsx`, `components/responder/incident-detail/ArrivedView.tsx`, `LobbyView.tsx`, `OnTheWayView.tsx`, `PendingView.tsx`.

```diff
-from "@/components/responder/responderStatusColors"
+from "@/responder/components/shared/responderStatusColors"
```
Applies to: `components/responder/IncidentCard.tsx`, `components/responder/TeamMemberRow.tsx`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx jest components/responder responder/services`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(responder): move shared UI primitives into responder/components/shared/"
```

---

## Task 5: Move dashboard components

**Files:**
- Move: `components/responder/IncidentCard.tsx` → `responder/components/dashboard/IncidentCard.tsx`
- Move: `components/responder/IncidentFilterBar.tsx` → `responder/components/dashboard/IncidentFilterBar.tsx`
- Move: `components/responder/BarangaySectionHeader.tsx` → `responder/components/dashboard/BarangaySectionHeader.tsx`
- Move: `components/responder/filterIncidents.ts` → `responder/components/dashboard/filterIncidents.ts`
- Move: `components/responder/filterIncidents.test.ts` → `responder/components/dashboard/filterIncidents.test.ts`
- Move: `components/responder/groupIncidentsByBarangay.ts` → `responder/components/dashboard/groupIncidentsByBarangay.ts`
- Move: `components/responder/groupIncidentsByBarangay.test.ts` → `responder/components/dashboard/groupIncidentsByBarangay.test.ts`
- Move: `components/responder/selectNearestIncidents.ts` → `responder/components/dashboard/selectNearestIncidents.ts`
- Move: `components/responder/selectNearestIncidents.test.ts` → `responder/components/dashboard/selectNearestIncidents.test.ts`
- Modify: `app/responder/index.tsx` (6 import paths)

**Interfaces:**
- Consumes: `@/responder/types/responder` (Task 1), `@/responder/components/shared/{incidentVisual,responderStatusColors,UrgencyBadge}` (Task 4) — already correctly referenced inside `IncidentCard.tsx` from prior tasks.
- Produces: `responder/components/dashboard/*` — same exports as before, new path `@/responder/components/dashboard/<name>` for Task 7.

- [ ] **Step 1: Move the files**

```bash
git mv components/responder/IncidentCard.tsx responder/components/dashboard/IncidentCard.tsx
git mv components/responder/IncidentFilterBar.tsx responder/components/dashboard/IncidentFilterBar.tsx
git mv components/responder/BarangaySectionHeader.tsx responder/components/dashboard/BarangaySectionHeader.tsx
git mv components/responder/filterIncidents.ts responder/components/dashboard/filterIncidents.ts
git mv components/responder/filterIncidents.test.ts responder/components/dashboard/filterIncidents.test.ts
git mv components/responder/groupIncidentsByBarangay.ts responder/components/dashboard/groupIncidentsByBarangay.ts
git mv components/responder/groupIncidentsByBarangay.test.ts responder/components/dashboard/groupIncidentsByBarangay.test.ts
git mv components/responder/selectNearestIncidents.ts responder/components/dashboard/selectNearestIncidents.ts
git mv components/responder/selectNearestIncidents.test.ts responder/components/dashboard/selectNearestIncidents.test.ts
```

`filterIncidents.test.ts`'s `import ... from "./filterIncidents";`, `groupIncidentsByBarangay.test.ts`'s `import ... from "./groupIncidentsByBarangay";`, and `selectNearestIncidents.test.ts`'s `import ... from "./selectNearestIncidents";` need no change — each `.test.ts` moved alongside its subject into the same folder.

- [ ] **Step 2: Fix intra-group cross-references**

In `responder/components/dashboard/filterIncidents.ts`:
```diff
-} from "@/components/responder/groupIncidentsByBarangay";
+} from "@/responder/components/dashboard/groupIncidentsByBarangay";
```

In `responder/components/dashboard/BarangaySectionHeader.tsx`:
```diff
-import type { BarangayGroup } from "@/components/responder/groupIncidentsByBarangay";
+import type { BarangayGroup } from "@/responder/components/dashboard/groupIncidentsByBarangay";
```

In `responder/components/dashboard/IncidentFilterBar.tsx`:
```diff
-import type { IncidentFilters } from "@/components/responder/filterIncidents";
+import type { IncidentFilters } from "@/responder/components/dashboard/filterIncidents";
```

- [ ] **Step 3: Fix the consumer, `app/responder/index.tsx`**

```diff
-import BarangaySectionHeader from "@/components/responder/BarangaySectionHeader";
+import BarangaySectionHeader from "@/responder/components/dashboard/BarangaySectionHeader";
 import {
   incidentBarangay,
   filterIncidents,
   type IncidentFilters,
-} from "@/components/responder/filterIncidents";
-import { groupIncidentsByBarangay, UNKNOWN_LOCATION_ID, type BarangayGroup } from "@/components/responder/groupIncidentsByBarangay";
-import IncidentCard from "@/components/responder/IncidentCard";
-import IncidentFilterBar from "@/components/responder/IncidentFilterBar";
+} from "@/responder/components/dashboard/filterIncidents";
+import { groupIncidentsByBarangay, UNKNOWN_LOCATION_ID, type BarangayGroup } from "@/responder/components/dashboard/groupIncidentsByBarangay";
+import IncidentCard from "@/responder/components/dashboard/IncidentCard";
+import IncidentFilterBar from "@/responder/components/dashboard/IncidentFilterBar";
 import RButton from "@/responder/components/shared/RButton";
-import { selectNearestIncidents } from "@/components/responder/selectNearestIncidents";
+import { selectNearestIncidents } from "@/responder/components/dashboard/selectNearestIncidents";
```

(The `RButton` line was already updated to `@/responder/components/shared/RButton` in Task 4 — shown here only for surrounding context, not a new change.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx jest responder/components/dashboard components/responder`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(responder): move dashboard components into responder/components/dashboard/"
```

---

## Task 6: Move incident-detail components

**Files:**
- Move: `components/responder/incident-detail/PendingView.tsx` → `responder/components/incident-detail/PendingView.tsx`
- Move: `components/responder/incident-detail/LobbyView.tsx` → `responder/components/incident-detail/LobbyView.tsx`
- Move: `components/responder/incident-detail/OnTheWayView.tsx` → `responder/components/incident-detail/OnTheWayView.tsx`
- Move: `components/responder/incident-detail/ArrivedView.tsx` → `responder/components/incident-detail/ArrivedView.tsx`
- Move: `components/responder/incident-detail/ActionRow.tsx` → `responder/components/incident-detail/ActionRow.tsx`
- Move: `components/responder/incident-detail/DetailRow.tsx` → `responder/components/incident-detail/DetailRow.tsx`
- Move: `components/responder/incident-detail/GradientIconCircle.tsx` → `responder/components/incident-detail/GradientIconCircle.tsx`
- Move: `components/responder/TeamMemberRow.tsx` → `responder/components/incident-detail/TeamMemberRow.tsx`
- Move: `components/responder/phaseForMyStatus.ts` → `responder/components/incident-detail/phaseForMyStatus.ts`
- Move: `components/responder/phaseForMyStatus.test.ts` → `responder/components/incident-detail/phaseForMyStatus.test.ts`
- Move: `components/responder/mergeIncidentUpdate.ts` → `responder/components/incident-detail/mergeIncidentUpdate.ts`
- Move: `components/responder/mergeIncidentUpdate.test.ts` → `responder/components/incident-detail/mergeIncidentUpdate.test.ts`
- Modify: `components/responder/incident-detail/LobbyView.tsx` (the one cross-reference to `TeamMemberRow`), `app/responder/[id].tsx` (6 import paths)

**Interfaces:**
- Consumes: `@/responder/types/responder` (Task 1), `@/responder/components/shared/{RButton,UrgencyBadge,LiveIncidentMap,incidentVisual,colorUtils}` (Task 4), `@/responder/services/incidentSocket.service` (Task 3).
- Produces: `responder/components/incident-detail/*` — same exports as before, new path `@/responder/components/incident-detail/<name>` for Task 7.

- [ ] **Step 1: Move the files**

```bash
git mv components/responder/incident-detail/PendingView.tsx responder/components/incident-detail/PendingView.tsx
git mv components/responder/incident-detail/LobbyView.tsx responder/components/incident-detail/LobbyView.tsx
git mv components/responder/incident-detail/OnTheWayView.tsx responder/components/incident-detail/OnTheWayView.tsx
git mv components/responder/incident-detail/ArrivedView.tsx responder/components/incident-detail/ArrivedView.tsx
git mv components/responder/incident-detail/ActionRow.tsx responder/components/incident-detail/ActionRow.tsx
git mv components/responder/incident-detail/DetailRow.tsx responder/components/incident-detail/DetailRow.tsx
git mv components/responder/incident-detail/GradientIconCircle.tsx responder/components/incident-detail/GradientIconCircle.tsx
git mv components/responder/TeamMemberRow.tsx responder/components/incident-detail/TeamMemberRow.tsx
git mv components/responder/phaseForMyStatus.ts responder/components/incident-detail/phaseForMyStatus.ts
git mv components/responder/phaseForMyStatus.test.ts responder/components/incident-detail/phaseForMyStatus.test.ts
git mv components/responder/mergeIncidentUpdate.ts responder/components/incident-detail/mergeIncidentUpdate.ts
git mv components/responder/mergeIncidentUpdate.test.ts responder/components/incident-detail/mergeIncidentUpdate.test.ts
```

The relative imports `import ActionRow from "./ActionRow";`, `import DetailRow from "./DetailRow";`, `import GradientIconCircle from "./GradientIconCircle";` (in `ArrivedView.tsx`, `LobbyView.tsx`, `PendingView.tsx`), and `import { phaseForMyStatus } from "./phaseForMyStatus";` / `import { mergeIncidentUpdate } from "./mergeIncidentUpdate";` (in their `.test.ts` files) need **no change** — the whole `incident-detail/` folder's internal relative structure is preserved by the move (old parent `components/responder/`, new parent `responder/components/` — same depth, same siblings).

- [ ] **Step 2: Fix the one cross-reference that changes**

`TeamMemberRow.tsx` moved from flat `components/responder/` into `incident-detail/` alongside `LobbyView.tsx`, which references it by absolute path. In `responder/components/incident-detail/LobbyView.tsx`:

```diff
-import TeamMemberRow from "@/components/responder/TeamMemberRow";
+import TeamMemberRow from "@/responder/components/incident-detail/TeamMemberRow";
```

- [ ] **Step 3: Fix the consumer, `app/responder/[id].tsx`**

```diff
-import ArrivedView from "@/components/responder/incident-detail/ArrivedView";
-import LobbyView, { type LobbyTab } from "@/components/responder/incident-detail/LobbyView";
-import OnTheWayView from "@/components/responder/incident-detail/OnTheWayView";
-import PendingView from "@/components/responder/incident-detail/PendingView";
-import { phaseForMyStatus } from "@/components/responder/phaseForMyStatus";
+import ArrivedView from "@/responder/components/incident-detail/ArrivedView";
+import LobbyView, { type LobbyTab } from "@/responder/components/incident-detail/LobbyView";
+import OnTheWayView from "@/responder/components/incident-detail/OnTheWayView";
+import PendingView from "@/responder/components/incident-detail/PendingView";
+import { phaseForMyStatus } from "@/responder/components/incident-detail/phaseForMyStatus";
 import RButton from "@/responder/components/shared/RButton";
 ...
-import { mergeIncidentUpdate } from "@/components/responder/mergeIncidentUpdate";
+import { mergeIncidentUpdate } from "@/responder/components/incident-detail/mergeIncidentUpdate";
```

(The `RButton` line was already updated in Task 4 — shown only for surrounding context.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx jest responder/components/incident-detail components/responder`
Expected: all PASS. (`components/responder/` should now contain no files — the next command should list nothing but the top-level directory itself:)

Run: `git status --porcelain components/responder`
Expected: no output (directory is empty; Git doesn't track empty directories, so it should no longer appear in `git status` at all going forward).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(responder): move incident-detail components into responder/components/incident-detail/"
```

---

## Task 7: Convert the four screens to `responder/screens/` + thin routes

**Files:**
- Move: `app/responder/index.tsx` → `responder/screens/DashboardScreen.tsx`
- Move: `app/responder/[id].tsx` → `responder/screens/IncidentDetailScreen.tsx`
- Move: `app/responder/navigate.tsx` → `responder/screens/NavigateScreen.tsx`
- Move: `app/responder/welcome.tsx` → `responder/screens/WelcomeScreen.tsx`
- Create: `app/responder/index.tsx` (new, one-line re-export)
- Create: `app/responder/[id].tsx` (new, one-line re-export)
- Create: `app/responder/navigate.tsx` (new, one-line re-export)
- Create: `app/responder/welcome.tsx` (new, one-line re-export)
- No change: `app/responder/_layout.tsx` (routing config only, no responder-domain logic to relocate)

**Interfaces:**
- Consumes: everything produced by Tasks 1–6 — by this point every import inside the four screen files already points at its final `@/responder/...` location (each prior task fixed these files' imports in place, before the screens themselves moved), so moving the files here requires **no further import edits** to their bodies.
- Produces: the four screens as named default exports under `@/responder/screens/`, consumed only by the new `app/responder/*.tsx` route stubs.

- [ ] **Step 1: Move the screen files (content unchanged)**

```bash
git mv app/responder/index.tsx responder/screens/DashboardScreen.tsx
git mv app/responder/[id].tsx responder/screens/IncidentDetailScreen.tsx
git mv app/responder/navigate.tsx responder/screens/NavigateScreen.tsx
git mv app/responder/welcome.tsx responder/screens/WelcomeScreen.tsx
```

- [ ] **Step 2: Create the route stub files**

Create `app/responder/index.tsx`:
```ts
export { default } from "@/responder/screens/DashboardScreen";
```

Create `app/responder/[id].tsx`:
```ts
export { default } from "@/responder/screens/IncidentDetailScreen";
```

Create `app/responder/navigate.tsx`:
```ts
export { default } from "@/responder/screens/NavigateScreen";
```

Create `app/responder/welcome.tsx`:
```ts
export { default } from "@/responder/screens/WelcomeScreen";
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in the project.

Run: `npx jest responder`
Expected: all PASS — this covers every test file that moved across Tasks 1–7.

Run: `git status --porcelain components/responder services/incident.service.ts services/incident.service.test.ts services/incidentSocket.service.ts types/responder.ts theme/responderColors.ts`
Expected: no output — none of these old paths exist anymore.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(responder): move responder screens into responder/screens/, reduce app/responder/*.tsx to route stubs"
```

---

## Task 8: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Full responder test suite**

Run: `npx jest responder`
Expected: all PASS, same test count as before the reorg (Tasks 1–7 only moved files — no test was added, removed, or changed).

- [ ] **Step 3: Confirm the new module structure matches the spec**

Run: `find responder -type f | sort` (or `Get-ChildItem -Recurse responder | Sort-Object FullName` in PowerShell)
Expected: matches the tree in `docs/superpowers/specs/2026-09-11-responder-module-reorg-design.md`'s "New structure" section — `screens/` (4 files), `components/dashboard/` (9 files), `components/incident-detail/` (12 files), `components/shared/` (6 files), `services/` (3 files), `types/responder.ts`, `theme/responderColors.ts`.

- [ ] **Step 4: Manual walkthrough**

Start the dev server (`npx expo start`) and, as a responder account, walk the full flow: dashboard list loads → tap an incident → Accept (pending → lobby) → Head Out (lobby → on the way) → open Navigate from on-the-way → Arrive → Cancel/Complete from arrived. Also open `/responder/welcome` (new-responder onboarding) once. Confirm every screen renders and every action behaves exactly as it did before this reorg — this is the step type-checking and Jest can't cover (a route silently resolving to the wrong screen, for instance, would still type-check cleanly).

- [ ] **Step 5: Commit (only if the manual walkthrough required a fix)**

If Step 4 surfaces nothing, there is nothing to commit here — Task 7's commit is the final one. If it does surface an issue, fix it, re-run Steps 1–2, and commit:

```bash
git add -A
git commit -m "fix(responder): correct issue found in reorg manual walkthrough"
```
