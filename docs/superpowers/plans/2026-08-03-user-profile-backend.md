# User Profile & Change Password Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mocked User Profile and Change Password screens with real backend-backed behavior: a JWT-verifying auth middleware, three new endpoints (`GET/PUT /api/users/me`, `POST /api/users/change-password`), and the frontend wiring to call them.

**Architecture:** Two repos, worked in sequence. Backend (`CordovaRiskQ-Bacnkend`) first — adds a `mobile` column, an `authenticate` middleware, and a `user.*` route/controller/service layer mirroring the existing `auth.*` layering exactly. Frontend (`CordovaRiskQ-Frontend`, this repo) second — adds bearer-token support to the API helpers, a real `user.service.ts`, an `AuthContext.updateUser` method, and wires the two existing screens to call it all.

**Tech Stack:** Backend: Express 5, Prisma 7 (Postgres), `bcrypt`, `jsonwebtoken`, `zod`. Frontend: Expo Router v6, React Native, `expo-secure-store` (via existing `AuthContext`). No new dependencies in either repo.

**Spec:** `docs/superpowers/specs/2026-08-03-user-profile-backend-design.md`

## Global Constraints

- **Repos:** backend work happens in `C:\Users\kianr\CordovaRiskQ-Bacnkend`; frontend work happens in `C:\Users\kianr\CordovaRiskQ-Frontend` (this repo). Each task states which one.
- **No new dependencies in either repo.** Everything needed (`bcrypt`, `jsonwebtoken`, `zod`, `expo-secure-store`, etc.) is already installed.
- **No automated test suite in either repo.** Verification is `npx tsc --noEmit` (both repos) plus manual curl/app checks — no new test framework gets introduced as part of this plan.
- **Backend error convention:** every thrown error is an `AppError(message, statusCode)`; the existing global `errorHandler` turns it into `{ success: false, message }`. Never hand-roll a different error response shape.
- **Backend layering:** `routes` → `validate` middleware (for bodies) → `controller` (thin, `asyncHandler`-wrapped) → `service` (business logic + Prisma). Follow `auth.*` as the template.
- **Field naming:** the new column/field is `mobile` (not `phone`), matching the frontend's existing "Mobile" label and local state variable.
- **No avatar upload, no email-verification flow, no "set initial password" flow for Google-only accounts.** These are explicitly out of scope per the spec — a Google-only account's change-password attempt should always be rejected with a clear message, not offered a way to set a password.
- **Frontend styling:** no hardcoded colors/spacing/font sizes — use `COLORS`/`SPACING`/`RADIUS`/`TYPOGRAPHY` from `@/theme`.
- Commit after every task.

---

### Task 1: `mobile` column on `User`

**Repo:** `CordovaRiskQ-Bacnkend`

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `User.mobile` — `String?` column. Later tasks' Prisma queries (`prisma.user.findUnique`, `.update`) can read/write it.

- [ ] **Step 1: Add the column**

Current `model User` block in `prisma/schema.prisma`:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String?
  googleId  String?  @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Replace with:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String?
  googleId  String?  @unique
  name      String?
  mobile    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Run the migration**

Run (from `C:\Users\kianr\CordovaRiskQ-Bacnkend`): `npx prisma migrate dev --name add_user_mobile`

Expected: a new folder appears under `prisma/migrations/` containing a `migration.sql` with `ALTER TABLE "User" ADD COLUMN "mobile" TEXT;`, and the command finishes with `Your database is now in sync with your schema.` This also regenerates `src/generated/prisma` (gitignored).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add mobile column to User"
```

---

### Task 2: Auth middleware + `GET /api/users/me`

**Repo:** `CordovaRiskQ-Bacnkend`

**Depends on:** Task 1 (`User.mobile`)

**Files:**
- Create: `src/middlewares/authenticate.middleware.ts`
- Create: `src/services/user.service.ts`
- Create: `src/controllers/user.controller.ts`
- Create: `src/routes/user.routes.ts`
- Modify: `src/routes/index.ts`

**Interfaces:**
- Consumes: `verifyToken` from `@/utils/jwt` (existing, signs/verifies `{ userId: string }`), `AppError` from `@/utils/AppError`, `asyncHandler` from `@/utils/asyncHandler`, `prisma` from `@/lib/prisma`.
- Produces:
  - `authenticate(req, res, next)` and `AuthenticatedRequest` type, both exported from `@/middlewares/authenticate.middleware` — Tasks 3 and 4 import both.
  - `userService.getById(userId: string): Promise<{ id: string; name: string | null; email: string; mobile: string | null }>` — Tasks 3 and 4 add sibling methods to this same object.
  - `userController.getMe` — Tasks 3 and 4 add sibling handlers to this same object.
  - `router` default-exported from `@/routes/user.routes` — Tasks 3 and 4 add routes to this same router.

- [ ] **Step 1: Create `src/middlewares/authenticate.middleware.ts`**

```ts
import { NextFunction, Request, Response } from "express";
import { AppError } from "@/utils/AppError";
import { verifyToken } from "@/utils/jwt";

