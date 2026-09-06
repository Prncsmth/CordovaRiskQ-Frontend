# Responder Dashboard: Barangay Grouping (Phase 1)

## Problem

The responder Dashboard (`app/responder/index.tsx`) shows incoming incidents as
one flat, unsorted-by-location list. A responder scanning the screen has no
quick way to answer "where are incidents happening?" — they have to read
every row's location text individually. This is a mobile field tool used
under time pressure, so that's a real cost.

## Goal (Phase 1 scope)

Group the Dashboard's incident list by Barangay, and prioritize which
Barangay sections appear first based on urgency and activity — so a
responder can glance at the screen and understand, in order:

1. Which Barangays have incidents
2. Which Barangay needs attention first
3. What type of incident, how recent, how far

**Explicitly out of scope for this phase** (agreed with the user):
- Filters and search (Barangay/type/urgency/status filters, text search) — a
  separate follow-up spec once this core lands.
- Showing Barangay on the incident detail (`[id].tsx`) or navigate screens —
  dashboard-only for now.
- Forcing dark mode on responder screens — they continue to follow the
  app's existing light/dark toggle.
- Any backend/API/database change. Barangay is derived entirely client-side.
- Any change to incident status logic, accept/decline flow, or navigation
  behavior.

## Data gaps found, and how this design resolves them

Three things this design would like to have from the backend but doesn't:

**1. No Barangay field.** `IncidentApiRow` (`services/incident.service.ts`)
only has `category`, `locationLabel`, `latitude`, `longitude`, `urgency`,
`status` — no barangay. **Resolution:** derive it client-side from
`incident.incidentCoords` using `getNearestBarangay()` (already in
`constants/cordovaBarangays.ts`, already used by `home.tsx` and
`report.tsx` for the same purpose on the citizen side) — so barangay
assignment is computed the same way everywhere in the app. Incidents with
no coordinates (rare, but the `Incident` type marks `incidentCoords`
optional) fall into an **"Unknown Location"** group, always sorted last.

**2. Only 3 urgency levels, not 4.** `Urgency` is `"high" | "medium" | "low"`
— confirmed no "critical" tier anywhere in the type, the service layer, or
`incidentVisual.ts` (which maps color/icon by incident *type*, not
severity). **Resolution (agreed: Option A):** use the real 3 levels as the
only badges — **High / Medium / Low**. Barangay prioritization tier 1 is
"contains a High-urgency incident," not a separate "Critical" tier.

**3. No "reported at" timestamp.** Neither `Incident` nor `IncidentApiRow`
carries when an incident was actually submitted. The Dashboard's previous
polling rework (already shipped) worked around this for its "NEW" badge by
recording, per incident id, the first time *this device's poll* noticed it
(`firstSeenRef`) — but it deliberately zeroed that value for anything
present on the very first load, so opening the dashboard doesn't flood it
with "NEW" badges. That's the right call for the NEW badge, but it's the
wrong value to reuse for a "time reported" caption or for a "most recent
activity" sort tiebreak: an incident that already existed for 20 minutes
before a responder opened the app would show "Just now," which is actively
wrong, not just imprecise.

　**Resolution:** split the one meaning that field was doing into two:
- `firstSeenRef` (renamed conceptually to "first observed at") now **always**
  records the real `Date.now()` the first time this device sees an
  incident id — including on the very first load. This is what
  time-since-reported captions and the barangay "most recent activity"
  tiebreak use. It's an honest proxy — "time since this device noticed
  it" — accurate for anything that arrives while the dashboard is open
  (the common case), with the caveat that an incident already pending
  before a session starts will show time-since-app-opened rather than its
  true age. This caveat is inherent to not having a real timestamp; no
  UI change can fully hide it, so the plan is not to overclaim precision
  (label as e.g. "2m ago", not "Reported 2m ago exactly").
- A **separate** `newIncidentIds: Set<string>` (already exists from the
  polling rework) keeps its current job: true only for ids that arrived
  *after* the first successful load. This is what drives the "NEW" badge.
  Decoupling these two removes the incorrect "Just now" bug the current
  code has today as a side effect of this same first-load flag serving
  both purposes.

