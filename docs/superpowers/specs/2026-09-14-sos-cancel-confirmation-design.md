# SOS Cancel + Send Confirmation + Auto-Minimize — Design

**Date:** 2026-09-14
**Repos touched:** `CordovaRiskQ-Bacnkend` (sibling repo, `C:\Users\kianr\CordovaRiskQ-Bacnkend` — Express + Prisma/Postgres + JWT, TypeScript), `CordovaRiskQ-Frontend` (this repo — Expo Router, React Native).

## Purpose

Two problems on the SOS alert screen:

1. **"Cancel SOS" doesn't do anything server-side.** Today, pressing it while an SOS is active only resets local UI state (`SosContext.cancelSOS`) — it never tells the backend. A responder already viewing or assigned to the incident has no idea the citizen backed out. The premise that "cancel is redundant because responders already have it" isn't quite right: cancel doesn't communicate with responders at all today, in either direction.
2. **No explicit "sent successfully" confirmation.** `stage` flips to `"active"` (showing "Help Is On The Way") *before* `triggerSOS` resolves — the UI is optimistic, with no distinct moment confirming the alert actually reached the server.

This spec adds a real citizen-callable cancel (only while nobody has joined yet) and an explicit "SOS sent successfully" confirmation.

## Scope

1. Backend: `sosService.trigger` returns the mirrored `Incident`'s id alongside the existing `SosAlert` fields.
2. Backend: new `PATCH /api/incidents/:id/cancel` (citizen-authenticated) — cancels the caller's own incident, only while its status is still `"pending"`.
3. Backend: `canCancelIncident` pure authorization predicate (mirrors the existing `canViewIncident`), unit tested.
4. Mobile: `SosContext` gains a `"sending"` stage (between `"verifying"` and `"active"`) and tracks the current `incidentId`; `cancelSOS()` calls the new endpoint when there's a live incident to cancel, falling back to today's local-only reset when there isn't (e.g. the best-effort incident mirror failed at trigger time).
5. Mobile: `SosOverlay` shows a "Sending your SOS alert..." loading state during `"sending"`, and a "✓ SOS sent successfully" badge once `"active"`.
6. Mobile: the full-screen "active" overlay auto-minimizes to a persistent, tappable banner after 20s, freeing up normal navigation, without touching the SOS's server-side state or its cancellability.

## Out of scope

- **Manual incident reports.** This is SOS-only. `report.tsx`'s citizen reports have no cancel UI today; adding one is a separate feature.
- **Cancelling after a responder has joined.** Once `status` leaves `"pending"` (a responder has joined/is en route/arrived), the citizen can no longer unilaterally cancel — mirrors how the responder-side `updateStatus` endpoint is itself gated on being `"arrived"` before closing a case. A cancel attempt at that point returns `409` and the frontend shows an explanatory alert instead of resetting the screen.
- **Live status polling on the SOS screen.** The frontend doesn't poll to proactively hide/disable the Cancel button once a responder joins — the backend is the single source of truth, enforced at cancel time via the `409`. Avoids new polling/socket infrastructure for a rare edge case (tapping Cancel in the narrow window after assignment).
- **Notifying responders on cancel.** Not needed: cancellation is only possible while `status === "pending"`, i.e. by definition no responder is assigned yet. The existing `emitIncidentUpdate` broadcast (unconditionally wired for consistency with `updateStatus`/`updateMyResponderStatus`) still reaches anyone who has the incident's detail screen open (e.g. a responder reviewing it before accepting) via the existing `incident:${id}` socket room.
- **Re-arming the auto-minimize timer.** Re-expanding via the banner (`expandSOS`) never restarts the 20s countdown — once the citizen has deliberately reopened the status screen, it stays open until they minimize it themselves (via the chevron-down button, `minimizeSOS`) or cancel.

## Architecture

### Backend (`CordovaRiskQ-Bacnkend`)

**`src/services/incidentAuthorization.ts`** gains:
```ts
export function canCancelIncident(reporterId: string, requesterId: string, status: string): boolean {
  return reporterId === requesterId && status === "pending";
}
```
Unit tested in `incidentAuthorization.test.ts` alongside the existing `canViewIncident` tests.