export interface AuthenticatedRequest extends Request {
    userId?: string;
}

export function authenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return next(new AppError("Missing or invalid Authorization header", 401));
    }

    const token = header.slice("Bearer ".length);

    try {
        const payload = verifyToken(token) as { userId: string };
        req.userId = payload.userId;
        next();
    } catch {
        next(new AppError("Invalid or expired token", 401));
    }
}
```

- [ ] **Step 2: Create `src/services/user.service.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/AppError";

export const userService = {
    async getById(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new AppError("User not found", 404);

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
        };
    },
};
```

- [ ] **Step 3: Create `src/controllers/user.controller.ts`**

```ts
import { Response } from "express";
import { AuthenticatedRequest } from "@/middlewares/authenticate.middleware";
import { userService } from "@/services/user.service";
import { asyncHandler } from "@/utils/asyncHandler";

export const userController = {
    getMe: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await userService.getById(req.userId!);
        res.status(200).json({ success: true, user });
    }),
};
```

- [ ] **Step 4: Create `src/routes/user.routes.ts`**

```ts
import { Router } from "express";
import { userController } from "@/controllers/user.controller";
import { authenticate } from "@/middlewares/authenticate.middleware";

const router = Router();

router.get("/users/me", authenticate, userController.getMe);

export default router;
```

- [ ] **Step 5: Mount the new routes**

Current `src/routes/index.ts`:

```ts
import { Router } from "express";
import testRoutes from "@/routes/test.routes";
import authRoutes from "@/routes/auth.routes";



// Central router — mount all feature route files here.
// As you add new resources, do: router.use(entityRoutes) below.
const router = Router();

router.use(testRoutes);
router.use(authRoutes);

router.use(testRoutes);

export default router;
```

Replace with:

```ts
import { Router } from "express";
import testRoutes from "@/routes/test.routes";
import authRoutes from "@/routes/auth.routes";
import userRoutes from "@/routes/user.routes";

// Central router — mount all feature route files here.
// As you add new resources, do: router.use(entityRoutes) below.
const router = Router();

router.use(testRoutes);
router.use(authRoutes);
router.use(userRoutes);

export default router;
```

(This also drops the pre-existing duplicate `router.use(testRoutes)` line while touching the file.)

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/middlewares/authenticate.middleware.ts src/services/user.service.ts src/controllers/user.controller.ts src/routes/user.routes.ts src/routes/index.ts
git commit -m "feat: add auth middleware and GET /api/users/me"
```

- [ ] **Step 8: Manual verification**

Start the dev server in a separate terminal (from `C:\Users\kianr\CordovaRiskQ-Bacnkend`): `npm run dev`

Register a test user:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"profile-test@example.com","password":"testpass123","name":"Profile Test"}'
```

Expected: `201` with a JSON body containing `token` and `user`. Copy the `token` value.

```bash
TOKEN="<paste the token here>"

curl http://localhost:8000/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

Expected: `200` — `{"success":true,"user":{"id":"...","name":"Profile Test","email":"profile-test@example.com","mobile":null}}`

```bash
curl -i http://localhost:8000/api/users/me
```

Expected: `401` — `{"success":false,"message":"Missing or invalid Authorization header"}`

---

### Task 3: `PUT /api/users/me`

**Repo:** `CordovaRiskQ-Bacnkend`

