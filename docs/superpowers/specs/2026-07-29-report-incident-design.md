# Report Incident — Design

**Date:** 2026-07-29
**Source design:** two prototype screenshots from the "Cordova RiskQ Emergency App" claude.ai design project (same source referenced in [2026-07-25-cordova-riskq-design-import-design.md](./2026-07-25-cordova-riskq-design-import-design.md)): the "Report an Incident" form, and the post-submit confirmation screen (improved from the original mockup — see Deviations).

## Purpose

Implement `app/(tabs)/report.tsx` as a real, functional incident-reporting form, replacing its current one-line "Coming Soon" stub. Add a new confirmation screen shown after a successful submit. This is the "Report Incident" half of the Report feature (Report History is a separate, already-mocked screen, out of scope here).

## Scope

The Report Incident form, top to bottom:

1. Header: back button, "Report an Incident" title, "Select a category and share details" subtitle
2. Category grid: Flood / Fire / Medical Emergency / Road Accident / Other (2 columns, `Other` alone on the last row)
3. Pinned Location card: static placeholder map + pin icon + auto-detected address caption
4. Details textarea: "Describe what's happening..."
5. Add Photo (optional): tappable placeholder box
6. Submit Report button (disabled until valid)

Then, on successful submit, a new confirmation screen:

1. Green checkmark icon
2. "Report Submitted" heading + reassurance subtitle
3. Category + location summary line
4. Report ref number
5. Primary "View Report History" button, secondary "Back to Home" text link

## Out of scope

- **Real photo capture.** No `expo-image-picker` integration — this is the app's first "device capability" touchpoint, and every other screen so far mocks device/backend behavior (static map placeholder, mock location, mock weather). Add Photo is UI-only: tapping toggles a mock "attached" state using the existing `PlaceholderThumb`.
- **Real location / geocoding.** `services/location.service.ts` only returns raw `{latitude, longitude}` today, not a readable address (same limitation noted in the Home screen spec). The "auto-detected" address is a local mock constant, reusing Home's existing mock location string for consistency.
- **Real map.** Same static-placeholder decision as `map.tsx`, per the original design-import spec.
- **Backend/API changes.** `createReport()` stays a mock returning `{ success, payload, ref }`.
- **Report History screen implementation.** Already has mock data (`getReportHistory()`); this task only navigates to it, doesn't build it out.

## Deviations from the source screenshots

- The confirmation screen's original mockup had a single ambiguous "Done" button and no summary of what was submitted. This spec adds a category+location summary line and splits the single button into a primary "View Report History" action and a secondary "Back to Home" text link, so the screen has a clear, stated destination on both paths instead of a dead end.

## Architecture

New `components/report/` folder (mirrors the existing `components/home/` pattern):

- **`CategoryGrid`** — renders the 5 category cards from a local constant: `{ id, label, icon, color }[]`. Selected state = tinted background + colored border + colored bold label (matching the `Flood`-selected look in the screenshot). Selection is `useState` in the parent screen.
- **`PinnedLocationCard`** — static placeholder box (diagonal-stripe fill, matching `map.tsx`'s existing placeholder style) with a centered pin icon, plus a caption below showing the mock address.
- **`DetailsInput`** — thin wrapper around a multiline `TextInput` with the placeholder copy and the app's existing input styling (bg/border tokens already used by auth forms).
- **`PhotoPicker`** — dashed-border tappable box; unattached state shows a camera icon + "Add Photo (Optional)"; tapping toggles to an "attached" mock state rendering `components/common/PlaceholderThumb` with a small remove (×) button. Local `useState<boolean>`, no real image data.
- **`ReportConfirmation`** — the confirmation screen's content (checkmark, heading, subtitle, summary line, ref, buttons), used by the new `app/report-confirmation.tsx` route.

`app/(tabs)/report.tsx` composes header + `CategoryGrid` + `PinnedLocationCard` + `DetailsInput` + `PhotoPicker` + submit button in a `ScrollView`, holding `category`, `details`, `photoAttached` as local state.

`app/report-confirmation.tsx` **(new)** — a plain pushed route outside the `(tabs)` group (same convention as `app/notifications/index.tsx` and `app/contacts/index.tsx`), so it renders without the tab bar, matching the screenshot's chrome-free layout. Reads `ref`, `category`, `location` from route params.

## Data flow

- **Local component state** (no service): selected category, details text, photo-attached flag.
- **Local mock constant**: pinned location address string ("Barangay Poblacion, Cordova"), reusing the same value as Home's `GreetingBlock` mock location.
- **Existing service**: on submit, `createReport(payload)` (`services/report.service.ts`) is called with `{ category, location, details, hasPhoto }`; it already returns `{ success, payload, ref }` synchronously.
- On success, `router.push({ pathname: "/report-confirmation", params: { ref, category, location } })`.

## Navigation

| Element | Destination |
|---|---|
| Back button (header) | `router.back()` |
| Submit Report (valid) | `createReport()` → `router.push({ pathname: "/report-confirmation", params: {...} })` |
| Confirmation: "View Report History" | `router.replace("/(tabs)/report-history")` |
| Confirmation: "Back to Home" | `router.replace("/(tabs)/home")` |

`replace` (not `push`) is used for both confirmation actions so the back button can't return to the submitted form or the confirmation screen itself.

## Error handling

Minimal by design, consistent with the rest of this mock-data-driven app:

- Submit Report is disabled (grayed, non-interactive) until a category is selected **and** the details field is non-empty. Photo stays optional in all cases.
- No inline field-level error messages, no loading spinner on submit (the mock service resolves synchronously), no failure path — revisit once `createReport` talks to a real backend.

## Testing

No automated test suite exists in this repo (consistent with prior specs). Verification is manual via `expo start`:

- Each category card toggles its selected style correctly; only one can be selected at a time
- Submit stays disabled with no category selected, or with an empty details field; enables once both are filled
- Add Photo toggles between the empty/dashed state and the attached placeholder-thumbnail state, including remove
- Submit → confirmation screen shows the correct category, location, and ref number
- "View Report History" → lands on `report-history` tab; "Back to Home" → lands on `home` tab
- Pressing back (hardware/gesture) from the confirmation screen does not return to the report form
