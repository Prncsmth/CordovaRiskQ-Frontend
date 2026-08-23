# Admin Role Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin change a user's role between `citizen` and `responder` from the Cordova RiskQ Admin web app, replacing the current manual-SQL promotion workflow.

**Architecture:** Two repos, worked in sequence. Backend (`CordovaRiskQ-Bacnkend`) first — `User.role` is already a free-text string column, so a new `requireAdmin` middleware plus an `admin.*` route/controller/service layer (mirroring `incident.*`) is all that's needed, no migration. Admin frontend (`CordovaRiskQ- Admin/cordova-riskq-admin`) second — the entire admin app is currently a static UI mockup with no backend wiring at all, so this plan makes login real, adds a route guard, and wires the Users page to the new endpoints in place of its two hardcoded rows.

**Tech Stack:** Backend: Express 5, Prisma 7 (Postgres/Neon), `zod`. Admin frontend: Next.js (App Router), React, `localStorage` for session state. No new dependencies in either repo.

**Spec:** `docs/superpowers/specs/2026-08-23-admin-role-management-design.md`

## Global Constraints

- **Repos:** backend work happens in `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend`; admin frontend work happens in `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ- Admin\cordova-riskq-admin`. Each task states which one.
- **No new dependencies in either repo. No DB migration** — `User.role` is already an unconstrained `String @default("citizen")` column; `"admin"` is a third convention value recognized only at the application layer.
- **No automated test suite in either repo.** Verification is `npx tsc --noEmit` (backend) / `npm run build` (admin frontend) plus manual curl/browser checks.
- **Backend error convention:** every thrown error is an `AppError(message, statusCode)`; the global `errorHandler` turns it into `{ success: false, message }`.
- **Backend layering:** `routes` → `validate` middleware → `controller` (thin, `asyncHandler`-wrapped) → `service` (business logic + Prisma). Follow `incident.*` as the template.
- **Backend response envelope:** every controller responds `{ success: true, <resource> }` (or `<resource+"s">` for a list) — never a bare object.
- **Backend routes are mounted without an `/api` prefix in the route file itself** — `app.ts` applies `app.use("/api", routes)` once, centrally. Route files define paths like `/admin/users`, not `/api/admin/users`.
- **Safety rule:** the role-change endpoint only ever moves a target user between `"citizen"` and `"responder"`. If the target's current role is `"admin"`, the endpoint rejects with 403. An admin can never promote someone to admin or demote an admin through this UI — that stays a manual SQL operation.
- **No fabricated data.** The admin Users table currently renders a hardcoded `status: "Active" | "Suspended"` the backend has no concept of. This field is dropped, not wired to a fake value — the table shows `role` instead, which is real.
- **Session storage:** the admin app keeps using `localStorage` for the JWT and cached admin user info (already used this way for its currently-cosmetic `riskq_admin_authenticated` flag) — no cookie-based session is introduced.
- Commit after every task.

---

### Task 1: `requireAdmin` middleware

**Repo:** `CordovaRiskQ-Bacnkend`

**Files:**
- Create: `src/middlewares/requireAdmin.middleware.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`, `AppError` from `@/utils/AppError`, `AuthenticatedRequest` from `@/middlewares/authenticate.middleware` (sets `req.userId`, already runs before this middleware on every route that uses it).
- Produces: `requireAdmin` middleware — Task 2's routes chain it after `authenticate`.

- [ ] **Step 1: Create `src/middlewares/requireAdmin.middleware.ts`**

```ts
import { NextFunction, Response } from "express";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/AppError";
import { AuthenticatedRequest } from "@/middlewares/authenticate.middleware";

export async function requireAdmin(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user || user.role !== "admin") {
            return next(new AppError("Admin access required", 403));
        }
        next();
    } catch (err) {
        next(err);
    }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/middlewares/requireAdmin.middleware.ts
git commit -m "feat: add requireAdmin middleware"
```

---

### Task 2: `admin` users resource (list + role change)

**Repo:** `CordovaRiskQ-Bacnkend`

**Depends on:** Task 1

