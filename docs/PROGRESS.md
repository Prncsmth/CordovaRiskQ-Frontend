# CordovaRiskQ Frontend — Progress Tracker

> Living document. Update this after every feature lands (new plan/spec pair merged, or a task list in `docs/superpowers/plans/*` finished). Don't duplicate detail that already lives in `docs/superpowers/plans/*` or `specs/*` — link to it instead.

Last updated: 2026-09-09 (responder-side notifications, duty status, Ring Team, Leave affordance; full pass to correct staleness — the responder flow section below was badly out of date)

## How this project builds features

Every shipped feature has a paired design spec + implementation plan in `docs/superpowers/specs/` and `docs/superpowers/plans/`, executed task-by-task with checkboxes and a commit per task. Check there first for the *how* of any completed feature — this file only tracks *what's done* and *what's left*. Not every change goes through a full spec/plan — small, well-scoped ("bounded") changes are designed in chat and implemented directly; those are marked "no plan/spec (bounded)" below.

There is also a third sibling repo, `CordovaRiskQ- Admin` (Next.js ops dashboard), alongside `CordovaRiskQ-Bacnkend`. It has its own real admin auth and a Users page with a working "Promote to Responder" / "Revert to Citizen" action — see the "Admin-side role management" note under the responder section below.

---

## Done (civilian/citizen app)

| Feature | Plan/Spec | Backend-wired? |
|---|---|---|
| Design system import (theme, colors, base UI kit) | `2026-07-25-cordova-riskq-design-import` | n/a |
| Home screen | `2026-07-28-home-screen` | Mock centers (`services/evacuation.service.ts`, hardcoded), "nearest center" ranked by real device distance (`utils/distance.ts`) |
| Report incident flow | `2026-07-29-report-incident`, `2026-08-19-responder-incident-pipeline` | **Real** — `services/report.service.ts`'s `createReport()` calls `POST /api/incidents`; pinned location is real device GPS + nearest-barangay label |
| Change Password (bottom sheet) | `2026-07-31-change-password`, `2026-08-03-user-profile-backend` | **Real** (`PUT` via `user.service.ts`) |
| Profile screen (menu) | `2026-07-31-profile-screen` | n/a (navigation only) |
| Report history | `2026-07-31-report-history`, `2026-08-19-responder-incident-pipeline` | **Real** — `getReportHistory()`/`getReportDetailById()` call the real incidents API |
| User profile (view/edit) | `2026-07-31-user-profile`, `2026-08-03-user-profile-backend` | **Real** (`services/user.service.ts`) |
| Onboarding (phone number + terms gate) | `2026-08-05-onboarding` | **Real**, persists `mobile` to `PUT /api/users/me`; gated by backend's `isNewUser` flag on Google sign-up |
| Device geolocation (`services/location.service.ts`) | no plan/spec (bounded fix) | n/a — real `expo-location` permission + fix, consolidated out of `SosContext.tsx`/`(tabs)/map.tsx` |
| SOS trigger | no plan/spec (bounded fix) | **Real**. `POST /api/sos` (authenticated), `SosAlert` Prisma model. Also dual-writes a linked `Incident` row so it's visible to responders (see below). `cancelSOS` in `SosContext.tsx` is still local-only — no cancel/resolve endpoint exists |
| Citizen notification inbox (bell + `/notifications`) | `2026-09-05-citizen-notifications` | **Real** — real `Notification` Prisma model, `GET /api/notifications`, real Expo push via `services/push.service.ts`. Covers announcement publish, incident status changes, tide/weather risk escalation |
| Map (`(tabs)/map.tsx`) | no dedicated plan/spec | **Real** — dual-engine map (`components/map/AppMap.tsx` picks Leaflet-in-WebView inside Expo Go, Mapbox everywhere else, same `MapEngineProps`/`MapHandle` contract either way), real evacuation-center data, real GPS pin-drop |
| Advisory banner / tide & weather risk | `2026-09-04-advisory-banner`, `2026-08-27-tide-level-backend`, `2026-08-29-tide-weather-backend` | **Real** |
| First-time user guide / onboarding tour | `2026-09-04-first-time-user-guide` | n/a (client-side tour) |

Auth (login/register/forgot-password/Google sign-in) predates the plans/specs convention but is real-backend-wired via `services/auth.service.ts` and `AuthContext`. `user.role` (`"citizen" | "responder"`) is returned by the backend on login/register/Google-auth and drives routing in `app/_layout.tsx`.

## Built but still mock-data-only (no plan/spec yet, no backend)

