# Advisory Banner (Announcements) — Design

**Date:** 2026-09-04
**Repos touched:** `CordovaRiskQ-Frontend` (this repo — Expo Router, React Native), `CordovaRiskQ-Bacnkend` (sibling repo, `C:\Users\kianr\CordovaRiskQ-Bacnkend` — Express + Prisma/Postgres + JWT, TypeScript, ESM with `@/` path aliases), `cordova-riskq-admin` (sibling repo, `C:\Users\kianr\cordova-riskq-admin` — Next.js admin dashboard).

## Purpose

The citizen Home screen's advisory card (`components/home/AdvisoryBanner.tsx`, composed in `app/(tabs)/home.tsx`) currently always renders a hardcoded `MOCK_ADVISORY` with a "SAMPLE" badge. Separately, `cordova-riskq-admin` already has a fully-built but entirely mocked "Announcements" page (`AnnouncementForm`/`AnnouncementTable`/`AnnouncementPreview`, `types/announcement.ts`) whose publish handler is explicitly stubbed: *"No backend endpoint yet — this just resets the draft so the flow is demonstrable end-to-end once the API is wired up."*

This spec treats these as the same feature: admin staff publish an announcement through the admin dashboard, and it appears as the advisory banner on the citizen Home screen. It adds the missing backend (no `Announcement` model or endpoints exist today) and wires both frontends to it.

## Scope

1. Backend: `Announcement` Prisma model.
2. Backend: `GET /api/announcements/active` (public), `GET /api/admin/announcements`, `POST /api/admin/announcements`, `DELETE /api/admin/announcements/:id` (admin-only).
3. Admin (`cordova-riskq-admin`): wire `AnnouncementForm`/`AnnouncementTable` to the new admin endpoints via a `useAnnouncements` hook; add a barangay picker to the form, shown only for "Specific Barangay" audience.
4. Mobile (this repo): `services/advisory.service.ts`; `home.tsx` fetches the active announcement (using the barangay it already derives from GPS) and renders `AdvisoryBanner` only when one exists; `AdvisoryBanner` drops its `sample` prop/badge and adapts its meta text to priority instead of a PAGASA signal label.

## Out of scope

- **Edit/draft/unpublish-toggle for admins.** The existing admin UI has no draft state — one "Publish" action. This spec adds create + delete (retract) only; no `PATCH`, no `published` boolean, no separate publish step.
- **Audit logging.** `cordova-riskq-admin`'s audit-logs page is separately mocked and has no backend model; this spec doesn't add one. Deletes/creates aren't recorded anywhere beyond the row itself.
- **Responder-facing surfacing.** `audience: "Responders Only"` is a valid value admins can pick and it's excluded from the citizen endpoint's results, but no responder screen is wired to display it. That's a separate follow-up.
- **Home-barangay profile field.** "Specific Barangay" targeting on mobile is matched against the GPS-derived nearest barangay already computed in `home.tsx` (via `getNearestBarangay`), not a stored per-user home barangay (no such field exists on `User` today, and adding one is a registration/profile-flow change out of scope here).
- **Push notifications.** Publishing an announcement doesn't create an entry in `services/notification.service.ts` (still separately mocked) or send a push. Home-screen banner only.
- **New color tokens / visual redesign.** The banner keeps its current warning-colored card and icon for every priority; only its label text changes.
- **Automated tests.** None of the three repos has a test setup covering these flows; verification is manual, consistent with prior specs in this series (e.g. [2026-08-27-tide-level-backend-design.md](./2026-08-27-tide-level-backend-design.md)).

## Architecture

### Backend (`CordovaRiskQ-Bacnkend`)

**Prisma schema** (`prisma/schema.prisma`) gains:

```prisma
model Announcement {
  id              String   @id @default(uuid())
  title           String
  content         String
  priority        String   // "Normal" | "Urgent"
  audience        String   // "All Users" | "Responders Only" | "Specific Barangay"
  barangayName    String?  // set only when audience is "Specific Barangay"
  createdByUserId String
  createdBy       User     @relation(fields: [createdByUserId], references: [id])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

A migration (`npm run db:migrate`) adds the table.

**Validation** (`src/validations/announcement.validation.ts`, following `admin.validation.ts`'s Zod-style pattern): `priority` must be `"Normal" | "Urgent"`; `audience` must be one of the three allowed values; `barangayName` required (non-empty) when `audience === "Specific Barangay"`, rejected (must be absent/null) otherwise.

**Service** (`src/services/announcement.service.ts`):
- `getActive(barangayName?: string)`: queries for rows where `audience = "All Users"` OR (`audience = "Specific Barangay"` AND `barangayName` case-insensitively equals the param), **excluding** `audience = "Responders Only"` unconditionally, ordered by `createdAt desc`, `take: 1`. Returns the row or `null`.
- `listForAdmin()`: all rows, `createdAt desc`, `take: 50`.
- `create(data, createdByUserId)`: creates a row via Prisma.
- `remove(id)`: deletes a row by id; throws `AppError(404, ...)` if it doesn't exist.

**Controller/routes**, following the existing `admin.controller.ts`/`admin.routes.ts` layering (auth via `authenticate` + `requireAdmin`, which checks `User.role === "admin"` — the same mechanism the admin dashboard's `/auth/login` already uses, **not** the separate unused `Admin` model/`admin-auth.*` system):

- `src/controllers/announcement.controller.ts`:
  - `getActive`: reads `req.query.barangay`, calls `announcementService.getActive(...)`, returns `{ success: true, announcement: Announcement | null }`.
  - `listForAdmin`: returns `{ success: true, announcements: Announcement[] }`.
  - `create`: validated body → `announcementService.create(req.body, req.userId)` → `{ success: true, announcement }`, `201`.
  - `remove`: `announcementService.remove(req.params.id)` → `{ success: true }`.
- `src/routes/announcement.routes.ts`:
  - `router.get("/announcements/active", announcementController.getActive)` — no auth (public safety content, same reasoning as `/api/tide`).
  - `router.get("/admin/announcements", authenticate, requireAdmin, announcementController.listForAdmin)`.
  - `router.post("/admin/announcements", authenticate, requireAdmin, validate(createAnnouncementSchema), announcementController.create)`.
  - `router.delete("/admin/announcements/:id", authenticate, requireAdmin, announcementController.remove)`.
  - Mounted in `src/routes/index.ts` alongside the existing route files.

### Admin (`cordova-riskq-admin`)

**`src/hooks/useAnnouncements.ts`** (new), following `useUsers.ts`'s exact shape (`apiFetch` + `useAuth().token`, cancelled-flag cleanup):
- On mount (when `token` is available): `GET /admin/announcements` → populates `announcements` state.
- `create(input: { title, content, priority, audience, barangayName? })`: `POST /admin/announcements`, prepends the result to local state on success.
- `remove(id: string)`: `DELETE /admin/announcements/:id`, filters it out of local state on success.
- `loading`/`error`/`actionError`, mirroring `useUsers`.

**`src/types/announcement.ts`**: add `barangayName?: string` to `Announcement`; drop `published` (no draft state — see Out of scope).

**`src/app/(dashboard)/announcements/page.tsx`**: uses `useAnnouncements()`. `handlePublish` becomes `async`, calls `create({ title, body→content, priority, audience, barangayName })`, then clears the draft fields on success (keeps the existing clear-on-publish UX).

**`src/components/announcements/AnnouncementForm.tsx`**: adds a barangay `<select>` (new small local constant, e.g. `src/constants/barangays.ts`, listing the 13 Cordova barangay names — this repo has no shared package with the mobile repo's `constants/cordovaBarangays.ts`, so the list is duplicated, matching how `CordovaRiskQ-Bacnkend`'s `tide-level-backend` spec already duplicated Cordova's center coordinates rather than sharing a package). Rendered only when `audience === "Specific Barangay"`; a new `barangay`/`onBarangayChange` prop pair.

**`src/components/announcements/AnnouncementTable.tsx`**: drops the local mock array; takes `announcements`/`onDelete` props from the page (sourced from the hook); adds a delete icon-button per row.

`AnnouncementPreview.tsx` is unchanged (still a local, unsaved draft preview).

### Mobile (`CordovaRiskQ-Frontend`, this repo)

**`services/advisory.service.ts`** (new), following `tide.service.ts`'s pattern:

```ts
export type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: "Normal" | "Urgent";
  createdAt: string; // ISO timestamp
};