**Files:**
- Create: `src/validations/admin.validation.ts`
- Create: `src/services/admin.service.ts`
- Create: `src/controllers/admin.controller.ts`
- Create: `src/routes/admin.routes.ts`
- Modify: `src/routes/index.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`, `AppError` from `@/utils/AppError`, `asyncHandler` from `@/utils/asyncHandler`, `authenticate`/`AuthenticatedRequest` from `@/middlewares/authenticate.middleware`, `requireAdmin` from `@/middlewares/requireAdmin.middleware` (Task 1), `validate` from `@/middlewares/validate.middleware`.
- Produces: `adminService.listUsers()`, `adminService.updateUserRole(targetUserId, role)`; `router` default-exported from `@/routes/admin.routes`, mounted at `/api`. The response shape `{ id, name, email, role, createdAt }` for each user row is what the admin frontend's Task 6 (`useUsers`) parses.

- [ ] **Step 1: Create `src/validations/admin.validation.ts`**

```ts
import { z } from "zod";

export const updateUserRoleSchema = z.object({
    role: z.enum(["citizen", "responder"]),
});
```

- [ ] **Step 2: Create `src/services/admin.service.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/AppError";

export const adminService = {
    async listUsers() {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: "desc" },
        });

        return users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        }));
    },

    async updateUserRole(targetUserId: string, role: string) {
        const target = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!target) throw new AppError("User not found", 404);
        if (target.role === "admin") {
            throw new AppError("Cannot change an admin's role", 403);
        }

        const updated = await prisma.user.update({
            where: { id: targetUserId },
            data: { role },
        });

        return {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            role: updated.role,
            createdAt: updated.createdAt,
        };
    },
};
```

- [ ] **Step 3: Create `src/controllers/admin.controller.ts`**

```ts
import { Response } from "express";
import { AuthenticatedRequest } from "@/middlewares/authenticate.middleware";
import { adminService } from "@/services/admin.service";
import { asyncHandler } from "@/utils/asyncHandler";

export const adminController = {
    listUsers: asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
        const users = await adminService.listUsers();
        res.status(200).json({ success: true, users });
    }),

    updateUserRole: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await adminService.updateUserRole(req.params.id, req.body.role);
        res.status(200).json({ success: true, user });
    }),
};
```

- [ ] **Step 4: Create `src/routes/admin.routes.ts`**

```ts
import { Router } from "express";
import { adminController } from "@/controllers/admin.controller";
import { authenticate } from "@/middlewares/authenticate.middleware";
import { requireAdmin } from "@/middlewares/requireAdmin.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { updateUserRoleSchema } from "@/validations/admin.validation";

const router = Router();

router.get("/admin/users", authenticate, requireAdmin, adminController.listUsers);
router.patch(
    "/admin/users/:id/role",
    authenticate,
    requireAdmin,
    validate(updateUserRoleSchema),
    adminController.updateUserRole
);

export default router;
```

- [ ] **Step 5: Mount the new routes**

Current `src/routes/index.ts`:

```ts
import { Router } from "express";
import testRoutes from "@/routes/test.routes";
import authRoutes from "@/routes/auth.routes";
import userRoutes from "@/routes/user.routes";
import sosRoutes from "@/routes/sos.routes";
import incidentRoutes from "@/routes/incident.routes";

// Central router — mount all feature route files here.
// As you add new resources, do: router.use(entityRoutes) below.
const router = Router();

router.use(testRoutes);
router.use(authRoutes);
router.use(userRoutes);
router.use(sosRoutes);
router.use(incidentRoutes);

export default router;
```

Replace with:

```ts
import { Router } from "express";
import testRoutes from "@/routes/test.routes";
import authRoutes from "@/routes/auth.routes";
import userRoutes from "@/routes/user.routes";
import sosRoutes from "@/routes/sos.routes";
import incidentRoutes from "@/routes/incident.routes";
import adminRoutes from "@/routes/admin.routes";

// Central router — mount all feature route files here.
// As you add new resources, do: router.use(entityRoutes) below.
const router = Router();

router.use(testRoutes);
router.use(authRoutes);
router.use(userRoutes);
router.use(sosRoutes);
router.use(incidentRoutes);
router.use(adminRoutes);

export default router;
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/validations/admin.validation.ts src/services/admin.service.ts src/controllers/admin.controller.ts src/routes/admin.routes.ts src/routes/index.ts
git commit -m "feat: add admin users resource (list + role change)"
```

- [ ] **Step 8: Manual verification**

Start the dev server in a separate terminal (from `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend`): `npm run dev`

Register two test accounts and capture their tokens:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin-test@example.com","password":"testpass123","name":"Admin Test"}'

curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"citizen-role-test@example.com","password":"testpass123","name":"Citizen RoleTest"}'
```

Expected: each `201` with a `token`. Save them as `$ADMIN` and `$CITIZEN`.

Promote the admin account by hand:

```bash
cd C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ-Bacnkend
cat > promote_admin_tmp.sql << 'EOF'
UPDATE "User" SET role = 'admin' WHERE email = 'admin-test@example.com';
EOF
npx prisma db execute --file promote_admin_tmp.sql
rm promote_admin_tmp.sql
```

The admin's token from registration is now stale on the `role` claim only in the sense that `/auth/login` will return the fresh role — log in again to get a token whose accompanying `user.role` reads `"admin"`:

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin-test@example.com","password":"testpass123"}'
```

Expected: `200`, `user.role` is `"admin"`. Save this token as `$ADMIN` (overwrite the earlier one).

List users as admin, then as a non-admin:

```bash
curl -i http://localhost:8000/api/admin/users -H "Authorization: Bearer $ADMIN"
curl -i http://localhost:8000/api/admin/users -H "Authorization: Bearer $CITIZEN"
```

Expected: first `200` with a `users` array containing both test accounts; second `403` — `{"success":false,"message":"Admin access required"}`.

Change the citizen's role, then confirm the admin's own role is protected:

```bash
curl -X PATCH http://localhost:8000/api/admin/users/<citizen-user-id>/role \
  -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN" \
  -d '{"role":"responder"}'

curl -i -X PATCH http://localhost:8000/api/admin/users/<admin-user-id>/role \
  -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN" \
  -d '{"role":"citizen"}'
```

(Get `<citizen-user-id>` and `<admin-user-id>` from the `GET /api/admin/users` response above.)

Expected: first `200` with `"role":"responder"`; second `403` — `{"success":false,"message":"Cannot change an admin's role"}`.

---

### Task 3: Admin frontend — API client + types foundation

**Repo:** `CordovaRiskQ- Admin/cordova-riskq-admin`

**Files:**
- Modify: `src/lib/constants.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/types/user.ts`

**Interfaces:**
- Produces: `apiFetch<T>(endpoint, options?: RequestInit & { token?: string })` — surfaces the backend's `message` on failure instead of a generic error. `User` type gains `role: UserRole` (`"citizen" | "responder" | "admin"`), loses the fabricated `status` field. Tasks 4 and 6 both call `apiFetch`; Tasks 6 and 7 both use the updated `User`/`UserRole` types.

- [ ] **Step 1: Fix the API port in `src/lib/constants.ts`**

Current:

```ts
export const APP_NAME = "Cordova RISKQ";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api";
```

Replace with:

```ts
export const APP_NAME = "Cordova RISKQ";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/api";
```

(Leave `SOCKET_URL` and everything below it unchanged — unrelated to this feature.)

- [ ] **Step 2: Replace `src/lib/api.ts`**

Current:

```ts
import { API_URL } from "./constants";

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error("API request failed");
  }

  return response.json();
}
```

Replace with:

```ts
import { API_URL } from "./constants";

async function extractErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(text) as { message?: string };
    if (typeof parsed.message === "string" && parsed.message.length > 0) {
      return parsed.message;
    }
  } catch {
    // Response body wasn't JSON — fall through to a generic message.
  }
  return `Request failed with status ${response.status}`;
}

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const { token, headers, ...rest } = options ?? {};

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json();
}
```

- [ ] **Step 3: Replace `src/types/user.ts`**

Current:

```ts
export type UserStatus = "Active" | "Suspended";

export interface User {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  createdAt: string;
}
```

Replace with:

```ts
export type UserRole = "citizen" | "responder" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: build succeeds. (`useUsers.ts` still references the old `User` shape at this point in the plan — Task 6 updates it. If the build fails on `useUsers.ts`, that's expected until Task 6; confirm the *only* errors are in that one file.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/constants.ts src/lib/api.ts src/types/user.ts
git commit -m "feat: add auth token support to API client, add role to User type"
```

---

### Task 4: Admin frontend — real login

**Repo:** `CordovaRiskQ- Admin/cordova-riskq-admin`

**Depends on:** Task 3

