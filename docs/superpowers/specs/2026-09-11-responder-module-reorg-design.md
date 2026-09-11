# Responder module reorganization — design

## Motivation

The responder (team) flow has grown incrementally across many specs (incident
pipeline, multi-responder roster, barangay grouping, live updates,
notifications, duty status, leave/rejoin) and its code is now scattered flat
across the app's shared top-level folders: 21 files directly under
`components/responder/`, plus `services/incident.service.ts` +
`services/incidentSocket.service.ts`, `types/responder.ts`, and
`theme/responderColors.ts`. Nothing about this organization reflects which
screen a file belongs to or whether it's shared — everything sits at the same
flat level. This reorg groups all responder-domain code into one module,
organized by the screen that owns each piece, so the codebase reflects the
actual shape of the feature.

## Goals

- Every file used by exactly one responder screen lives next to that
  screen's grouping; files used by 2+ screens live in a `shared/` group.
- `app/responder/*.tsx` route files become minimal — Expo Router needs them
  to exist at those paths, but they carry no real logic.
- No behavior change. This is a pure structural refactor: same URLs, same
  components, same tests (just relocated), same runtime behavior.

## Non-goals

- No change to citizen-side code, or to the app-wide shared `components/`,
  `services/`, `types/`, `theme/` folders' conventions for other domains.
  This establishes a module pattern for the responder area specifically, not
  a new house style the rest of the app must follow.
- No new features, no component API changes, no test behavior changes.
- Historical docs (`docs/superpowers/plans/*.md`,
  `docs/superpowers/specs/*.md`) that embed old import paths in code
  snippets are not rewritten — they're a record of what was built at the
  time, per this project's existing convention (see `docs/PROGRESS.md`).

## New structure

A new top-level `responder/` folder, sibling to `app/`, `components/`,
`services/`, `types/`, `theme/`:

```
responder/
  screens/
    DashboardScreen.tsx        <- was app/responder/index.tsx
    IncidentDetailScreen.tsx   <- was app/responder/[id].tsx
    NavigateScreen.tsx         <- was app/responder/navigate.tsx
    WelcomeScreen.tsx          <- was app/responder/welcome.tsx
  components/
    dashboard/
      IncidentCard.tsx
      IncidentFilterBar.tsx
      BarangaySectionHeader.tsx
      filterIncidents.ts (+ .test.ts)
      groupIncidentsByBarangay.ts (+ .test.ts)
      selectNearestIncidents.ts (+ .test.ts)
    incident-detail/
      PendingView.tsx
      LobbyView.tsx
      OnTheWayView.tsx
      ArrivedView.tsx
      ActionRow.tsx
      DetailRow.tsx
      GradientIconCircle.tsx
      TeamMemberRow.tsx
      phaseForMyStatus.ts (+ .test.ts)
      mergeIncidentUpdate.ts (+ .test.ts)
    shared/
      RButton.tsx
      UrgencyBadge.tsx
      LiveIncidentMap.tsx
      colorUtils.ts
      incidentVisual.ts
      responderStatusColors.ts
  services/
    incident.service.ts (+ .test.ts)
    incidentSocket.service.ts
  types/
    responder.ts
  theme/
    responderColors.ts
```

### Grouping rationale

- **`dashboard/`** — everything only `DashboardScreen` (the incident list /
  duty-status home screen) uses.
- **`incident-detail/`** — everything only `IncidentDetailScreen` (the
  pending → lobby → on the way → arrived phase flow) uses. Two files
  (`phaseForMyStatus.ts`, `mergeIncidentUpdate.ts`) currently sit flat in
  `components/responder/` despite being detail-screen-only logic; this move
  corrects that.
- **`shared/`** — used by 2+ screens: `RButton` (dashboard + detail),
  `UrgencyBadge` (dashboard + detail), `LiveIncidentMap` (navigate + detail's
  `OnTheWayView`), plus the small pure helpers (`colorUtils`,
  `incidentVisual`, `responderStatusColors`) that back those shared
  components.
- **`app/responder/_layout.tsx`** stays exactly where it is, unchanged —
  it's Stack routing configuration (screen registration, header options),
  not a screen, and has no responder-specific logic to relocate.

### Files confirmed safe to move

- `theme/responderColors.ts` is **not** re-exported through `theme/index.ts`'s
  barrel (`export * from "./colors" | "./spacing" | "./radius" |
  "./shadows" | "./typography" | "./fonts" | "./useThemeColors"` — no
  `responderColors` entry), and no file outside `components/responder/` /
  `app/responder/` imports it.
- Every file under `@/components/responder/*`, `@/services/incident*`,
  `@/types/responder`, `@/theme/responderColors` is imported only by other
  files inside `app/responder/` or `components/responder/` — confirmed via a
  repo-wide grep. The citizen-side app never touches this code, so the
  reorg's blast radius is fully contained to the responder area itself.
- No barrel/index file exists inside `components/responder/` today — every
  import is a direct path to the specific file. This makes the move a
  mechanical per-file path rewrite, not a re-export/shim design problem.

## Route file pattern

Each `app/responder/*.tsx` route file becomes a one-line re-export:

```ts
// app/responder/index.tsx
export { default } from "@/responder/screens/DashboardScreen";
```

Expo Router only requires a route file to have a default export — it
doesn't care where the implementation lives. URLs (`/responder`,
`/responder/[id]`, `/responder/navigate`, `/responder/welcome`) are
unchanged, so no navigation call anywhere else in the app (e.g.
`router.push("/responder/...")` in `app/_layout.tsx`) needs to change.

`[id].tsx` keeps its filename (and thus its `useLocalSearchParams<{ id:
string }>()` dynamic segment) — only its body becomes the re-export; the
route param plumbing is unaffected since `IncidentDetailScreen.tsx` still
calls `useLocalSearchParams` itself.

## Migration mechanics

1. Move each file with `git mv` (preserves file history) to its new path per
   the mapping above.
2. Fix up every import statement referencing a moved path. Since imports are
   direct paths with no barrel involved, this is a straightforward
   find-and-replace per file — no re-export shims needed anywhere.
3. Replace each `app/responder/*.tsx` route file's body with the one-line
   re-export shown above.
4. Done as one atomic change, not incrementally — a partially-moved state
   would leave broken imports mid-way. The diff is large (~40 files touched)
   but every individual edit is mechanical.

## Testing / verification

- `npx tsc --noEmit` — catches any import path missed in the rewrite.
- `npx jest` (existing responder test files, now at their new paths) —
  confirms Jest still discovers and passes them; no `jest.config.js` change
  needed since there's no path restriction, just the default project-wide
  glob.
- Manual walkthrough of the full responder flow (dashboard list → pending →
  lobby → on the way → arrived, plus the navigate and welcome screens) in
  the dev client, since this is a pure refactor — the bar is "identical
  behavior to before," not new functionality.

## Risks

- **Size of the diff.** ~40 files touched in one pass (21 components + 2
  services + types + theme + 5 screens, each with import fixups). Mitigated
  by doing it atomically and leaning on `tsc`/`jest` to catch anything
  missed, plus a manual walkthrough since type-checking alone can't catch a
  route silently resolving to the wrong screen.
- **Historical docs going stale.** `docs/superpowers/plans/*.md` snippets
  will reference old paths after this lands. Deliberately left alone (see
  Non-goals) — an intentional trade-off, not an oversight.