**`src/services/incident.service.ts`** gains `cancelByReporter(id, reporterId)`:
1. 404 if the incident doesn't exist.
2. 403 if `incident.reporterId !== reporterId`.
3. 409 if `!canCancelIncident(...)` (status isn't `"pending"`).
4. Otherwise updates `status: "cancelled"` and returns `buildResponderFacingIncident(...)` (same shape `updateStatus` returns, used for the socket broadcast — not forwarded to the citizen response body).

**`src/controllers/incident.controller.ts`** gains `cancelByReporter`, mirroring `updateStatus`'s shape: calls the service, broadcasts via `emitIncidentUpdate`, responds `{ success: true }` (the citizen caller doesn't need the responder-shaped payload back).

**`src/routes/incident.routes.ts`** gains:
```ts
router.patch("/incidents/:id/cancel", authenticate, incidentController.cancelByReporter);
```
No request-body validation needed (no body).

**`src/services/sos.service.ts`**'s `trigger` now captures `createFromSos`'s returned incident id into the response:
```ts
let incidentId: string | null = null;
try {
  const incident = await incidentService.createFromSos(userId, alert.id, data);
  incidentId = incident.id;
} catch (err) { /* unchanged best-effort logging */ }
return { id: alert.id, status: alert.status, createdAt: alert.createdAt, incidentId };
```
`incidentId` stays `null` if the best-effort incident mirror failed — the frontend degrades to local-only cancel in that case, same as it always has.

### Mobile (`CordovaRiskQ-Frontend`, this repo)

**`services/sos.service.ts`**: `SosAlert` type gains `incidentId: string | null`; new `cancelSosIncident(token, incidentId)` calling the new `PATCH` endpoint.

**`context/SosContext.tsx`**:
- `SosStage` gains `"sending"`, inserted between `"verifying"` and `"active"`.
- New `incidentId` state, set from `triggerSOS`'s response right before flipping to `"active"`, cleared at the start of every new `runConfirm()` attempt and after a successful cancel.
- `runConfirm()`: after location is verified and the reporting token exists, sets `"sending"` (not `"active"`) *before* calling `triggerSOS`; only flips to `"active"` once that call actually resolves. A failure still lands on the existing `blockedReason: "unavailable"` modal, unchanged.
- `cancelSOS()` (`runCancel` internally): always abandons any in-flight confirm attempt (bumps `attemptIdRef`, same as before). If the stage being left was `"active"` and there's a live `incidentId` and token, calls `cancelSosIncident` first:
  - Success → resets to `"idle"`.
  - `409` → `Alert.alert("Can't cancel", "A responder has already been assigned to your SOS and is on the way.")`, stays on the active screen (the SOS is genuinely still in effect).
  - Any other error → generic "couldn't cancel, check your connection" alert, stays on the active screen so the user can retry.
  - If there's no `incidentId` (mirror failed) or the stage being left wasn't `"active"` (backing out of confirm/verifying/sending, nothing was ever confirmed sent) → resets to `"idle"` immediately, exactly like today.

**`components/sos/SosOverlay.tsx`**:
- `VerifyingView` renamed to `LoadingView`, taking a `message` prop — reused for both `"verifying"` ("Getting your accurate location...") and `"sending"` ("Sending your SOS alert...").
- `ActiveView` gains a small pill badge — checkmark icon + "SOS sent successfully" — above the existing "Help Is On The Way" content.

### Auto-minimize + persistent banner

Added after the above, in the same session, in response to the follow-up idea: don't leave the citizen stuck on the full-screen overlay indefinitely, but keep the SOS itself, and the ability to cancel it, reachable.