**Files:**
- Modify: `src/hooks/useAuth.ts`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/components/layout/UserMenu.tsx`

**Interfaces:**
- Consumes: `apiFetch` from `@/lib/api` (Task 3), `User` from `@/types/user` (Task 3).
- Produces: `useAuth()` returns `{ authenticated: boolean, token: string | null, user: User | null, login(email, password): Promise<void>, logout(): void }`. `login` throws an `Error` with a user-facing message on failure. Task 5's route guard and Task 6's `useUsers` both consume `authenticated`/`token` from this hook.

- [ ] **Step 1: Replace `src/hooks/useAuth.ts`**

Current:

```ts
"use client";

import { useState } from "react";

export function useAuth() {
  const [authenticated] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return localStorage.getItem("riskq_admin_authenticated") === "true";
  });

  return { authenticated };
}
```

Replace with:

```ts
"use client";

import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";
import { User } from "@/types/user";

const TOKEN_KEY = "riskq_admin_token";
const USER_KEY = "riskq_admin_user";
const AUTH_FLAG_KEY = "riskq_admin_authenticated";

type LoginResponse = {
  success: true;
  user: { id: string; email: string; name: string | null; role: string };
  token: string;
};

function readStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AUTH_FLAG_KEY) === "true";
  });
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [token, setToken] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)
  );

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (response.user.role !== "admin") {
      throw new Error("This account does not have admin access.");
    }

    const nextUser: User = {
      id: response.user.id,
      name: response.user.name ?? "",
      email: response.user.email,
      role: "admin",
      createdAt: "",
    };

    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    localStorage.setItem(AUTH_FLAG_KEY, "true");
    setToken(response.token);
    setUser(nextUser);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(AUTH_FLAG_KEY);
    setToken(null);
    setUser(null);
    setAuthenticated(false);
  }, []);

  return { authenticated, token, user, login, logout };
}
```

- [ ] **Step 2: Wire the login form to the real `login()`**

Current `src/app/(auth)/login/page.tsx` (relevant parts):

```tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Mail,
  Lock,
  Eye,
  Shield,  
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setLoading(true);

    setTimeout(() => {
      localStorage.setItem("riskq_admin_authenticated", "true");
      router.push("/dashboard");
    }, 800);
  }
```

Replace with:

```tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Mail,
  Lock,
  Eye,
  Shield,  
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
      setLoading(false);
    }
  }
```

- [ ] **Step 3: Show the error in the form**

Current:

```tsx
              <div className="flex justify-between text-sm">

                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Remember me
                </label>

              </div>

              <button
                disabled={loading}
                className="w-full rounded-xl bg-linear-to-r from-primary to-primary-dark py-4 text-lg font-bold text-white shadow-lg hover:scale-[1.02] transition disabled:opacity-70"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
```

Replace with:

```tsx
              <div className="flex justify-between text-sm">

                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Remember me
                </label>

              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                disabled={loading}
                className="w-full rounded-xl bg-linear-to-r from-primary to-primary-dark py-4 text-lg font-bold text-white shadow-lg hover:scale-[1.02] transition disabled:opacity-70"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
```

- [ ] **Step 4: Clear the new storage keys on logout**

Current `src/components/layout/UserMenu.tsx`:

```tsx
  function logout() {
    localStorage.removeItem("riskq_admin_authenticated");
    router.push("/login");
  }
```

Replace with:

```tsx
  function logout() {
    localStorage.removeItem("riskq_admin_authenticated");
    localStorage.removeItem("riskq_admin_token");
    localStorage.removeItem("riskq_admin_user");
    router.push("/login");
  }
```

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: build succeeds (the `useUsers.ts` type mismatch from Task 3 is still the only pre-existing failure, if any — Task 6 fixes it).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useAuth.ts "src/app/(auth)/login/page.tsx" src/components/layout/UserMenu.tsx
git commit -m "feat: wire admin login to the real auth backend"
```

---

### Task 5: Admin frontend — dashboard route guard

**Repo:** `CordovaRiskQ- Admin/cordova-riskq-admin`

**Depends on:** Task 4

**Files:**
- Modify: `src/components/layout/AdminLayout.tsx`

**Interfaces:**
- Consumes: `useAuth()`'s `authenticated` from `@/hooks/useAuth` (Task 4).

- [ ] **Step 1: Redirect unauthenticated visitors to `/login`**

Current `src/components/layout/AdminLayout.tsx`:

