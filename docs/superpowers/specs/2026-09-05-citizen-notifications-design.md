# Citizen Notification Inbox — Design

**Date:** 2026-09-05
**Repos touched:** `CordovaRiskQ-Bacnkend` (sibling repo, `C:\Users\kianr\CordovaRiskQ-Bacnkend` — Express + Prisma/Postgres + JWT, TypeScript, ESM with `@/` path aliases), `CordovaRiskQ-Frontend` (this repo — Expo Router, React Native).

## Purpose

The mobile Home screen's bell icon (`components/home/HomeHeader.tsx`) and the notifications screen (`app/notifications/index.tsx`) already have full UI built against `services/notification.service.ts`, which returns a hardcoded `NOTIFICATIONS` array. There is no backend, no real events, and no push delivery. This spec replaces that mock with a real per-citizen notification inbox, generated from three existing events already happening in the system — announcement publish, incident status change, and tide/weather risk escalation — and delivered both as an in-app list and as real device push notifications.

This is scoped to the **citizen mobile inbox only**. `cordova-riskq-admin` has a separate, unrelated mocked notification system (`src/lib/mockNotifications.ts`, `NotificationsMenu.tsx`) — an operational awareness feed for admin staff (new SOS alerts, incidents, responder verification, evacuation capacity, new users). That is a different feature with different sources and audience; it is explicitly out of scope here and untouched by this spec.

## Scope

1. Backend: `Notification` Prisma model (one row per recipient); `User.pushToken` field.
2. Backend: `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` (all citizen-authenticated).
3. Backend: `PATCH /api/users/push-token` (citizen-authenticated).
4. Backend: wire three existing services (`announcementService.create`, `incidentService.accept`/`updateStatus`, `tideService.refreshTideStatus`) to call a new `notificationService.createForUsers(...)`, which persists rows and sends Expo push notifications to recipients with a registered token.
5. Mobile: `services/push.service.ts` (new) registers the device for push and syncs the token to the backend after login.
6. Mobile: `services/notification.service.ts` rewritten against the real endpoints; `app/notifications/index.tsx` and `components/home/HomeHeader.tsx`'s `hasUnread` adapted to real `read` state and `createdAt` instead of the mock's `group`/`timestamp` strings.

## Out of scope

- **Admin ops feed.** `cordova-riskq-admin`'s mocked SOS/incident/responder/user activity notifications are a separate system with a separate spec, not touched here.
- **Push for "Specific Barangay" announcements.** Push requires knowing recipients server-side at send time. Barangay-scoped announcement targeting is matched live against the citizen's GPS-derived nearest barangay when Home loads (per the advisory-banner spec) — there is no stored per-user home barangay to fan out to. "Specific Barangay" announcements continue to work exactly as before on the Home banner; they simply don't generate an inbox row or a push. Adding a stored home-barangay field is a real scope increase (a registration/profile-flow change), explicitly declined here as it was in the advisory-banner spec.
- **Per-notification read/tap actions or deep-linking.** Rows are not individually tappable beyond the existing haptic feedback. The entire inbox is marked read as a batch when the screen opens.
- **Notification preferences/settings.** No per-type opt-out UI. (`cordova-riskq-admin`'s mocked `NotificationSettings.tsx` is unrelated — an admin-side settings mock — and stays mocked.)
- **Retention/cleanup job.** Rows are never deleted; `GET /api/notifications` caps the returned list at the 50 most recent per user, but older rows remain in the table indefinitely.
- **Multi-device push.** `User.pushToken` is a single field; logging in on a second device overwrites the first device's token. Acceptable at this app's scale, consistent with the rest of the codebase's single-session assumptions.
- **De-escalation notifications.** Tide/weather risk dropping back to a lower level (e.g. warning → normal) does not notify — only escalation into a higher risk level does, and only after a prior reading exists (the very first poll never counts as an escalation).
- **Automated tests.** None of the two repos in this chain has a test setup; verification is manual, consistent with prior specs in this series (e.g. [2026-09-04-advisory-banner-design.md](./2026-09-04-advisory-banner-design.md)).

## Architecture

### Backend (`CordovaRiskQ-Bacnkend`)

**Prisma schema** (`prisma/schema.prisma`) gains:

```prisma
model Notification {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String   // "announcement" | "incident_status" | "tide_risk"
  title     String
  body      String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

`User` gains `pushToken: String?` and a `notifications: Notification[]` back-relation.

A migration (`npm run db:migrate`) adds the table and column.

**Service** (`src/services/notification.service.ts`, new):
- `listForUser(userId: string)`: `findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 })`.
- `markRead(id: string, userId: string)`: updates the row's `read: true`; throws `AppError(404, ...)` if no row with that `id` and `userId` exists (prevents marking another user's notification read).
- `markAllRead(userId: string)`: `updateMany({ where: { userId, read: false }, data: { read: true } })`.
- `createForUsers(userIds: string[], data: { type: string; title: string; body: string })`: internal helper, not exposed via any route.
  1. `prisma.notification.createMany({ data: userIds.map((userId) => ({ userId, ...data })) })`.
  2. Fetches `pushToken` for those `userIds` where it's non-null.
  3. If any tokens found, POSTs a single batched request to `https://exp.host/--/api/v2/push/send` with one message per token (`{ to: token, title: data.title, body: data.body }`).
  4. Inspects the response for `DeviceNotRegistered` errors per message; for each, sets that user's `pushToken` to `null`.
  5. Push failures (network error, non-2xx from Expo, malformed response) are caught and logged, never thrown — the `Notification` rows are already committed by this point and are the source of truth; push is a best-effort secondary channel.