- `app/contacts` — `services/contacts.service.ts` (hotlines + personal contacts, hardcoded)
- `app/evacuation-detail/[id]` — `services/evacuation.service.ts` (hardcoded centers; real, researched addresses/coords, but no backend or live capacity)
- `app/faqs`, `app/settings`, `app/contact-support` — static content, nothing to wire
- SOS cancel/resolve — `cancelSOS` in `SosContext.tsx` is local-only; no backend endpoint (the trigger side is real, see above)
- Google Sign-In client IDs in `.env` — unverified as of this update (`.env` isn't committed/readable from a checkout); treat as unconfirmed rather than assuming either way

## Done — Responder (team) flow

What was a 100%-mock prototype (see git history before ~2026-08-19) is now a fully real second user role, built out over several specs:

- **Real incident pipeline** (`2026-08-19-responder-incident-pipeline`): `mockIncidents.ts` deleted; real `Incident` Prisma model fed by both citizen reports and SOS triggers; `services/incident.service.ts` replaces it. `__DEV__` responder-login bypass removed (`3eabebc`) once the backend started returning real `role`.
- **Multi-responder roster** (`2026-09-08-multi-responder-incidents`): replaced the old single-`acceptedByResponderId` exclusive-accept model with a real per-responder roster (`IncidentResponder`, statuses `joined`/`on_the_way`/`arrived`/`left`/`declined`). Each responder now has their own independent phase (`incident.myStatus`), not one shared incident-wide phase. `LobbyView` shows the real active roster.
- **Dashboard grouping + filters** (`2026-09-07-responder-barangay-grouping`): incident list grouped by barangay, prioritized by urgency/activity; a filter bar (`IncidentFilterBar`, `filterIncidents.ts`) was added alongside this.
- **Live updates** (`2026-09-08-active-incident-realtime`): Socket.IO pushes roster/status changes to the open incident-detail screen without polling; receive-only, REST stays the write path.
- **Responder-side notifications** (no plan/spec, bounded): a bell on the responder dashboard + the shared `/notifications` inbox/push pipeline now also serve responders — `new_incident` (fans out to on-duty responders when a citizen report or SOS creates a new incident), `roster_update` (teammates notified on join/on-the-way/arrived/left/completed/cancelled, never the actor), and `team_ring` (the "Ring Team" button now sends a real ping to the rest of the active roster instead of a no-op local haptic).
- **Duty status is now real** (no plan/spec, bounded): `User.isOnDuty` persists server-side; going "Offline" actually stops new-incident pages/notifications instead of only hiding the local list. Toggle reverts with an alert on a failed request.
- **Leave affordance** (no plan/spec, bounded): a responder can now back out of an incident they've joined (`LobbyView`) or are en route to (`OnTheWayView`) via a real "Leave Incident" action — previously modeled on the backend but unreachable from the UI. Deliberately not offered from `ArrivedView` (that phase's exit hatch is "Cancel Incident"). Re-opening an already-left incident to rejoin isn't wired yet (see Next steps).
- **"Start Assistance" removed** (no plan/spec, bounded): it was a permanent `Alert.alert("Coming soon.")` stub; removed entirely rather than wired up, since Arrived already means "on scene and assisting" — no separate "start" action was needed.
- **Admin-side role management**: promoting a citizen to responder (or reverting one) is a real action in the `CordovaRiskQ- Admin` app's Users page (`PATCH /admin/users/:id/role`), not a manual SQL update. There is intentionally **no self-registration path** for the responder role — only an admin can change it.
- **Real map/nav**: `OnTheWayView`/`app/responder/navigate.tsx` use the same real dual-engine map + real turn-by-turn routing (`useRoute` hook) as the rest of the app.

**Known gaps in this flow:**
- "Chat with Team" was replaced by "Ring Team," which is now real (see above) — there's no separate team chat feature.
- Rejoining an incident you previously left isn't supported end-to-end: the backend allows it (`joined` is a valid transition from `left`), but `PendingView`'s "Decline" button would still be offered and would 409 (decline is a no-existing-row-only action), and revisiting a `left` incident currently hits the same "Already declined" alert written for the `declined` case.
- No `docs/superpowers/plans|specs` entry exists for the original responder-flow prototype-to-real transition as one unit — it was built incrementally across the specs listed above instead.

---

## Next steps

Pick one path — they're independent:

1. **Finish backend-wiring the remaining civilian mock screens**: contacts/hotlines, evacuation centers (including live capacity), and an SOS cancel/resolve endpoint — each would follow the same plan/spec pattern as User Profile / citizen notifications did.
2. **Rejoin-after-leaving on the responder side**: decide whether `PendingView` should distinguish "never touched this incident" from "previously left it" (e.g. hide Decline, different copy) rather than leaving this edge case unhandled.
3. **Verify/fill Google OAuth client IDs** in `.env` — status unconfirmed from a fresh checkout (see above).

## Definition of "frontend complete"

- [ ] Every screen's service backed by a real API call, not a hardcoded array (contacts, evacuation centers, SOS cancel remain — see mock-data list above)
- [x] SOS button actually triggers something real + real device location
- [x] Responder flow formalized and real (roster, notifications, duty status, live updates)
- [ ] Google Sign-In client IDs filled in `.env` (unconfirmed, see Next steps)
- [x] Role-based routing (civilian vs. responder account types), backend-driven
- [x] `__DEV__` responder login bypass removed
- [x] Responder role changes are a real admin action, not a manual DB update