```tsx
"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import { SidebarProvider, useSidebar } from "./SidebarContext";

function AdminLayoutInner({ children }: { children: ReactNode }) {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();
  const isFullscreenMap = collapsed && pathname === "/live-map";

  return (
```

Replace with:

```tsx
"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import { useAuth } from "@/hooks/useAuth";

function AdminLayoutInner({ children }: { children: ReactNode }) {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated } = useAuth();
  const isFullscreenMap = collapsed && pathname === "/live-map";

  useEffect(() => {
    if (!authenticated) {
      router.replace("/login");
    }
  }, [authenticated, router]);

  if (!authenticated) {
    return null;
  }

  return (
```

(The rest of `AdminLayoutInner` and the outer `AdminLayout` export are unchanged.)

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AdminLayout.tsx
git commit -m "feat: redirect unauthenticated visitors away from the dashboard"
```

- [ ] **Step 4: Manual verification**

Start the admin dev server: `npm run dev` (from `C:\Users\Administrator\CORDOVARISKQ\CordovaRiskQ- Admin\cordova-riskq-admin`).

Open a private/incognito browser window (so `localStorage` is empty) and navigate directly to `http://localhost:3000/dashboard/users`.

Expected: immediately redirected to `/login`, no flash of dashboard content.

---

### Task 6: Admin frontend — real `useUsers` (list + role change)

**Repo:** `CordovaRiskQ- Admin/cordova-riskq-admin`

**Depends on:** Task 4 (needs `useAuth`'s `token`)

**Files:**
- Modify: `src/hooks/useUsers.ts`

**Interfaces:**
- Consumes: `apiFetch` from `@/lib/api` (Task 3), `useAuth` from `@/hooks/useAuth` (Task 4), `User`/`UserRole` from `@/types/user` (Task 3).
- Produces: `useUsers()` returns `{ users: User[], loading: boolean, changeRole(id: string, role: "citizen" | "responder"): Promise<void> }`. Task 7's `UserTable` consumes all three.

- [ ] **Step 1: Replace `src/hooks/useUsers.ts`**

Current:

```ts
"use client";

import { useEffect, useState } from "react";
import { User } from "@/types/user";

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUsers([]);
    setLoading(false);
  }, []);

  return {
    users,
    loading,
    setUsers,
  };
}
```

Replace with:

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { User, UserRole } from "@/types/user";

type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  createdAt: string;
};

function toUser(row: AdminUserRow): User {
  return {
    id: row.id,
    name: row.name ?? "",
    email: row.email,
    role: row.role,
    createdAt: row.createdAt,
  };
}

