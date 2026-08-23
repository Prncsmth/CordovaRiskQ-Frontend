# Admin Role Management Design

**Goal:** Let an admin change a user's role between `citizen` and `responder` from the Cordova RiskQ Admin web app, replacing the current manual-SQL promotion workflow. This requires making the admin app's login and Users page real — today the entire admin app is a static UI mockup with no backend wiring at all.

**Architecture:** Two repos, worked in sequence, mirroring the pattern used for the responder incident pipeline. Backend (`CordovaRiskQ-Bacnkend`) first — `User.role` already stores a free-text string (`"citizen"` by default) with no schema change needed, so `"admin"` becomes valid the moment the backend code recognizes it. A new `requireAdmin` middleware guards a new `admin.*` route/controller/service layer (mirroring `incident.*`) exposing `GET /api/admin/users` and `PATCH /api/admin/users/:id/role`. Admin frontend (`CordovaRiskQ- Admin/cordova-riskq-admin`) second — real login against the existing `POST /api/auth/login`, a route guard on the dashboard layout, and the Users page wired to the new endpoints in place of its two hardcoded rows.

**Tech Stack:** Backend: Express 5, Prisma 7 (Postgres/Neon), `zod` — unchanged from the incident pipeline work. Admin frontend: Next.js (App Router), React, `localStorage` for session state (matching the existing, currently-cosmetic `riskq_admin_authenticated` flag). No new dependencies in either repo.

## Global Constraints

- **Repos:** backend work happens in `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend`; admin frontend work happens in `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ- Admin\cordova-riskq-admin`. Each task states which one.
- **No new dependencies in either repo. No DB migration** — `User.role` is already an unconstrained `String @default("citizen")` column (added in the responder incident pipeline work); this feature only adds a third convention value, `"admin"`, at the application layer.
- **No automated test suite in either repo.** Verification is `npx tsc --noEmit` (backend) / `npm run build` (admin, Next.js) plus manual curl/browser checks.
- **Backend error convention:** every thrown error is an `AppError(message, statusCode)`; the global `errorHandler` turns it into `{ success: false, message }`.
- **Backend layering:** `routes` → `validate` middleware → `controller` (thin, `asyncHandler`-wrapped) → `service` (business logic + Prisma). Follow `incident.*` as the template.
- **Backend response envelope:** every controller responds `{ success: true, <resource> }` (or `<resource+"s">` for a list) — never a bare object.
- **Safety rule:** the role-change endpoint only ever moves a target user between `"citizen"` and `"responder"`. If the target's current role is `"admin"`, the endpoint rejects with 403 — this UI can never promote someone to admin or demote an admin. The first (and any future) admin account is promoted by hand via SQL, the same bootstrapping pattern already used for the test responder account in the incident pipeline work.
- **No fabricated data.** The admin Users table currently renders a hardcoded `status: "Active" | "Suspended"` the backend has no concept of. This field is dropped, not wired to a fake value — the table shows `role` instead, which is real.
- **Session storage:** the admin app already uses `localStorage.getItem("riskq_admin_authenticated")` as its (currently meaningless) session flag. This feature keeps using `localStorage` for the JWT and cached user info, consistent with that existing pattern — no cookie-based session is introduced.
- Commit after every task.

## Backend: `admin.*` resource

**New middleware — `src/middlewares/requireAdmin.middleware.ts`:**
Runs after `authenticate` (which sets `req.userId`). Looks up the user by `req.userId`, and calls `next(new AppError("Admin access required", 403))` if `user.role !== "admin"` or the user no longer exists. Otherwise calls `next()`.

**New validation — `src/validations/admin.validation.ts`:**
```ts
export const updateUserRoleSchema = z.object({
  role: z.enum(["citizen", "responder"]),
});
```

**New service — `src/services/admin.service.ts`:**
- `listUsers()`: `prisma.user.findMany({ orderBy: { createdAt: "desc" } })`, mapped to `{ id, name, email, role, createdAt }` (excludes `password`, `googleId`, `mobile`).
- `updateUserRole(targetUserId, role)`: fetches the target user, throws `AppError("User not found", 404)` if missing, throws `AppError("Cannot change an admin's role", 403)` if `target.role === "admin"`, otherwise `prisma.user.update(...)` and returns the same shape as `listUsers`'s rows.

**New controller — `src/controllers/admin.controller.ts`:** thin `asyncHandler`-wrapped `listUsers` and `updateUserRole`, following the `incident.controller.ts` pattern exactly (`res.status(200).json({ success: true, users })` / `{ success: true, user }`).

**New routes — `src/routes/admin.routes.ts`:**
```
GET   /api/admin/users            authenticate, requireAdmin           → listUsers
PATCH /api/admin/users/:id/role   authenticate, requireAdmin, validate → updateUserRole
```
Mounted in `src/routes/index.ts` alongside the other route files.

## Admin frontend: real login, guarded dashboard, real Users page

**`src/lib/constants.ts`:** fix `API_URL`'s default from `http://localhost:5000/api` to `http://localhost:8000/api` (the backend's actual port) — currently wrong and would silently 404 every request once wiring goes live.