## Approach for rendering grouped sections

Three options considered:

1. **`SectionList` with a derived `BarangayGroup[]` (Recommended).**
   React Native's built-in primitive for exactly this shape — sections
   with headers, each containing rows — with the same virtualization and
   pull-to-refresh support `FlatList` already has. Grouping/sorting stays
   a pure, independently-testable function; `SectionList` just needs a
   small adapter to its `{title, data}[]` shape.
2. **Keep `FlatList`, flatten into a tagged union of header/row items.**
   Works, but re-implements section-header behavior `SectionList` already
   gives for free, for no real benefit — more code, more edge cases (e.g.
   sticky headers, row-type branching in `renderItem`).
3. **`ScrollView` of mapped sections, no virtualization.** Simplest code,
   but throws away list virtualization and native pull-to-refresh
   integration for no reason at this list's scale-up potential.

Going with **Option 1**.

## Design

### Grouping & prioritization algorithm

New pure module: `components/responder/groupIncidentsByBarangay.ts`

```ts
export type BarangayGroup = {
  id: string;          // barangay id, or "unknown"
  name: string;        // barangay name, or "Unknown Location"
  incidents: Incident[];       // sorted by urgency (high→low), then distance
  hasHighUrgency: boolean;
  mostRecentFirstSeenAt: number; // max(firstSeenAt) across its incidents
};

export function groupIncidentsByBarangay(
  incidents: Incident[],
  firstSeenAt: Record<string, number>,
): BarangayGroup[]
```

Steps:
1. For each incident, resolve its barangay via `getNearestBarangay(lat, lng)`
   when `incidentCoords` exists, else bucket under `"unknown"`.
2. Within each group, sort incidents by urgency (high → medium → low), then
   by `distanceKm` ascending, undefined last — reusing the existing
   `sortIncidents` logic from `app/responder/index.tsx` (moved into this
   module so both the per-group sort and any future flat view can share it).
3. Compute each group's `hasHighUrgency` and `mostRecentFirstSeenAt`.
4. Sort the **groups**:
   1. `hasHighUrgency` true first
   2. more incidents first (`incidents.length` descending)
   3. more recent activity first (`mostRecentFirstSeenAt` descending)
   4. alphabetical by `name` ascending (final tie-breaker)
   5. the `"unknown"` bucket always sorts last, regardless of the above.

This function is pure (no hooks, no I/O) — straightforward to unit test with
hand-built `Incident[]` fixtures covering: empty input, all-one-barangay,
tie-breaking through all four rules, and the unknown-location bucket.

### Barangay lookup consolidation