**Controller/routes** (citizen-authenticated, following the existing `incident.controller.ts`/`incident.routes.ts` layering):
- `src/controllers/notification.controller.ts`:
  - `list`: `notificationService.listForUser(req.userId)` → `{ success: true, notifications }`.
  - `markRead`: `notificationService.markRead(req.params.id, req.userId)` → `{ success: true }`.
  - `markAllRead`: `notificationService.markAllRead(req.userId)` → `{ success: true }`.
- `src/routes/notification.routes.ts`:
  - `router.get("/notifications", authenticate, notificationController.list)`.
  - `router.patch("/notifications/:id/read", authenticate, notificationController.markRead)`.
  - `router.patch("/notifications/read-all", authenticate, notificationController.markAllRead)`.
  - Mounted in `src/routes/index.ts` alongside the existing route files.
- `src/controllers/user.controller.ts` gains `updatePushToken`: validated body `{ token: string }` → `prisma.user.update({ where: { id: req.userId }, data: { pushToken: req.body.token } })` → `{ success: true }`.
- `src/routes/user.routes.ts` gains `router.patch("/users/push-token", authenticate, validate(updatePushTokenSchema), userController.updatePushToken)`.

**Trigger wiring** — each call site already exists; this spec adds one line at the end of each:

- `src/services/announcement.service.ts`'s `create(...)`: after the `prisma.announcement.create(...)` call, if `data.audience === "All Users"`, fetch `prisma.user.findMany({ where: { role: "citizen" }, select: { id: true } })` and call `notificationService.createForUsers(citizenIds, { type: "announcement", title: announcement.title, body: announcement.content })`. Skip entirely for `"Specific Barangay"` and `"Responders Only"`.
- `src/services/incident.service.ts`'s `accept(...)` and `updateStatus(...)`: after each successful `prisma.incident.update(...)`, call `notificationService.createForUsers([incident.reporterId], { type: "incident_status", title, body })` with copy keyed by the new status:
  - `lobby` → title "Responder assigned", body "A responder has accepted your report."
  - `on_the_way` → title "Responder en route", body "Your responder is on the way."
  - `arrived` → title "Responder arrived", body "Your responder has arrived at the location."
  - `completed` → title "Report resolved", body "Your report has been resolved."
  - `cancelled` → title "Report cancelled", body "Your report was cancelled."
- `src/services/tide.service.ts`'s `refreshTideStatus()`: it already fetches `existing` before upserting. Add `const SEVERITY: Record<string, number> = { normal: 0, watch: 1, warning: 2 }`. After computing the new `floodRiskLevel`, if `existing` is non-null and `SEVERITY[floodRiskLevel] > SEVERITY[existing.floodRiskLevel]`, fetch all citizen user ids and call `notificationService.createForUsers(citizenIds, { type: "tide_risk", title: \`Flood risk: ${floodRiskLevel === "warning" ? "Warning" : "Watch"}\`, body: <matches the existing FLOOD_MESSAGE copy already used for this level> })`. This call happens after the `prisma.tideStatus.upsert(...)`, using the freshly computed value and the `existing` row fetched at the top of the function.

### Mobile (`CordovaRiskQ-Frontend`, this repo)