**Depends on:** Task 2

**Files:**
- Create: `src/validations/user.validation.ts`
- Modify: `src/services/user.service.ts`
- Modify: `src/controllers/user.controller.ts`
- Modify: `src/routes/user.routes.ts`

**Interfaces:**
- Consumes: `AuthenticatedRequest`, `authenticate` (Task 2), `validate` from `@/middlewares/validate.middleware` (existing).
- Produces: `updateProfileSchema` from `@/validations/user.validation` — Task 4 adds a sibling `changePasswordSchema` to this same file. `userService.updateProfile(userId, data): Promise<{id, name, email, mobile}>`.

- [ ] **Step 1: Create `src/validations/user.validation.ts`**

```ts
import { z } from "zod";

export const updateProfileSchema = z.object({
    name: z.string().optional(),
    email: z.string().email("Invalid email address"),
    mobile: z.string().optional(),
});
```

- [ ] **Step 2: Add `updateProfile` to the service**

Current `src/services/user.service.ts` (from Task 2):

```ts
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/AppError";

export const userService = {
    async getById(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new AppError("User not found", 404);

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
        };
    },
};
```

Replace with:

```ts
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/AppError";

export const userService = {
    async getById(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new AppError("User not found", 404);

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
        };
    },

    async updateProfile(
        userId: string,
        data: { name?: string; email: string; mobile?: string }
    ) {
        const existing = await prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existing && existing.id !== userId) {
            throw new AppError("Email already in use", 409);
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                email: data.email,
                mobile: data.mobile,
            },
        });

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
        };
    },
};
```

- [ ] **Step 3: Add `updateProfile` to the controller**

Current `src/controllers/user.controller.ts` (from Task 2):

```ts
import { Response } from "express";
import { AuthenticatedRequest } from "@/middlewares/authenticate.middleware";
import { userService } from "@/services/user.service";
import { asyncHandler } from "@/utils/asyncHandler";

export const userController = {
    getMe: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await userService.getById(req.userId!);
        res.status(200).json({ success: true, user });
    }),
};
```

Replace with:

```ts
import { Response } from "express";
import { AuthenticatedRequest } from "@/middlewares/authenticate.middleware";
import { userService } from "@/services/user.service";
import { asyncHandler } from "@/utils/asyncHandler";

export const userController = {
    getMe: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await userService.getById(req.userId!);
        res.status(200).json({ success: true, user });
    }),

    updateProfile: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await userService.updateProfile(req.userId!, req.body);
        res.status(200).json({ success: true, user });
    }),
};
```

- [ ] **Step 4: Add the route**

Current `src/routes/user.routes.ts` (from Task 2):

```ts
import { Router } from "express";
import { userController } from "@/controllers/user.controller";
import { authenticate } from "@/middlewares/authenticate.middleware";

const router = Router();

router.get("/users/me", authenticate, userController.getMe);

export default router;
```

Replace with:

```ts
import { Router } from "express";
import { userController } from "@/controllers/user.controller";
import { authenticate } from "@/middlewares/authenticate.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { updateProfileSchema } from "@/validations/user.validation";

const router = Router();

router.get("/users/me", authenticate, userController.getMe);
router.put(
    "/users/me",
    authenticate,
    validate(updateProfileSchema),
    userController.updateProfile
);

export default router;
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/validations/user.validation.ts src/services/user.service.ts src/controllers/user.controller.ts src/routes/user.routes.ts
git commit -m "feat: add PUT /api/users/me"
```

- [ ] **Step 7: Manual verification**

With the dev server still running and `$TOKEN` from Task 2's verification still valid:

```bash
curl -X PUT http://localhost:8000/api/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Profile Test Updated","email":"profile-test@example.com","mobile":"+63 917 555 0142"}'
```

Expected: `200` — `{"success":true,"user":{"id":"...","name":"Profile Test Updated","email":"profile-test@example.com","mobile":"+63 917 555 0142"}}`

Register a second user to trigger the email-conflict case:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"profile-test-2@example.com","password":"testpass123","name":"Second User"}'