- `SosContext` gains `isMinimized: boolean`, `expandSOS()`, and `minimizeSOS()`. `stage === "active"` now means "the SOS is in effect" independent of whether the full-screen overlay or the minimized banner is showing — those are orthogonal.
- `ActiveView` gains a small chevron-down button (top-right) calling `minimizeSOS()` directly, so a citizen who reopened the status screen via the banner isn't stuck full-screen with only Cancel as a way out.
- Right after `triggerSOS` succeeds (flipping to `"active"`), a one-shot 20s timer (`AUTO_MINIMIZE_DELAY_MS`) sets `isMinimized: true`. Tapping the resulting banner calls `expandSOS()`, which does **not** restart the timer — a screen the citizen deliberately reopened is never yanked away again.
- The timer is cleared (`clearMinimizeTimer`) at the start of every new `runConfirm()` attempt and at the start of `runCancel()`, so a stale timer from an abandoned or completed cycle can never fire against a later, unrelated one.
- `SosOverlay` renders the full-screen container only when `stage !== "idle" && !(stage === "active" && isMinimized)`; when active-and-minimized, it renders a small top banner ("🚨 SOS Active — Responders Notified") instead, tappable to re-expand into the same `ActiveView` (with its Cancel button) already built above.
- `TabBar`'s hide rule changes from `stage === "active"` to `stage === "active" && !isMinimized` — navigation returns to normal once minimized, since only the full-screen overlay needs the bar out of the way.
- The SOS/incident itself is untouched by minimizing — it stays `"active"`/`"pending"` server-side exactly as before; this is purely a client-side display state.

## Data flow

1. Citizen confirms SOS → `"verifying"` (GPS fix) → `"sending"` (POST `/api/sos`) → backend creates `SosAlert` + mirrored `Incident` (`status: "pending"`) → response includes `incidentId` → frontend stores it, flips to `"active"`, shows the sent confirmation, and starts the 20s auto-minimize timer.
2. After ~20s (if the citizen hasn't cancelled), the overlay auto-minimizes to the persistent banner; the tab bar reappears and the citizen can use the rest of the app normally.
3. Citizen taps Cancel while `"active"` and still `"pending"` (from either the full-screen view or by reopening it via the banner) → `PATCH /api/incidents/:id/cancel` → incident `status: "cancelled"` → `emitIncidentUpdate` broadcasts to `incident:${id}` (reaches a responder who has that incident's detail screen open, using the same "incident cancelled" handling that screen already has) → frontend resets to `"idle"`.
4. Citizen taps Cancel after a responder has joined → backend returns `409` → frontend shows an explanatory alert, stays on the active screen (help is still coming).

## Error handling

- **Backend**: `cancelByReporter` follows the existing `AppError` + `asyncHandler` pattern (404/403/409), consistent with `updateStatus`'s 403/404 shape.
- **Mobile**: unchanged failure paths for permission-denied / location-unavailable / trigger-failure (still land on the existing blocked-reason modal). The only new failure path (cancel arriving too late) uses a plain `Alert.alert` rather than a modal, since the SOS itself remains valid and ongoing — the user isn't blocked from anything, just informed.

## Testing

**Backend**: `canCancelIncident` unit tested (reporter-mismatch and every non-`"pending"` status: `lobby`/`on_the_way`/`arrived`/`completed`/`cancelled`) in `incidentAuthorization.test.ts`, following this repo's existing convention of unit-testing pure authorization predicates rather than full Prisma-touching service methods (no other endpoint here has a dedicated test either).

**Mobile**: no new unit tests — consistent with this repo's convention of not unit-testing screen/context UI flow (no RTL setup). Manual verification: trigger an SOS and confirm the "Sending..." → "Sent successfully" transition; cancel while still pending and confirm it resets; simulate an already-assigned incident (accept it from the responder app before cancelling) and confirm the `409` alert appears and the screen stays active.

## Self-Review Notes

- **Scope coverage**: all 5 scope items map to concrete sections above.
- **Placeholder scan**: no TBD/TODO; every function signature and status code is concrete.
- **Consistency check**: `canCancelIncident`'s signature mirrors `canViewIncident`'s style (role/id-based pure predicate). `cancelByReporter`'s return shape and the controller's broadcast call are structurally identical to `updateStatus`'s, so the pattern doesn't fork unnecessarily.
- **Out-of-scope boundary check**: the "why no polling" and "why no responder notification" decisions from brainstorming are both captured in Out of scope, not left implicit.