export function useUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    apiFetch<{ success: true; users: AdminUserRow[] }>("/admin/users", { token })
      .then((response) => {
        if (!cancelled) setUsers(response.users.map(toUser));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const changeRole = useCallback(
    async (id: string, role: "citizen" | "responder") => {
      if (!token) return;

      const response = await apiFetch<{ success: true; user: AdminUserRow }>(
        `/admin/users/${id}/role`,
        {
          method: "PATCH",
          body: JSON.stringify({ role }),
          token,
        }
      );

      setUsers((prev) =>
        prev.map((u) => (u.id === id ? toUser(response.user) : u))
      );
    },
    [token]
  );

  return { users, loading, changeRole };
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds. `UserTable.tsx` still renders its own hardcoded two-row array at this point — Task 7 wires it to this hook, so no visible change yet.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useUsers.ts
git commit -m "feat: wire useUsers to the real admin users API"
```

---

### Task 7: Admin frontend — wire `UserTable` to real data

**Repo:** `CordovaRiskQ- Admin/cordova-riskq-admin`

**Depends on:** Task 6

**Files:**
- Modify: `src/components/users/UserTable.tsx`

**Interfaces:**
- Consumes: `useUsers` from `@/hooks/useUsers` (Task 6), `User` from `@/types/user` (Task 3), `Badge`/`Button`/`EmptyState` from `@/components/ui/*` (existing).

- [ ] **Step 1: Replace `src/components/users/UserTable.tsx`**

Current:

```tsx
import Badge from "@/components/ui/Badge";
import Link from "next/link";

const users = [
  {
    id: "USR-001",
    name: "John Doe",
    email: "john@example.com",
    status: "Active",
  },
  {
    id: "USR-002",
    name: "Jane Doe",
    email: "jane@example.com",
    status: "Suspended",
  },
];

export default function UserTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-background">
            <tr>
              <th className="p-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted">User</th>
              <th className="p-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted">Email</th>
              <th className="p-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted">Status</th>
              <th className="p-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-background">
                <td className="p-4 font-medium text-foreground">{user.name}</td>
                <td className="p-4 text-foreground">{user.email}</td>
                <td className="p-4">
                  <Badge
                    variant={
                      user.status === "Active"
                        ? "success"
                        : "danger"
                    }
                  >
                    {user.status}
                  </Badge>
                </td>
                <td className="p-4">
                  <Link
                    href={`/users/${user.id}`}
                    className="font-medium text-primary hover:text-primary-dark"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

Replace with:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useUsers } from "@/hooks/useUsers";
import { User } from "@/types/user";

const ROLE_BADGE_VARIANT: Record<User["role"], "info" | "success" | "default"> = {
  admin: "info",
  responder: "success",
  citizen: "default",
};

export default function UserTable() {
  const { users, loading, changeRole } = useUsers();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleToggleRole(user: User) {
    const nextRole = user.role === "citizen" ? "responder" : "citizen";
    setPendingId(user.id);
    try {
      await changeRole(user.id, nextRole);
    } finally {
      setPendingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-muted shadow-sm">
        Loading users…
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <EmptyState
        title="No users yet"
        description="Registered citizens and responders will appear here."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-background">
            <tr>
              <th className="p-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted">User</th>
              <th className="p-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted">Email</th>
              <th className="p-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted">Role</th>
              <th className="p-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-background">
                <td className="p-4 font-medium text-foreground">{user.name}</td>
                <td className="p-4 text-foreground">{user.email}</td>
                <td className="p-4">
                  <Badge variant={ROLE_BADGE_VARIANT[user.role]}>{user.role}</Badge>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/users/${user.id}`}
                      className="font-medium text-primary hover:text-primary-dark"
                    >
                      View
                    </Link>

                    {user.role !== "admin" && (
                      <Button
                        variant="outline"
                        disabled={pendingId === user.id}
                        onClick={() => handleToggleRole(user)}
                      >
                        {user.role === "citizen" ? "Promote to Responder" : "Revert to Citizen"}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds with no errors anywhere in the repo — this was the last file depending on the old `User`/`useUsers` shapes.

- [ ] **Step 3: Commit**

```bash
git add src/components/users/UserTable.tsx
git commit -m "feat: wire Users table to real data with role promote/revert action"
```

---

### Task 8: Bootstrap the first real admin account, and full end-to-end verification

**Repo:** both

**Depends on:** all prior tasks

**Files:** none (verification only).

- [ ] **Step 1: Promote one real account to `admin`**

With the backend dev server running, register a normal account through the admin login page's absence of a register flow — use curl instead (matching Task 2's pattern), e.g. `admin-live@example.com`.

Connect to the Neon database (the connection string is in the backend's `.env` as `DATABASE_URL` — do not paste it into any file or command history verbatim) and run:

```sql
UPDATE "User" SET role = 'admin' WHERE email = 'admin-live@example.com';
```

- [ ] **Step 2: End-to-end admin role-change flow**

With both dev servers running (`npm run dev` in the backend on port 8000, `npm run dev` in the admin app on port 3000):

1. Register a normal citizen test account via curl (`POST /api/auth/register`), e.g. `citizen-live@example.com`.
2. Open the admin app, try logging in as `citizen-live@example.com`. Confirm the inline error "This account does not have admin access." appears and the page stays on `/login`.
3. Log in as `admin-live@example.com`. Confirm it redirects to `/dashboard`.
4. Navigate to Users. Confirm the real registered accounts appear (not "John Doe" / "Jane Doe"), each with a correct role badge (`citizen` in the default/gray badge).
5. Click "Promote to Responder" on `citizen-live@example.com`'s row. Confirm the badge flips to `responder` (success/green) and the button label flips to "Revert to Citizen", without a page reload.
6. Click "Revert to Citizen". Confirm it flips back.
7. Refresh the page. Confirm the change persisted (re-fetches from the real backend, not stale local state).
8. Open a private/incognito window and navigate directly to `http://localhost:3000/dashboard/users` without logging in. Confirm it redirects to `/login`.

This is the last task — once all steps in Step 2 pass, the plan is complete.