curl -i -X PUT http://localhost:8000/api/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"email":"profile-test-2@example.com"}'
```

Expected: `409` — `{"success":false,"message":"Email already in use"}`

---

### Task 4: `POST /api/users/change-password`

**Repo:** `CordovaRiskQ-Bacnkend`

**Depends on:** Task 3

**Files:**
- Modify: `src/validations/user.validation.ts`
- Modify: `src/services/user.service.ts`
- Modify: `src/controllers/user.controller.ts`
- Modify: `src/routes/user.routes.ts`

**Interfaces:**
- Produces: `changePasswordSchema` from `@/validations/user.validation`. `userService.changePassword(userId, data): Promise<void>`.

- [ ] **Step 1: Add `changePasswordSchema`**

Current `src/validations/user.validation.ts` (from Task 3):

```ts
import { z } from "zod";

export const updateProfileSchema = z.object({
    name: z.string().optional(),
    email: z.string().email("Invalid email address"),
    mobile: z.string().optional(),
});
```

Replace with:

```ts
import { z } from "zod";

export const updateProfileSchema = z.object({
    name: z.string().optional(),
    email: z.string().email("Invalid email address"),
    mobile: z.string().optional(),
});

export const changePasswordSchema = z.object({
    oldPassword: z.string().min(1, "Old password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
});
```

- [ ] **Step 2: Add `changePassword` to the service**

Current `src/services/user.service.ts` (from Task 3) — add `bcrypt` import and the new method. Replace the whole file with:

```ts
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/AppError";

export const userService = {
    async getById(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new AppError("User not found", 404);

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
        };
    },

    async updateProfile(
        userId: string,
        data: { name?: string; email: string; mobile?: string }
    ) {
        const existing = await prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existing && existing.id !== userId) {
            throw new AppError("Email already in use", 409);
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                email: data.email,
                mobile: data.mobile,
            },
        });

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
        };
    },

    async changePassword(
        userId: string,
        data: { oldPassword: string; newPassword: string }
    ) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new AppError("User not found", 404);

        if (!user.password) {
            throw new AppError(
                "This account uses Google Sign-In and has no password to change.",
                401
            );
        }

        const isMatch = await bcrypt.compare(data.oldPassword, user.password);
        if (!isMatch) throw new AppError("Old password is incorrect", 401);

        const hashedPassword = await bcrypt.hash(data.newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
    },
};
```

- [ ] **Step 3: Add `changePassword` to the controller**

Current `src/controllers/user.controller.ts` (from Task 3):

```ts
import { Response } from "express";
import { AuthenticatedRequest } from "@/middlewares/authenticate.middleware";
import { userService } from "@/services/user.service";
import { asyncHandler } from "@/utils/asyncHandler";

export const userController = {
    getMe: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await userService.getById(req.userId!);
        res.status(200).json({ success: true, user });
    }),

    updateProfile: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await userService.updateProfile(req.userId!, req.body);
        res.status(200).json({ success: true, user });
    }),
};
```

Replace with:

```ts
import { Response } from "express";
import { AuthenticatedRequest } from "@/middlewares/authenticate.middleware";
import { userService } from "@/services/user.service";
import { asyncHandler } from "@/utils/asyncHandler";

export const userController = {
    getMe: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await userService.getById(req.userId!);
        res.status(200).json({ success: true, user });
    }),

    updateProfile: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await userService.updateProfile(req.userId!, req.body);
        res.status(200).json({ success: true, user });
    }),

    changePassword: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await userService.changePassword(req.userId!, req.body);
        res.status(200).json({ success: true });
    }),
};
```

- [ ] **Step 4: Add the route**

Current `src/routes/user.routes.ts` (from Task 3):

```ts
import { Router } from "express";
import { userController } from "@/controllers/user.controller";
import { authenticate } from "@/middlewares/authenticate.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { updateProfileSchema } from "@/validations/user.validation";

const router = Router();

router.get("/users/me", authenticate, userController.getMe);
router.put(
    "/users/me",
    authenticate,
    validate(updateProfileSchema),
    userController.updateProfile
);

export default router;
```

Replace with:

```ts
import { Router } from "express";
import { userController } from "@/controllers/user.controller";
import { authenticate } from "@/middlewares/authenticate.middleware";
import { validate } from "@/middlewares/validate.middleware";
import {
    updateProfileSchema,
    changePasswordSchema,
} from "@/validations/user.validation";