**`src/types/user.ts`:** replace the fabricated `status: UserStatus` field with `role: "citizen" | "responder" | "admin"`. `UserStatus` type is deleted (no longer referenced once `UserTable` stops rendering it).

**`src/hooks/useAuth.ts`:** becomes a real client-side auth hook —
- `login(email, password)`: `POST /api/auth/login` (same endpoint the mobile app uses), throws if the response's `user.role !== "admin"` (message: "This account does not have admin access"), otherwise stores `riskq_admin_token` (JWT) and `riskq_admin_user` (JSON: id/name/email/role) in `localStorage`, sets `authenticated = true`.
- `logout()`: clears both `localStorage` keys.
- Exposes `{ authenticated, token, user, login, logout }`.

**`src/app/(auth)/login/page.tsx`:** `handleSubmit` calls the real `login()` from `useAuth` instead of the fake `setTimeout`; shows the thrown error message inline on failure (wrong password, or "not an admin account"); navigates to `/dashboard` only on success.

**`src/app/(dashboard)/layout.tsx`:** currently has no guard at all — add one. On mount, if `!authenticated`, redirect to `/login`. This is the minimum necessary follow-through of making login real; without it, an unauthenticated user can still open any `/dashboard/*` URL directly, which would make the login screen decorative.

**`src/components/layout/UserMenu.tsx`:** `logout()` updated to clear the new `riskq_admin_token`/`riskq_admin_user` keys in addition to the existing flag (the hardcoded "Admin User" / "Super Admin" display text is left as-is — out of scope, see Non-Goals).

**`src/lib/api.ts`:** add token support, mirroring the mobile frontend's `apiGet`/`apiPatch` helpers:
```ts
export async function apiFetch<T>(endpoint: string, options?: RequestInit & { token?: string }): Promise<T> {
  const { token, ...rest } = options ?? {};
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
  });
  if (!response.ok) throw new Error("API request failed");
  return response.json();
}
```

**`src/hooks/useUsers.ts`:** becomes a real data hook —
- On mount (and given a `token` from `useAuth`), calls `apiFetch<{ success: true; users: AdminUserRow[] }>("/admin/users", { token })`, maps to `User[]`, sets `loading`.
- Exposes `changeRole(id: string, role: "citizen" | "responder"): Promise<void>` which calls `apiFetch(\`/admin/users/${id}/role\`, { method: "PATCH", body: JSON.stringify({ role }), token })` and updates the local `users` array in place on success (no full refetch needed).

**`src/components/users/UserTable.tsx`:** replaces its hardcoded two-row array with `useUsers()`. Table columns become User / Email / Role / Action:
- Role column: a `Badge` — `"admin"` → `info`, `"responder"` → `success`, `"citizen"` → `default`.
- Action column: keeps the existing "View" link (now pointing at the real `user.id`), plus a new button — "Promote to Responder" (shown when `role === "citizen"`) or "Revert to Citizen" (shown when `role === "responder"`) — calling `changeRole`. Hidden entirely for `role === "admin"` rows (nothing to toggle, and the backend would reject it anyway).
- Loading state: reuse the existing `Loading` component while `loading` is true; empty state: reuse `EmptyState` if `users.length === 0`.

## Non-Goals (explicitly out of scope)

- `UserDetails.tsx` / `users/[id]/page.tsx` — stays hardcoded ("John Doe"). The role-change action lives on the list row per the chosen UI placement; the detail page is untouched.
- Suspend/status functionality (`SuspendUserModal.tsx`, `UserStatus.tsx`) — the backend has no such concept; these components become orphaned/unused, not deleted (no request to remove them).
- Every other admin section — Responders, Emergencies, SOS Alerts, Live Map, Analytics, Reports, Announcements, Audit Logs, Evacuation Centers, Resources, Witnesses, Settings — remains exactly as mocked today. None of it is touched.
- `UserMenu`'s hardcoded "Admin User" / "Super Admin" display name — not wired to the real logged-in admin's name.
- Promoting a user *to* admin, or demoting an admin — not possible through this UI by design (see Safety rule); remains a manual SQL operation.
- Real-time/websocket updates to the Users list (`useSocket.ts` exists but is unrelated to this feature) — the list is fetch-on-mount only; an admin refreshes the page to see another admin's changes.

## Verification Plan

1. **Backend, via curl:** register a normal account, manually promote it to `role = 'admin'` via `prisma db execute` (same mechanism as the responder bootstrap). Log in as that account and confirm the JWT works against `GET /api/admin/users` (200, lists all users) while a non-admin token gets 403. `PATCH /api/admin/users/:id/role` with a citizen target succeeds and flips their role; retrying against an admin-role target returns 403 "Cannot change an admin's role".
2. **Admin app, in the browser:** log in with a non-admin account → rejected with the inline error. Log in with the admin account → lands on `/dashboard`. Navigate to Users → real rows appear (not "John Doe" / "Jane Doe") with correct role badges. Click "Promote to Responder" on a citizen row → badge flips to responder, button label flips to "Revert to Citizen", without a page reload. Directly visiting `/dashboard/users` in a fresh incognito window (no login) redirects to `/login`.
