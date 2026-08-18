# CordovaRiskQ Frontend — Progress Tracker

> Living document. Update this after every feature lands (new plan/spec pair merged, or a task list in `docs/superpowers/plans/*` finished). Don't duplicate detail that already lives in `docs/superpowers/plans/*` or `specs/*` — link to it instead.

Last updated: 2026-08-18 (device geolocation + SOS backend wiring)

## How this project builds features

Every shipped feature has a paired design spec + implementation plan in `docs/superpowers/specs/` and `docs/superpowers/plans/`, executed task-by-task with checkboxes and a commit per task. Check there first for the *how* of any completed feature — this file only tracks *what's done* and *what's left*.

---

## Done (civilian/citizen app)

| Feature | Plan/Spec | Backend-wired? |
|---|---|---|
| Design system import (theme, colors, base UI kit) | `2026-07-25-cordova-riskq-design-import` | n/a |
| Home screen | `2026-07-28-home-screen` | Mock centers (`services/evacuation.service.ts`, hardcoded), but "nearest center" is now ranked by real device distance (`utils/distance.ts`) instead of each center's static `distanceKm` |
| Report incident flow | `2026-07-29-report-incident` | Mock (`services/report.service.ts` fakes a ref number), but the pinned location is now real device GPS (see below) instead of a hardcoded barangay |
| Change Password (bottom sheet) | `2026-07-31-change-password`, `2026-08-03-user-profile-backend` | **Real** (`PUT` via `user.service.ts`) |
| Profile screen (menu) | `2026-07-31-profile-screen` | n/a (navigation only) |
| Report history | `2026-07-31-report-history` | Mock (`services/report.service.ts`) |
| User profile (view/edit) | `2026-07-31-user-profile`, `2026-08-03-user-profile-backend` | **Real** (`services/user.service.ts`) |
| Onboarding (phone number + terms gate) | `2026-08-05-onboarding` | **Real**, persists `mobile` to `PUT /api/users/me`; gated by backend's `isNewUser` flag on Google sign-up |
| Device geolocation (`services/location.service.ts`) | no plan/spec (bounded fix) | n/a — was hardcoded to `{0,0}`, now requests permission + calls `expo-location` for real; consolidated into the one place `SosContext.tsx` and `(tabs)/map.tsx` both used to duplicate inline |
| SOS trigger | no plan/spec (bounded fix) | **Real**. New `POST /api/sos` (authenticated) on the backend — route/controller/service/`SosAlert` Prisma model mirroring the `user` resource pattern. `services/sos.service.ts` calls it with the real device location from the fix above |
| Report location (`(tabs)/report.tsx`) | no plan/spec (bounded fix) | Still feeds the mock `report.service.ts`, but now uses real GPS: precise coordinates + a nearest-barangay label (`constants/cordovaBarangays.ts`'s new `getNearestBarangay`), not full reverse geocoding. Falls back to the old hardcoded Poblacion default if location is unavailable. The submitted payload now carries `latitude`/`longitude` so they're ready once a real report/incident backend exists — **note: no pipeline connects citizen reports to the responder side yet**, that's a separate, bigger feature (see Next steps) |

Auth (login/register/forgot-password/Google sign-in) predates the plans/specs convention but is real-backend-wired via `services/auth.service.ts` and `AuthContext`.

## Built but still mock-data-only (no plan/spec yet, no backend)

These screens exist and render, but their `services/*.ts` return hardcoded arrays instead of calling a real API:

- `app/contacts` — `services/contacts.service.ts` (hotlines list, hardcoded)
- `app/evacuation-detail/[id]` — `services/evacuation.service.ts` (hardcoded centers)
- `app/notifications` — `services/notification.service.ts` (hardcoded)
- `app/faqs`, `app/settings`, `app/contact-support` — static content, nothing to wire
- `app/sos` + `components/sos/*` — SOS trigger and device geolocation are now real (see Done table above). `cancelSOS` in `SosContext.tsx` is still local-only (no cancel/resolve endpoint on the backend) — out of scope for the trigger fix
- `(tabs)/map.tsx` — uses `react-native-maps` but check whether it's live-wired to real evacuation-center/incident data or still placeholder markers

## In progress — Responder (team) flow

**Current task.** New, uncommitted files on `main`:
- `app/responder/index.tsx`, `app/responder/[id].tsx`
- `components/responder/{IncidentMap,RButton,TeamMemberRow,UrgencyBadge}.tsx`
- `types/responder.ts`, `services/mockIncidents.ts`

This is a first-draft prototype of a **second user role** (emergency responder/team member, separate from the civilian reporter flow built so far): incident list → accept/decline → team lobby → on-the-way → arrived. 100% mock data (`mockIncidents.ts`), `IncidentMap` is a deliberately fake route-preview card (not a live `MapView` — see its own top comment) to avoid needing a Maps API key before the flow is real. `app/responder/index.tsx` is now a real dashboard, not just a flat list: duty status toggle (online/offline, hides the incident list while offline), a stats row (nearby count, high-urgency count — both derived from `mockIncidents`, no new fake data), and a logout action (previously there was no way to leave the responder flow at all).

**Role + routing — now wired, but only frontend-side:**
- `role: "citizen" | "responder"` added to `AuthUser` (`types/auth.ts`, `context/AuthContext.tsx`) and threaded through `app/_layout.tsx`'s redirect logic: a `"responder"` account is routed to `/responder` instead of `(tabs)/home`, and a `"citizen"` account is bounced out of `/responder` if it ever lands there (stale deep link, etc.).
- **Backend contract needed:** `POST /api/auth/login`, `/api/auth/register`, and `/api/auth/google` need to start returning `user.role` (`"citizen" | "responder"`) for this to work with real accounts. Until that ships, `services/auth.service.ts`'s response types mark `role` optional and `AuthContext.login()` defaults it to `"citizen"` — so nothing breaks, but no real account can reach the responder flow yet.
- **Dev-only bypass in the meantime:** `app/(auth)/login.tsx` has a `__DEV__`-gated "Continue as Responder (dev)" link that logs in with a fake local responder account (no API call). It's stripped from production builds automatically via `__DEV__` and should be deleted once the backend sends real roles and a real responder login exists.

**Still not wired up:**
- No `docs/superpowers/plans|specs` entry exists for this feature — breaks from every other feature's process so far.
- `Chat with Team`, `Navigate`, and `Start Assistance` buttons in `app/responder/[id].tsx` are no-ops (`onPress={() => {}}` or an `Alert.alert("Coming soon.")`).
- No responder registration/account-creation path — only the dev bypass or (once implemented) a backend-created account.

**Also uncommitted, related setup:**
- `package.json`/`package-lock.json` — added `react-native-maps@1.20.1` (not actually used by `IncidentMap` yet — see above)
- `eas.json` (new) + `app.json` `extra.eas.projectId` — EAS Build config, likely prep for a dev client build since `react-native-maps` needs native code Expo Go can't run
- `.env` — Google OAuth client ID placeholders reformatted (values still blank/placeholder, not filled in)
- `.claude/settings.local.json` — local tooling permissions, not app-relevant

---

## Next steps

Pick one path — they're independent:

1. **Formalize the responder flow** (recommended if this is the priority): write a design spec + implementation plan under `docs/superpowers/` per the project's normal process, covering: the backend returning `user.role` on login/register/Google-auth (frontend side already handles it, see above), removing the `__DEV__` login bypass once that lands, replacing `mockIncidents.ts` with a real incidents API, and wiring the three no-op buttons.
2. **Finish backend-wiring the civilian app** before starting a second role: SOS trigger + device geolocation ✅ done (2026-08-18); still remaining: evacuation centers, notifications, contacts/hotlines, and report submission/history — each would follow the same plan/spec pattern as User Profile did.
3. **Land the in-flight config changes** either way: decide if `react-native-maps` + `eas.json` are still wanted, commit them (or revert if abandoned), and fill in the real Google OAuth client IDs in `.env` (currently placeholders — Google Sign-In is non-functional until these are real).

## Definition of "frontend complete"

Not there yet. Outstanding before this app could be considered done:
- [ ] Every screen's service backed by a real API call, not a hardcoded array (see mock-data list above)
- [x] SOS button actually triggers something real + real device location
- [ ] Responder flow either formalized and finished, or removed if out of scope
- [ ] Google Sign-In client IDs filled in `.env`
- [x] Role-based routing (civilian vs. responder account types) — frontend done; backend still needs to return `user.role`
- [ ] `__DEV__` responder login bypass removed once backend role support ships