**`services/push.service.ts`** (new): wraps `expo-notifications` (+ `expo-device` to skip registration on simulators, where push tokens aren't issued).

```ts
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) return;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;
  const { data: token } = await Notifications.getExpoPushTokenAsync();
  await apiPatch("/api/users/push-token", { token }).catch(() => {});
}
```

Called once from `context/AuthContext.tsx`, right after a successful login or session-restore (alongside the existing user-fetch on auth). Permission denial or any failure is silently swallowed — the in-app inbox is fully independent of push and unaffected.

**`services/notification.service.ts`** (rewritten):

```ts
export type NotificationType = "announcement" | "incident_status" | "tide_risk";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export async function getNotifications(): Promise<AppNotification[]> {
  const response = await apiGet<{ success: true; notifications: AppNotification[] }>("/api/notifications");
  return response.notifications;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiPatch("/api/notifications/read-all", {});
}
```

**`utils/formatter.ts`** gains `formatRelativeTime(value: string | Date): string` — `"Just now"` under a minute, `"Xm ago"` under an hour, `"Xh ago"` under 24h, otherwise falls back to `formatDate`.

**`app/notifications/index.tsx`**:
- Buckets into "Today"/"Earlier" client-side by comparing each `createdAt` to the current calendar day (new local helper), replacing the old stored `group` field.
- Row timestamp uses `formatRelativeTime(item.createdAt)` instead of the old canned `timestamp` string.
- `iconForNotification` switches from title-string-sniffing to a `type`-keyed map: `announcement` → `megaphone-outline`, `incident_status` → `document-text-outline`, `tide_risk` → `water-outline`.
- After the initial fetch resolves, fires `markAllNotificationsRead().catch(() => {})` — opening the inbox is what clears unread state; no per-row action.

**`app/(tabs)/home.tsx`**: `hasUnread` changes from `notifications.length > 0` to `notifications.some((n) => !n.read)`.

**New dependency**: `npx expo install expo-notifications expo-device`.

## Data flow

1. **Announcement published** (citizen, "All Users"): admin dashboard → `POST /admin/announcements` → row created → `notificationService.createForUsers` fans out one `Notification` row per citizen + a batched Expo push to whoever has a token.
2. **Incident status changes**: responder app → `PATCH /incidents/:id/accept` or `/status` → row updated → one `Notification` row for the reporter + a push if they have a token.
3. **Tide risk escalates**: the existing 8h polling job (`tidePolling.ts`) → `refreshTideStatus()` → if the new severity exceeds the prior reading, fan out to all citizens.
4. **Citizen opens Home**: `getNotifications()` (already called in the existing effect) → `hasUnread` reflects any `read: false` row → bell shows a dot.
5. **Citizen opens Notifications screen**: list loads, then `markAllNotificationsRead()` fires → next Home mount, the dot is gone.
6. **Push delivery**: independent of steps 4–5 — whether or not the app is open, a citizen with a registered token gets a device notification the moment `createForUsers` runs server-side.

## Error handling

- **Backend**: `markRead`/`markAllRead`/`list` follow the existing `authenticate` + `asyncHandler` pattern; a missing/foreign notification id on `markRead` returns `404`. `createForUsers` never throws on push failure — it's a best-effort secondary channel; the persisted rows are the source of truth and are unaffected by any Expo API issue.
- **Mobile**: `getNotifications()`/`markAllNotificationsRead()` follow the existing `.catch(() => {})` convention used throughout `home.tsx` and this repo's other services — a failed fetch just means a stale or empty list, no error UI. `registerForPushNotifications()` swallows every failure path (permission denied, no physical device, network error) since push is additive, not required functionality.

## Testing

Manual verification (no repo in this chain has an automated test setup):

**Backend**, via curl/Postman against the running dev server:
- Publish an "All Users" announcement; confirm `GET /api/notifications` (as one of the citizen users) now includes a row with `type: "announcement"`.
- Publish a "Specific Barangay" announcement; confirm no new row appears for any citizen (push and inbox both skip it).
- As a responder, accept an incident then walk it through `on_the_way`/`arrived`/`completed`; confirm the reporter's `GET /api/notifications` gains one row per transition, in order.
- Manually flip a `TideStatus` row's `floodRiskLevel` to `"normal"` in the DB, then trigger a poll that would compute `"watch"`; confirm citizens get a `tide_risk` row. Confirm a second poll that stays at `"watch"` does **not** create a duplicate.
- `PATCH /api/notifications/:id/read` on someone else's notification id → `404`.
- `PATCH /api/users/push-token` with a token, then trigger any of the three events above with a real Expo push token (e.g. from `expo start` on a physical device) → confirm a device notification arrives.

**Mobile**, running against the local backend:
- Fresh login on a physical device (not simulator) → confirm a push-permission prompt appears and, once granted, `PATCH /api/users/push-token` fires (check backend logs or DB).
- With unread notifications, confirm the Home bell shows the dot; open the Notifications screen, confirm the list renders grouped into Today/Earlier with relative timestamps and correct icons per type; return to Home, confirm the dot is gone.
- Deny push permission on first prompt; confirm the in-app inbox still works normally (list loads, unread badge still functions) with no crash or error surfaced.

## Self-Review Notes

- **Scope coverage**: all 6 scope items map to concrete sections above — model + push-token field, three inbox endpoints, one push-token endpoint, three trigger wirings, mobile push registration, mobile inbox rewiring.
- **Placeholder scan**: no TBD/TODO; every endpoint, trigger, and mobile change has concrete shape.
- **Consistency check**: `AppNotification`'s `type` union (`"announcement" | "incident_status" | "tide_risk"`) matches exactly the three `type` string literals used in the three trigger call sites. `createForUsers`'s signature (`userIds: string[]`, `{ type, title, body }`) is used identically by all three callers. The severity-rank comparison in the tide trigger only fires when `existing` is non-null, matching the "no notification on the very first poll" decision.
- **Out-of-scope boundary check**: every decision made during brainstorming (skip push for barangay-scoped, escalation-only, every incident status transition, no per-row read, no admin feed) is reflected in either Scope or Out of scope, not left implicit.
