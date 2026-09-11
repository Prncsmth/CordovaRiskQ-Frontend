# Responder completed-incidents history — design

## Motivation

The responder side has no way to look back at incidents a responder has
already resolved. The citizen side has an equivalent feature ("Report
History"), but it lists incidents the citizen *reported*, not incidents a
responder *worked* — a different relationship (`reporterId` vs. a roster
row on `IncidentResponder`) — so its existing backend endpoint
(`GET /api/incidents/mine`) can't be reused as-is. This adds the
responder-side equivalent: a page listing every incident this responder
worked that is now marked completed ("Mark Resolved"), reachable from
Settings (the only account-level entry point responders have, per the
existing comment in `app/settings/index.tsx`).

## Goals

- A responder can see every incident they personally worked that has since
  been marked completed, most-recently-resolved first.
- Reachable via a new Settings row, visible only to responders.
- Visually consistent with the existing responder UI (icons via
  `getIncidentVisual`) and structurally similar to the citizen "Report
  History" screen (list + empty state), without duplicating its
  citizen-specific status-pill logic (every item here is, by definition,
  already completed).

## Non-goals

- No "cancelled" incidents — completed only, per explicit scope decision.
- No team-wide/all-responders view — only incidents *this* responder
  personally worked (had a non-declined roster row on).
- No detail screen for a completed incident (tapping a card does nothing
  beyond what's already visible on the card itself) — the existing
  `/responder/[id]` detail screen's phase-driven rendering has no "completed"
  phase to show, and building one is out of scope; this is a read-only
  history list only.
- No pagination — mirrors `GET /api/incidents/mine`'s existing unpaginated
  list behavior; a responder's own completed-incident count is expected to
  stay in a browsable range for the foreseeable future.

## Backend (`CordovaRiskQ-Bacnkend`)

### New service method

`src/services/incident.service.ts`, added to the existing `incidentService`
object (same file `updateStatus`/`list` live in):

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

Marking an incident `"completed"` (`updateStatus`) only changes
`Incident.status` — it never touches `IncidentResponder` rows (confirmed by
reading `updateStatus`'s implementation), so a responder's roster row stays
at whatever it was (typically `"arrived"`). "This responder worked it" is
therefore: *any* roster row for this `responderId` on the incident whose
status isn't `"declined"` (a `"declined"`-only row means they never actually
participated).

No new Prisma query shape is needed beyond what `findMany` already returns
(full base `Incident` row) — this mirrors `list()`'s existing return shape
(spread of the raw Prisma row plus computed fields), except this endpoint
needs no `myStatus`/`acceptedByResponderId`/`respondersCount` shaping since
the frontend list view only needs the incident's own fields.

### New route

`src/routes/incident.routes.ts` — confirmed current registrations:

```
router.get("/incidents", authenticate, incidentController.list);
router.get("/incidents/mine", authenticate, incidentController.listMine);
router.get("/incidents/:id", authenticate, incidentController.getById);
```

```
GET /api/incidents/completed
```

- `authenticate` middleware only, same as the existing incident routes — no
  dedicated role-guard exists for any incident endpoint today, and this one
  doesn't need one either: it's scoped by `req.userId!` regardless of role,
  so a citizen hitting it simply gets an empty list (no roster rows ever
  exist for a citizen `responderId`).
- Controller method mirrors the existing `list`/`getById` controllers:
  calls `incidentService.listCompletedByResponder(req.userId!)`, responds
  `{ success: true, incidents: [...] }`.
- **Registration order matters**: `/incidents/:id` is a wildcard param
  route. It's already registered *after* `/incidents/mine` for exactly
  this reason — Express matches routes in registration order, so a param
  route registered first would greedily match `/incidents/completed` as
  `:id = "completed"`. The new route must be added *before*
  `/incidents/:id` (alongside `/incidents/mine`, which sits in the correct
  position already).

## Frontend (`CordovaRiskQ-Frontend`)

### Service

`responder/services/incident.service.ts` — new function, new lightweight
type (doesn't reuse the full `Incident` type; this list view needs far
fewer fields, matching how `services/report.service.ts`'s
`ReportHistoryItem` is its own leaner shape rather than reusing `Incident`):

```ts
export type CompletedIncident = {
  id: string;
  type: string;       // via CATEGORY_LABELS, same mapping toIncident() uses
  location: string;
  completedDate: string; // formatDate(row.updatedAt)
  ref: string;         // id.slice(0, 8).toUpperCase(), matching report.service.ts's convention
};

export async function getCompletedIncidents(token: string): Promise<CompletedIncident[]> {
  const response = await apiGet<{ success: true; incidents: IncidentApiRow[] }>(
    "/api/incidents/completed",
    token,
  );
  return response.incidents.map((row) => ({
    id: row.id,
    type: CATEGORY_LABELS[row.category] ?? row.category,
    location: row.locationLabel,
    completedDate: formatDate(row.updatedAt),
    ref: row.id.slice(0, 8).toUpperCase(),
  }));
}
```

`IncidentApiRow` already has `id`, `category`, `locationLabel`; it needs one
addition — `updatedAt: string` — since today's type only carries
`createdAt`. `formatDate` comes from `@/utils/formatter` (already used by
`report.service.ts` for the identical purpose).

### Card component

`responder/components/completed/CompletedIncidentCard.tsx` — visually
modeled on `components/report-history/ReportHistoryCard.tsx`, but:
- Icon + color from `getIncidentVisual(item.type)` (the same helper
  `IncidentCard`/`PendingView`/etc. already use) instead of a generic
  document icon, for visual consistency with the rest of the responder UI.
- No status pill (every item is completed; showing a static "Completed"
  pill would be redundant given the page's own title already says so) —
  simpler layout than `ReportHistoryCard`: icon, type, location, and a
  `completedDate · ref` meta line.
- Not pressable (no detail screen to navigate to, per Non-goals) — a plain
  `View`, not a `Pressable`.

### Screen

`responder/screens/CompletedIncidentsScreen.tsx` — structurally mirrors
`app/(tabs)/report-history.tsx`: header (title "Completed Incidents" +
subtitle), fetch on mount via `useEffect`, empty state ("No completed
incidents yet." / "Incidents you resolve will appear here.") when the list
is empty after loading, otherwise a count heading + the list of cards. No
"+ New Report"-equivalent button (nothing analogous to create here).

`app/responder/completed.tsx` — one-line route stub, matching every other
responder route since the module reorg:
```ts
export { default } from "@/responder/screens/CompletedIncidentsScreen";
```

### Entry point

`app/settings/index.tsx`'s `accountRows` array gets one new `NavRow`,
inserted after `"change-password"` and before `"logout"`, shown only when
`isResponder`:

```ts
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
```

## Testing

- Backend: no existing test coverage exists for `list()`/`getById()`/
  `updateStatus()` (Prisma-backed, DB-touching — consistent with this
  project's established pattern of not unit-testing DB-touching service
  methods, only pure logic files like `incidentRoster.ts`). No new backend
  test, consistent with that existing convention.
- Frontend: no test needed for the new UI components (screens/cards
  aren't unit-tested elsewhere in this codebase either — only pure logic
  modules like `filterIncidents.ts`/`phaseForMyStatus.ts` are). The new
  `getCompletedIncidents()` mapping function is a reasonable candidate for
  a unit test mirroring `incident.service.test.ts`'s existing
  `toIncident()` coverage — one test confirming the row-to-`CompletedIncident`
  mapping is correct.
- Manual verification: `tsc --noEmit` in both repos, existing test suites
  in both repos, and (since no device is available in this environment,
  per this plan's established pattern) `npx expo export --platform web` to
  confirm the new route resolves and bundles cleanly.

## Risks

- **Cross-repo scope.** Like the earlier SOS location-label fix, this
  touches both repos in one logical change — mitigated the same way: clear
  interface contract (`GET /api/incidents/completed` request/response
  shape) specified above so the two sides can be implemented and verified
  independently before wiring together.
- **`IncidentApiRow.updatedAt` addition.** Adding a new field to an
  existing shared type touches every file constructing that type (test
  fixtures, primarily) — same category of change as the earlier `createdAt`
  addition, with the same fix pattern (add the field to existing fixtures).
