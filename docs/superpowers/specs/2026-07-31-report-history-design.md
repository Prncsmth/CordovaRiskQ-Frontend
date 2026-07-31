# Report History — Design

**Date:** 2026-07-31
**Source design:** user-provided screenshot of the "Report History" screen from the "Cordova RiskQ Emergency App" claude.ai design project (same source referenced in [2026-07-25-cordova-riskq-design-import-design.md](./2026-07-25-cordova-riskq-design-import-design.md) and [2026-07-29-report-incident-design.md](./2026-07-29-report-incident-design.md)).

## Purpose

Implement `app/(tabs)/report-history.tsx` as a real, functional screen, replacing its current one-line "Coming Soon" stub. The screen lists the user's past incident reports with their current status, and offers a shortcut to submit a new one.

## Scope

The Report History screen, top to bottom:

1. Header: "Report History" title, "Track the status of what you've reported" subtitle (no back button — this is a tab screen)
2. "+ New Report" primary button (full width)
3. List of report cards, each showing: category label, location, date · ref number, and a status pill ("Resolved" / "Reviewing")
4. Empty state (not in the screenshot, but handled): shown if the report list is genuinely empty

## Out of scope

- **Report detail screen.** Cards are non-interactive (no chevron in the screenshot, no detail route/service exists yet). Revisit if/when a report-detail view is needed.
- **Pull-to-refresh / live updates.** Not in the screenshot; the underlying service is a mock that returns a fixed list.
- **Category icon on the card.** The screenshot's cards show only a bold text label, no icon — unlike `CategoryGrid`'s icon+color treatment on the Report Incident form. No change needed to `components/report/categories.ts`.
- **Backend/API changes.** `getReportHistory()` (`services/report.service.ts`) already returns mock data shaped to match the screenshot exactly (same categories, locations, dates, refs, statuses) — used unchanged.

## Architecture

New `components/report-history/` folder (mirrors the existing `components/home/` and `components/report/` per-screen-domain pattern):

- **`ReportHistoryCard`** — renders one `ReportHistoryItem`: bold category label, location line (styled with the app's existing `COLORS.textSecondary` — the teal tint visible in the screenshot reads as a compression artifact, not a distinct palette color, so no new theme token is introduced), `date · ref` in small/faint text (`COLORS.textTertiary`), and a status pill in the top-right corner using the item's own `statusColor`/`statusBg` fields directly (no local status→color mapping needed, the mock data already carries them). No `onPress` — purely informational, matching the screenshot (no chevron).

`app/(tabs)/report-history.tsx` composes:
- Title + subtitle as inline `Text` elements directly in the screen (not extracted to a component — it's two static lines with no reuse elsewhere, unlike `HomeHeader` which carries bell/unread-badge logic)
- `PrimaryButton` (existing, `components/auth/PrimaryButton.tsx`) reused as-is with `title="+ New Report"` — no icon prop exists on `PrimaryButton`, and the "+" reads fine as a plain text glyph
- A `ScrollView` list of `ReportHistoryCard`s, or `EmptyState` (existing `components/common/EmptyState.tsx`) if the list is empty
- `insets.top` padding on the scroll content, following `home.tsx`'s convention for tab screens with no native header

## Data flow

- On mount, `useEffect` calls `getReportHistory()` (`services/report.service.ts`, unchanged), following the same async `.then()/.catch()` pattern used in `home.tsx`.
- Local state: `reports: ReportHistoryItem[]` (starts `[]`) and `loaded: boolean` (starts `false`), so the empty state can't flash before the mock promise resolves. `EmptyState` renders only when `loaded && reports.length === 0`.

## Navigation

| Element | Destination |
|---|---|
| "+ New Report" | `router.push("/(tabs)/report")` |

## Error handling

Minimal by design, consistent with the rest of this mock-data-driven app: `getReportHistory()` failures are silently swallowed (`.catch(() => {})`), same as `home.tsx`'s fetches. No retry UI, no loading spinner (the mock resolves effectively synchronously).

## Testing

No automated test suite exists in this repo (consistent with prior specs). Verification is manual via `expo start`:

- The 3 mock reports render with the correct category, location, date, ref, and status-pill color (green "Resolved" / amber "Reviewing"), matching the screenshot
- "+ New Report" navigates to the report form (`(tabs)/report`); back returns to Report History
- Empty state renders correctly if `getReportHistory()` is temporarily stubbed to return `[]` (manual check only, not a persistent code path)