`constants/cordovaBarangays.ts` currently has two nearly-identical
functions: `getNearestBarangay` (true haversine distance) and
`findNearestBarangay` (cheaper squared-distance approximation, used only by
`map.tsx`'s pin-drop flow). Per the "reuse existing logic, don't duplicate"
goal — and since this phase adds a third real call site — **consolidate to
one**: keep `getNearestBarangay` (already used by `home.tsx` and
`report.tsx`, uses the canonical `haversineDistanceKm` util), delete
`findNearestBarangay`, and update `map.tsx`'s one call site to use
`getNearestBarangay`. At Cordova's scale (a few km across) the two
functions already agree on every real coordinate; this is a safe, purely
mechanical rename.

### Components

- **`components/responder/groupIncidentsByBarangay.ts`** (new) — grouping/
  sorting logic described above, plus the relocated `sortIncidents` helper
  and its `URGENCY_RANK` map (moved from `app/responder/index.tsx`).
- **`components/responder/BarangaySectionHeader.tsx`** (new) — renders one
  section header: Barangay name, incident count ("3 Active Incidents"),
  and a small severity dot colored by the group's highest urgency present
  (matches `UrgencyBadge`'s existing color mapping: high → `COLORS.primary`,
  medium → `COLORS.warning`, low → `COLORS.success`).
- **`components/responder/IncidentCard.tsx`** (existing, extended) — add a
  `firstSeenAt: number` prop and render a small time caption ("2m ago") via
  the existing `formatRelativeTime` util, positioned per the requested
  hierarchy (urgency → location/type already shown → time → distance).
  Visual structure (badge, category icon, pulse-on-high, NEW badge) is
  unchanged from the current implementation.
- **`app/responder/index.tsx`** (existing, reworked) —
  - Replace `FlatList` with `SectionList`, sections built via
    `groupIncidentsByBarangay(incidents, firstSeenRef.current)` mapped to
    `{ title: group, data: group.incidents }`.
  - `firstSeenRef` population changes to always record real `Date.now()`
    on first observation (dropping the old "0 on first load" special
    case); `newIncidentIds` (already separate state) keeps gating the NEW
    badge exactly as it does today.
  - Pull-to-refresh, the 12s poll, the stats row, and the online/offline
    toggle are unchanged.

### Visual layout (Dashboard)

```
┌─────────────────────────────┐
│ Hi, Juan            ⚙ ⏻     │   <- unchanged header
│ Dashboard                    │
│ ● Online   3 nearby · Updated 5s ago │
│ [ Nearby: 5 ]  [ High Urgency: 2 ]   │   <- unchanged stats row
├─────────────────────────────┤
│ ● BUAGSONG · 2 Active        │   <- section header (severity dot = high)
│ ┌───────────────────────┐   │
│ │ 🔥 Fire        [High]  │   │
│ │ Near the market · 1.1km │   │
│ │ 2m ago            ›    │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ 🚑 Medical    [Medium] │   │
│ │ Purok 3 · 2.4km         │   │
│ │ 8m ago            ›    │   │
│ └───────────────────────┘   │
│                               │
│ ● GABI · 1 Active            │   <- severity dot = medium
│ ┌───────────────────────┐   │
│ │ 🌊 Flooding   [Medium] │   │
│ │ Sitio Riverside · 3.0km │   │
│ │ 5m ago            ›    │   │
│ └───────────────────────┘   │
└─────────────────────────────┘
```

Mobile-specific notes (this is a phone screen, not a desktop dashboard):
- Section headers are not collapsible in this phase — collapsing adds
  interaction cost the "glance and understand" goal doesn't need yet; a
  responder with 2-3 barangays active can already see everything by
  scrolling. Collapsible sections can be a fast-follow if the list ever
  gets long enough to need it.
- Cards keep their existing 44pt+ touch targets and single-column layout;
  no layout changes to the card's tap target or navigation behavior.
- Severity dot on the section header uses the same color language as
  `UrgencyBadge` so a responder doesn't have to learn a second color code.

### Error handling

No new failure modes: `groupIncidentsByBarangay` is a pure function over
already-fetched data, so it can't throw for reasons the existing polling
code doesn't already handle (the existing try/catch around each poll and
manual refresh is unchanged). An incident with `incidentCoords: undefined`
is handled by design (the "Unknown Location" bucket), not treated as an
error.

### Testing

- Unit tests for `groupIncidentsByBarangay`: empty list, single barangay,
  multiple barangays exercising each of the 4 sort tiers independently,
  ties resolved by the next rule down, and the unknown-location bucket
  always last regardless of its content.
- Manual verification on device/simulator: confirm grouping, section
  ordering, NEW badge behavior (still only fires for genuinely new
  arrivals), and that the "time ago" caption no longer shows "Just now"
  for incidents that were already present on first load (the bug this
  design fixes as a side effect).

## Out of scope / follow-ups

- Barangay / type / urgency / status filters, and search — Phase 2.
- Showing Barangay on `[id].tsx` and `navigate.tsx`.
- Collapsible barangay sections, if the list grows long enough to need it.
- A real "reported at" backend timestamp, if ever added, would let time
  captions and the recency tiebreak drop the "first observed by this
  device" approximation in favor of ground truth.