const router = Router();

router.get("/users/me", authenticate, userController.getMe);
router.put(
    "/users/me",
    authenticate,
    validate(updateProfileSchema),
    userController.updateProfile
);
router.post(
    "/users/change-password",
    authenticate,
    validate(changePasswordSchema),
    userController.changePassword
);

export default router;
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/validations/user.validation.ts src/services/user.service.ts src/controllers/user.controller.ts src/routes/user.routes.ts
git commit -m "feat: add POST /api/users/change-password"
```

- [ ] **Step 7: Manual verification**

With the dev server still running and `$TOKEN` from Task 2/3's verification still valid (that account's current password is `testpass123`):

```bash
curl -X POST http://localhost:8000/api/users/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"oldPassword":"testpass123","newPassword":"newpass456"}'
```

Expected: `200` — `{"success":true}`

Confirm it actually took effect:

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"profile-test@example.com","password":"newpass456"}'
```

Expected: `200` with a fresh token.

Wrong old password:

```bash
curl -i -X POST http://localhost:8000/api/users/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"oldPassword":"wrongpassword","newPassword":"anotherpass789"}'
```

Expected: `401` — `{"success":false,"message":"Old password is incorrect"}`

Google-only account rejection — this needs a user row with `password` null and no way to log in normally, so mint its token directly:

1. Run `npx prisma studio` (from `C:\Users\kianr\CordovaRiskQ-Bacnkend`), open the `User` table in the browser tab it opens, and add a row: `email` = `google-test@example.com`, `name` = `Google Test`, `googleId` = `manual-test-google-id`, leave `password` empty. Save, then copy the generated `id`.
2. Mint a token for that id (reads `JWT_SECRET` out of the local `.env`, never printed):

```bash
export JWT_SECRET=$(grep '^JWT_SECRET=' .env | cut -d '=' -f2-)
node -e "console.log(require('jsonwebtoken').sign({userId:'<paste the id from step 1>'}, process.env.JWT_SECRET, {expiresIn:'1h'}))"
```

3. Use the printed token:

```bash
curl -i -X POST http://localhost:8000/api/users/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <paste the printed token>" \
  -d '{"oldPassword":"anything","newPassword":"newpass456"}'
```

Expected: `401` — `{"success":false,"message":"This account uses Google Sign-In and has no password to change."}`

---

### Task 5: `apiPut` + bearer-token support in `services/api.ts`

**Repo:** `CordovaRiskQ-Frontend` (this repo)

**Files:**
- Modify: `services/api.ts`

**Interfaces:**
- Produces: `apiGet<T>(path, token?)`, `apiPost<T>(path, body, token?)`, `apiPut<T>(path, body, token?)` — all exported from `@/services/api`. Task 7 imports and calls all three.

- [ ] **Step 1: Replace the file**

Current `services/api.ts`:

```ts
import Constants from "expo-constants";

function resolveApiBaseUrl(): string {
  // Expo Go / dev client exposes the packager's host (your PC's LAN IP) here.
  // This keeps working automatically even if your PC's IP changes, as long
  // as you're running via `expo start` and testing on the same network.
  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (debuggerHost) {
    const host = debuggerHost.split(":")[0];
    return `http://${host}:8000`;
  }

  // Fallback for web builds or production, where this detection doesn't apply.
  return "http://localhost:8000";
}

export const API_BASE_URL = resolveApiBaseUrl();

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`GET ${path} failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `POST ${path} failed with status ${response.status}: ${errorText}`,
    );
  }

  return response.json() as Promise<T>;
}
```

Replace with:

```ts
import Constants from "expo-constants";

function resolveApiBaseUrl(): string {
  // Expo Go / dev client exposes the packager's host (your PC's LAN IP) here.
  // This keeps working automatically even if your PC's IP changes, as long
  // as you're running via `expo start` and testing on the same network.
  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (debuggerHost) {
    const host = debuggerHost.split(":")[0];
    return `http://${host}:8000`;
  }

  // Fallback for web builds or production, where this detection doesn't apply.
  return "http://localhost:8000";
}

export const API_BASE_URL = resolveApiBaseUrl();

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