export async function getActiveAnnouncement(barangayName?: string): Promise<Announcement | null> {
  const query = barangayName ? `?barangay=${encodeURIComponent(barangayName)}` : "";
  const response = await apiGet<{ success: true; announcement: Announcement | null }>(
    `/api/announcements/active${query}`,
  );
  return response.announcement;
}
```

(`audience`/`barangayName` aren't part of the type here — the server has already applied that filtering; the client only ever needs the content to display.)

**`app/(tabs)/home.tsx`**: the existing `useEffect`'s `Promise.all([getEvacuationCenters(), getCurrentLocation()])` block already computes `nearestBarangay` when a GPS fix is available (from the just-committed barangay-location change). Add an `announcement` state (`Announcement | null`), and after computing `nearestBarangay`, call `getActiveAnnouncement(nearestBarangay?.name).then(setAnnouncement).catch(() => {})` — same silent-catch convention used elsewhere in this effect. If there's no GPS fix, call `getActiveAnnouncement()` with no barangay (server then only matches "All Users" announcements). Delete `MOCK_ADVISORY`. Render `<AdvisoryBanner>` only when `announcement` is non-null, passing:
- `priority={announcement.priority}`
- `time={formatTime(announcement.createdAt)}`
- `title={announcement.title}`
- `message={announcement.content}`

**`components/home/AdvisoryBanner.tsx`**: replace the `signalLabel`/`sample` props with `priority: "Normal" | "Urgent"`. Meta text becomes `` `ANNOUNCEMENT · ${priority === "Urgent" ? "URGENT" : "NOTICE"}` ``. Drop the `sampleBadge`/`sampleBadgeText` styles and the "SAMPLE" badge JSX entirely. Card/icon coloring unchanged (stays the existing warning treatment regardless of priority).

## Data flow

1. **Admin publishes**: dashboard form → `create(...)` → `POST /admin/announcements` (authenticated as a `role: "admin"` user) → validated → row inserted → returned row prepended to the admin table.
2. **Citizen loads Home**: `home.tsx` mounts → location effect resolves GPS fix → `getNearestBarangay` → `getActiveAnnouncement(barangayName)` → `GET /api/announcements/active?barangay=...` (no auth) → server picks the newest matching row → `home.tsx` sets `announcement` state → `AdvisoryBanner` renders if non-null.
3. **Admin retracts**: table delete button → `remove(id)` → `DELETE /admin/announcements/:id` → row removed → next citizen Home load (or app foreground/refresh) simply stops matching it; if nothing else matches, the banner disappears.

## Error handling

- **Backend**: validation failures on `POST` return `400` via the existing `validate.middleware.ts` pattern. `remove()` on a missing id returns `404`. `getActive` never throws for "nothing matches" — it returns `{ success: true, announcement: null }`, which is a normal, expected response (not an error), matching that "no advisory right now" is the common case.
- **Frontend (both)**: mobile follows the existing `.catch(() => {})` convention already used throughout `home.tsx` — a failed fetch just means the banner doesn't render, no error UI. Admin's `useAnnouncements` surfaces `error`/`actionError` strings the same way `useUsers` does, for the page to optionally display (matching that hook's existing convention; this spec doesn't prescribe new UI copy beyond what `useUsers`'s consumers already do).

## Testing

Manual verification (no repo in this chain has an automated test setup):

**Backend**, via curl/Postman against the running dev server:
- `POST /admin/announcements` (with an admin bearer token) with each `audience` value; confirm `400` when `audience: "Specific Barangay"` is sent without `barangayName`.
- `GET /api/announcements/active` with no query → only ever returns an "All Users" row (never "Responders Only" or an unmatched "Specific Barangay" one).
- `GET /api/announcements/active?barangay=Poblacion` → returns a "Specific Barangay"/"Poblacion" row if one exists and is newest, otherwise falls back to the newest "All Users" row.
- `DELETE /admin/announcements/:id` → `200`, then confirm it no longer appears in `GET /admin/announcements` or `GET /api/announcements/active`.

**Admin**, running against the local backend:
- Publish an "All Users" announcement; confirm it appears in the table without a page reload.
- Publish a "Specific Barangay" announcement; confirm the barangay picker only appears for that audience choice and the value round-trips.
- Delete an announcement; confirm it disappears from the table.

**Mobile**, running against the local backend:
- With a published "All Users" announcement, confirm the Home banner renders with the right title/content and an "URGENT"/"NOTICE" label matching its priority.
- Publish a "Specific Barangay" announcement for a barangay other than the device's current location; confirm the Home banner does **not** show it.
- Publish one for the device's actual nearest barangay; confirm it does show.
- Delete the active announcement (or let it be superseded by nothing); confirm the Home banner stops rendering entirely rather than showing stale content.