export async function apiPut<T>(
  path: string,
  body: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json() as Promise<T>;
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint services`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add services/api.ts
git commit -m "feat: add apiPut and bearer-token support to api.ts"
```

---

### Task 6: `updateUser` on `AuthContext`

**Repo:** `CordovaRiskQ-Frontend` (this repo)

**Files:**
- Modify: `context/AuthContext.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `updateUser: (user: AuthUser) => Promise<void>` on the value returned by `useAuth()`. Task 8 calls it after a successful profile save.

- [ ] **Step 1: Replace the file**

Current `context/AuthContext.tsx`:

```tsx
import * as SecureStore from "expo-secure-store";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app start, try to restore a previously saved session.
  useEffect(() => {
    async function loadSession() {
      try {
        const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const savedUser = await SecureStore.getItemAsync(USER_KEY);

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: token !== null,
      isLoading,
      token,
      user,
      login: async (newToken: string, newUser: AuthUser) => {
        await SecureStore.setItemAsync(TOKEN_KEY, newToken);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
      },
      logout: async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
        setToken(null);
        setUser(null);
      },
    }),
    [token, user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
```

Replace with:

```tsx
import * as SecureStore from "expo-secure-store";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app start, try to restore a previously saved session.
  useEffect(() => {
    async function loadSession() {
      try {
        const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const savedUser = await SecureStore.getItemAsync(USER_KEY);

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: token !== null,
      isLoading,
      token,
      user,
      login: async (newToken: string, newUser: AuthUser) => {
        await SecureStore.setItemAsync(TOKEN_KEY, newToken);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
      },
      logout: async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
        setToken(null);
        setUser(null);
      },
      updateUser: async (newUser: AuthUser) => {
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser));
        setUser(newUser);
      },
    }),
    [token, user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint context`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add context/AuthContext.tsx
git commit -m "feat: add updateUser to AuthContext"
```

---

### Task 7: Real `services/user.service.ts`

**Repo:** `CordovaRiskQ-Frontend` (this repo)

**Depends on:** Task 5 (`apiGet`/`apiPost`/`apiPut` with `token?`)

**Files:**
- Modify: `services/user.service.ts`

**Interfaces:**
- Consumes: `apiGet`, `apiPost`, `apiPut` from `@/services/api` (Task 5).
- Produces:
  - `UserProfile` type: `{ id: string; name: string | null; email: string; mobile: string | null }`
  - `getProfile(token: string): Promise<UserProfile>`
  - `updateProfile(token: string, payload: { name?: string; email: string; mobile?: string }): Promise<UserProfile>`
  - `changePassword(token: string, payload: { oldPassword: string; newPassword: string }): Promise<void>`

  All exported from `@/services/user.service`. Tasks 8 and 9 import these.

- [ ] **Step 1: Replace the file**

Current `services/user.service.ts`:

```ts
export async function getProfile() {
  return { name: "Guest", email: "guest@example.com" };
}
```

Replace with:

```ts
import { apiGet, apiPost, apiPut } from "./api";

export type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  mobile: string | null;
};

export async function getProfile(token: string): Promise<UserProfile> {
  const response = await apiGet<{ success: true; user: UserProfile }>(
    "/api/users/me",
    token,
  );
  return response.user;
}

export async function updateProfile(
  token: string,
  payload: { name?: string; email: string; mobile?: string },
): Promise<UserProfile> {
  const response = await apiPut<{ success: true; user: UserProfile }>(
    "/api/users/me",
    payload,
    token,
  );
  return response.user;
}

export async function changePassword(
  token: string,
  payload: { oldPassword: string; newPassword: string },
): Promise<void> {
  await apiPost<{ success: true }>(
    "/api/users/change-password",
    payload,
    token,
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint services`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add services/user.service.ts
git commit -m "feat: wire user.service.ts to real backend endpoints"
```

---

### Task 8: Wire `app/user-profile/index.tsx`

**Repo:** `CordovaRiskQ-Frontend` (this repo)

**Depends on:** Task 6 (`updateUser`), Task 7 (`getProfile`/`updateProfile`), backend Tasks 2–3 running locally

**Files:**
- Modify: `app/user-profile/index.tsx`

**Interfaces:**
- Consumes: `useAuth()` → now also `token: string | null`, `updateUser: (user) => Promise<void>` (Task 6). `getProfile`, `updateProfile` from `@/services/user.service` (Task 7).
- Produces: the default-exported `UserProfileScreen` — no props (it's a route).

- [ ] **Step 1: Replace the file**

Current `app/user-profile/index.tsx`:

```tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import ProfileAvatarEdit from "@/components/user-profile/ProfileAvatarEdit";
import ProfileFieldInput from "@/components/user-profile/ProfileFieldInput";
import { useAuth } from "@/context/AuthContext";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

const MOCK_MOBILE = "+63 917 555 0142";

function splitName(name: string | undefined): {
  firstName: string;
  lastName: string;
} {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  const [first, ...rest] = parts;
  return { firstName: first, lastName: rest.join(" ") };
}

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const initial = splitName(user?.name);

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(user?.email ?? "");
  const [mobile, setMobile] = useState(MOCK_MOBILE);

  function handleSave() {
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={styles.backButton} />
        <Text style={styles.headerTitle}>User Profile</Text>
      </View>

      <ProfileAvatarEdit />

      <View style={styles.fields}>
        <ProfileFieldInput
          label="First Name"
          value={firstName}
          onChangeText={setFirstName}
        />
        <ProfileFieldInput
          label="Last Name"
          value={lastName}
          onChangeText={setLastName}
        />
        <ProfileFieldInput
          label="E-Mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <ProfileFieldInput
          label="Mobile"
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
        />
      </View>

      <PrimaryButton title="SAVE" onPress={handleSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    left: 0,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: "800",
    color: COLORS.text,
  },
  fields: {
    gap: SPACING.md,
  },
});
```

Replace with:

```tsx
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import ProfileAvatarEdit from "@/components/user-profile/ProfileAvatarEdit";
import ProfileFieldInput from "@/components/user-profile/ProfileFieldInput";
import { useAuth } from "@/context/AuthContext";
import { getProfile, updateProfile } from "@/services/user.service";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

function splitName(name: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  const [first, ...rest] = parts;
  return { firstName: first, lastName: rest.join(" ") };
}

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, updateUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  useEffect(() => {
    if (!token) return;

    getProfile(token)
      .then((profile) => {
        const split = splitName(profile.name);
        setFirstName(split.firstName);
        setLastName(split.lastName);
        setEmail(profile.email);
        setMobile(profile.mobile ?? "");
      })
      .catch((err) => {
        Alert.alert(
          "Couldn't load profile",
          err instanceof Error ? err.message : "Please try again.",
        );
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  async function handleSave() {
    if (!token) return;

    setIsSaving(true);
    try {
      const name = `${firstName} ${lastName}`.trim();
      const profile = await updateProfile(token, { name, email, mobile });
      await updateUser({
        id: profile.id,
        name: profile.name ?? "",
        email: profile.email,
      });
      router.back();
    } catch (err) {
      Alert.alert(
        "Update failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={styles.backButton} />
        <Text style={styles.headerTitle}>User Profile</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loading} />
      ) : (
        <>
          <ProfileAvatarEdit />

          <View style={styles.fields}>
            <ProfileFieldInput
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
            />
            <ProfileFieldInput
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
            />
            <ProfileFieldInput
              label="E-Mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <ProfileFieldInput
              label="Mobile"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
            />
          </View>

          <PrimaryButton title="SAVE" onPress={handleSave} disabled={isSaving} />
        </>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    left: 0,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: "800",
    color: COLORS.text,
  },
  fields: {
    gap: SPACING.md,
  },
  loading: {
    marginTop: SPACING.xl,
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint app`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/user-profile/index.tsx
git commit -m "feat: wire User Profile screen to real backend"
```

- [ ] **Step 4: Manual verification**

With the backend dev server running (`npm run dev` from `C:\Users\kianr\CordovaRiskQ-Bacnkend`) and the frontend running (`npx expo start`, from this repo):

1. Log in as a real user (e.g. the `profile-test@example.com` account from the backend's manual verification, using whatever its current password is at this point — check back through Tasks 2–4's verification steps for the latest one).
2. Navigate to Profile → "User Profile". Confirm a brief loading spinner appears, then First Name/Last Name/E-Mail/Mobile populate from the backend (not a mock).
3. Edit all four fields and tap "Save". Confirm it returns to the Profile screen and the header name updates immediately (no re-login needed).
4. Re-open "User Profile". Confirm the edited values persisted (fetched fresh from the backend).
5. Force-close and reopen the app. Confirm the session and updated name/email are still there (SecureStore).
6. Stop the backend dev server, then try editing and saving again. Confirm an `Alert` appears with an error message instead of the app silently navigating back.

---

### Task 9: Wire `app/change-password/index.tsx`

**Repo:** `CordovaRiskQ-Frontend` (this repo)

**Depends on:** Task 7 (`changePassword`), backend Task 4 running locally

**Files:**
- Modify: `app/change-password/index.tsx`

**Interfaces:**
- Consumes: `useAuth()` → `token: string | null`. `changePassword` from `@/services/user.service` (Task 7).
- Produces: the default-exported `ChangePasswordScreen` — no props (it's a route).

- [ ] **Step 1: Replace the file**

Current `app/change-password/index.tsx`:

```tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import PasswordSheet from "@/components/change-password/PasswordSheet";
import ProfileFieldInput from "@/components/user-profile/ProfileFieldInput";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const canSave =
    oldPassword.length > 0 &&
    newPassword.length > 0 &&
    newPassword === confirmPassword;

  function handleClose() {
    router.back();
  }

  function handleSave() {
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PasswordSheet onClose={handleClose}>
        <Text style={styles.title}>Change Password</Text>
        <ProfileFieldInput
          value={oldPassword}
          onChangeText={setOldPassword}
          placeholder="Old Password"
          secureTextEntry
        />
        <ProfileFieldInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New Password"
          secureTextEntry
        />
        <ProfileFieldInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm Password"
          secureTextEntry
        />
        <PrimaryButton title="SAVE" onPress={handleSave} disabled={!canSave} />
      </PasswordSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: "800",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
});
```

Replace with:

```tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
} from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import PasswordSheet from "@/components/change-password/PasswordSheet";
import ProfileFieldInput from "@/components/user-profile/ProfileFieldInput";
import { useAuth } from "@/context/AuthContext";
import { changePassword } from "@/services/user.service";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canSave =
    oldPassword.length > 0 &&
    newPassword.length > 0 &&
    newPassword === confirmPassword &&
    !isSaving;

  function handleClose() {
    router.back();
  }

  async function handleSave() {
    if (!token) return;

    setIsSaving(true);
    try {
      await changePassword(token, { oldPassword, newPassword });
      router.back();
    } catch (err) {
      Alert.alert(
        "Change password failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PasswordSheet onClose={handleClose}>
        <Text style={styles.title}>Change Password</Text>
        <ProfileFieldInput
          value={oldPassword}
          onChangeText={setOldPassword}
          placeholder="Old Password"
          secureTextEntry
        />
        <ProfileFieldInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New Password"
          secureTextEntry
        />
        <ProfileFieldInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm Password"
          secureTextEntry
        />
        <PrimaryButton title="SAVE" onPress={handleSave} disabled={!canSave} />
      </PasswordSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: "800",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint app`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/change-password/index.tsx
git commit -m "feat: wire Change Password screen to real backend"
```

- [ ] **Step 4: Manual verification**

With both dev servers running and logged in as a real user (e.g. `profile-test@example.com`):

1. Navigate to Profile → "Change Password". Enter the account's real current password as "Old Password", a new password (6+ characters) as both "New Password" and "Confirm Password". Tap "Save".
2. Confirm it returns to the Profile screen.
3. Log out and log back in with the new password to confirm it actually changed.
4. Try again with an intentionally wrong "Old Password". Confirm an `Alert` shows an error and the screen stays open (fields keep their values).
5. If you created the Google-only test account during Task 4's verification, log in as it (you'll need to mint another token the same way, or simply confirm via curl again) and confirm the same rejection message applies — this step can be a curl re-check rather than through the app if that account has no way to authenticate through the UI.

This is the last task — once it passes, the plan is complete.
