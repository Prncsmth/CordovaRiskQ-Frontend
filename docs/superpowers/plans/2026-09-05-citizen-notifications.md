# Citizen Notification Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile Home screen's hardcoded notification mock with a real per-citizen inbox: a new backend `Notification` model fed by three existing events (announcement publish, incident status change, tide/weather risk escalation), delivered both as an in-app list and as real Expo push notifications.

**Architecture:** Backend gains a `Notification` table (one row per recipient) plus three citizen-authenticated endpoints (list, mark-one-read, mark-all-read) and a push-token registration endpoint. Three existing backend services (`announcementService.create`, `incidentService.accept`/`updateStatus`, `tideService.refreshTideStatus`) each gain a call into a new `notificationService.createForUsers(...)`, which persists rows and sends a batched Expo push to whichever recipients have a registered device token. The mobile app registers for push after login and rewrites its notification service/screen against the real endpoints.

**Tech Stack:** Backend: Express 5, Prisma/Postgres, Zod, TypeScript (ESM, `@/` path aliases), Node's built-in `fetch` for the Expo push API. Mobile: Expo Router, React Native, `expo-notifications`/`expo-device` (new), existing `services/api.ts` (`apiGet`/`apiPatch`) helper.

**Spec:** `docs/superpowers/specs/2026-09-05-citizen-notifications-design.md`

## Global Constraints

- This is the **citizen mobile inbox only**. The admin repo's separate, unrelated mocked ops-feed notifications (`cordova-riskq-admin/src/lib/mockNotifications.ts`) are untouched by every task below.
- `Notification` is fan-out (one row per recipient), not one row per event — `read: Boolean` lives directly on the row, no join table.
- Push is sent to **"All Users" announcements only** — "Specific Barangay" and "Responders Only" never create a `Notification` row or a push, because there's no stored per-user barangay to target server-side (barangay matching for the Home banner stays exactly as-is, live GPS-matched).
- Incident status notifies on **every** transition (`lobby`, `on_the_way`, `arrived`, `completed`, `cancelled`) to the report's `reporterId` only.
- Tide/weather risk notifies **only on escalation** (severity strictly increases: `normal(0) < watch(1) < warning(2)`), and never on the very first poll (no prior `existing` row to compare against). De-escalation is silent.
- `GET /api/notifications` caps results at the 50 most recent rows per user; nothing is ever deleted server-side.
- `User.pushToken` is a single nullable field — logging in on a second device overwrites it. No multi-device support.
- Push failures never throw — the persisted `Notification` rows are the source of truth; a failed or partial Expo push send is caught and logged, not surfaced as an error.
- None of the two repos in this chain has an automated test framework (confirmed: no `jest`/`vitest`/`mocha` dependency, no `*.test.ts(x)`/`*.spec.ts(x)` file in either). Every task is verified via `tsc --noEmit` / `eslint` plus a concrete runtime check (curl or running the app) — there is no "write a failing test" step in this plan.

---

## File Structure

**Backend (`C:\Users\kianr\CordovaRiskQ-Bacnkend`):**
- `prisma/schema.prisma` — modified: add `Notification` model, `User.pushToken` field + `User.notifications` back-relation.
- `src/services/notification.service.ts` — new: `listForUser`, `markRead`, `markAllRead`, `createForUsers`.
- `src/controllers/notification.controller.ts` — new: thin HTTP handlers.
- `src/routes/notification.routes.ts` — new: route registration.
- `src/routes/index.ts` — modified: mount the new route.
- `src/validations/user.validation.ts` — modified: add `updatePushTokenSchema`.
- `src/services/user.service.ts` — modified: add `updatePushToken`.
- `src/controllers/user.controller.ts` — modified: add `updatePushToken` handler.
- `src/routes/user.routes.ts` — modified: mount the push-token route.
- `src/services/announcement.service.ts` — modified: fan out a notification after creating an "All Users" announcement.
- `src/services/incident.service.ts` — modified: fan out a notification after every status transition.
- `src/services/tide.service.ts` — modified: fan out a notification when flood risk escalates.

**Mobile (`C:\Users\kianr\CordovaRiskQ-Frontend`, this repo):**
- `services/push.service.ts` — new: `registerForPushNotifications(token)`.
- `app/_layout.tsx` — modified: call push registration once authenticated.
- `services/notification.service.ts` — modified: real types + `getNotifications(token)`/`markAllNotificationsRead(token)` against the real endpoints.
- `utils/formatter.ts` — modified: add `formatRelativeTime`.
- `app/notifications/index.tsx` — modified: real `createdAt`/`read`-driven list.
- `app/(tabs)/home.tsx` — modified: `hasUnread` from real `read` state.

---

### Task 1: Backend — `Notification` model + `User.pushToken` + migration

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Bacnkend\prisma\schema.prisma`

**Interfaces:**
- Produces: `prisma.notification` model with fields `id: String`, `userId: String`, `type: String`, `title: String`, `body: String`, `read: Boolean`, `createdAt: DateTime`; `User.pushToken: String | null`. Consumed by Task 2 (`notification.service.ts`) and Task 4 (`user.service.ts`'s `updatePushToken`) via the generated Prisma client.

- [ ] **Step 1: Add `pushToken` and the `notifications` back-relation to `User`**

In `prisma/schema.prisma`, in the existing `User` model:

```prisma
model User {
  id                 String     @id @default(uuid())
  email              String     @unique
  password           String?
  googleId           String?    @unique
  name               String?
  mobile             String?
  role               String     @default("citizen")
  pushToken          String?
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt
  sosAlerts          SosAlert[]
  reportedIncidents  Incident[] @relation("ReportedIncidents")
  acceptedIncidents  Incident[] @relation("AcceptedIncidents")
  announcements      Announcement[]
  notifications      Notification[]
}
```

- [ ] **Step 2: Add the `Notification` model**

Append after the existing `Announcement` model:

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

- [ ] **Step 3: Run the migration**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npm run db:migrate -- --name add_notification
```

Expected: Prisma prints a new migration file under `prisma/migrations/`, applies it, regenerates the client, and ends with `Your database is now in sync with your schema.`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Notification model and User.pushToken"
```

---

### Task 2: Backend — notification service

**Files:**
- Create: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\services\notification.service.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma` (existing); `AppError` from `@/utils/AppError` (existing); `Notification`/`User` Prisma models (Task 1).
- Produces: `export const notificationService = { listForUser, markRead, markAllRead, createForUsers }` where:
  - `listForUser(userId: string): Promise<Notification[]>` — consumed by Task 3's controller.
  - `markRead(id: string, userId: string): Promise<void>` — throws `AppError(404, "Notification not found")` if the id doesn't exist or belongs to another user. Consumed by Task 3's controller.
  - `markAllRead(userId: string): Promise<void>` — consumed by Task 3's controller.
  - `createForUsers(userIds: string[], data: { type: string; title: string; body: string }): Promise<void>` — consumed by Task 5, Task 6, and Task 7's trigger wiring.

- [ ] **Step 1: Write the service**

```ts
// src/services/notification.service.ts
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/AppError";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type ExpoPushTicket = {
    status: "ok" | "error";
    details?: { error?: string };
};

async function sendPushToRecipients(
    recipients: { id: string; pushToken: string | null }[],
    data: { title: string; body: string }
) {
    const targets = recipients.filter(
        (r): r is { id: string; pushToken: string } => r.pushToken !== null
    );
    if (targets.length === 0) return;

    try {
        const response = await fetch(EXPO_PUSH_URL, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify(
                targets.map((t) => ({ to: t.pushToken, title: data.title, body: data.body }))
            ),
        });

        const result = (await response.json()) as { data?: ExpoPushTicket[] };
        if (!Array.isArray(result.data)) return;

        const staleUserIds = targets
            .filter((_, i) => result.data![i]?.details?.error === "DeviceNotRegistered")
            .map((t) => t.id);

        if (staleUserIds.length > 0) {
            await prisma.user.updateMany({
                where: { id: { in: staleUserIds } },
                data: { pushToken: null },
            });
        }
    } catch (error) {
        console.error("Push notification send failed:", error);
    }
}

export const notificationService = {
    async listForUser(userId: string) {
        return prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
    },

    async markRead(id: string, userId: string) {
        const existing = await prisma.notification.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
            throw new AppError("Notification not found", 404);
        }
        await prisma.notification.update({ where: { id }, data: { read: true } });
    },

    async markAllRead(userId: string) {
        await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
    },

    async createForUsers(
        userIds: string[],
        data: { type: string; title: string; body: string }
    ) {
        if (userIds.length === 0) return;

        await prisma.notification.createMany({
            data: userIds.map((userId) => ({ userId, ...data })),
        });

        const recipients = await prisma.user.findMany({
            where: { id: { in: userIds }, pushToken: { not: null } },
            select: { id: true, pushToken: true },
        });

        await sendPushToRecipients(recipients, { title: data.title, body: data.body });
    },
};
```

- [ ] **Step 2: Typecheck**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/notification.service.ts
git commit -m "feat: add notification service"
```

---

### Task 3: Backend — notification endpoints

**Files:**
- Create: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\controllers\notification.controller.ts`
- Create: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\routes\notification.routes.ts`
- Modify: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\routes\index.ts`

**Interfaces:**
- Consumes: `notificationService` (Task 2); `authenticate`/`AuthenticatedRequest` from `@/middlewares/authenticate.middleware` (existing); `asyncHandler` (existing).
- Produces:
  - `GET /api/notifications` → `200 { success: true, notifications: [...] }`. Consumed by Task 10's mobile service.
  - `PATCH /api/notifications/:id/read` → `200 { success: true }`, or `404` if the id doesn't belong to the caller.
  - `PATCH /api/notifications/read-all` → `200 { success: true }`. Consumed by Task 10's mobile service.

- [ ] **Step 1: Write the controller**

```ts
// src/controllers/notification.controller.ts
import { Response } from "express";
import { AuthenticatedRequest } from "@/middlewares/authenticate.middleware";
import { notificationService } from "@/services/notification.service";
import { asyncHandler } from "@/utils/asyncHandler";

export const notificationController = {
    list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const notifications = await notificationService.listForUser(req.userId!);
        res.status(200).json({ success: true, notifications });
    }),

    markRead: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await notificationService.markRead(req.params.id as string, req.userId!);
        res.status(200).json({ success: true });
    }),

    markAllRead: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await notificationService.markAllRead(req.userId!);
        res.status(200).json({ success: true });
    }),
};
```

- [ ] **Step 2: Write the routes**

```ts
// src/routes/notification.routes.ts
import { Router } from "express";
import { notificationController } from "@/controllers/notification.controller";
import { authenticate } from "@/middlewares/authenticate.middleware";

const router = Router();

router.get("/notifications", authenticate, notificationController.list);
router.patch("/notifications/:id/read", authenticate, notificationController.markRead);
router.patch("/notifications/read-all", authenticate, notificationController.markAllRead);

export default router;
```

- [ ] **Step 3: Mount it**

In `src/routes/index.ts`, add the import and mount call:

```ts
import { Router } from "express";
import testRoutes from "@/routes/test.routes";
import authRoutes from "@/routes/auth.routes";
import userRoutes from "@/routes/user.routes";
import sosRoutes from "@/routes/sos.routes";
import incidentRoutes from "@/routes/incident.routes";
import adminRoutes from "@/routes/admin.routes";
import adminAuthRoutes from "@/routes/admin-auth.routes";
import tideRoutes from "@/routes/tide.routes";
import announcementRoutes from "@/routes/announcement.routes";
import notificationRoutes from "@/routes/notification.routes";

// Central router — mount all feature route files here.
// As you add new resources, do: router.use(entityRoutes) below.
const router = Router();

router.use(testRoutes);
router.use(authRoutes);
router.use(userRoutes);
router.use(sosRoutes);
router.use(incidentRoutes);
router.use(adminRoutes);
router.use(adminAuthRoutes);
router.use(tideRoutes);
router.use(announcementRoutes);
router.use(notificationRoutes);

export default router;
```

- [ ] **Step 4: Typecheck**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 5: Run and verify with curl**

```bash
npm run dev
```

In another terminal, get a citizen bearer token (log in via the existing `POST /api/auth/login`), then:

```bash
curl http://localhost:8000/api/notifications -H "Authorization: Bearer <TOKEN>"
```

Expected: `200 { "success": true, "notifications": [] }` (none created yet — Tasks 5–7 wire the triggers that create rows).

```bash
curl -X PATCH http://localhost:8000/api/notifications/read-all -H "Authorization: Bearer <TOKEN>"
```

Expected: `200 { "success": true }`.

```bash
curl -X PATCH http://localhost:8000/api/notifications/00000000-0000-0000-0000-000000000000/read -H "Authorization: Bearer <TOKEN>"
```

Expected: `404` (no such notification).

- [ ] **Step 6: Commit**

```bash
git add src/controllers/notification.controller.ts src/routes/notification.routes.ts src/routes/index.ts
git commit -m "feat: add notification endpoints"
```

---

### Task 4: Backend — push-token registration endpoint

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\validations\user.validation.ts`
- Modify: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\services\user.service.ts`
- Modify: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\controllers\user.controller.ts`
- Modify: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\routes\user.routes.ts`

**Interfaces:**
- Produces: `PATCH /api/users/push-token` (body `{ token: string }`) → `200 { success: true }`, or `400` on a missing/empty token. Consumed by Task 8's mobile `push.service.ts`.

- [ ] **Step 1: Add the validation schema**

In `src/validations/user.validation.ts`, add:

```ts
export const updatePushTokenSchema = z.object({
    token: z.string().min(1, "Push token is required"),
});
```

- [ ] **Step 2: Add the service method**

In `src/services/user.service.ts`, add this method inside the `userService` object (after `changePassword`):

```ts
    async updatePushToken(userId: string, token: string) {
        await prisma.user.update({
            where: { id: userId },
            data: { pushToken: token },
        });
    },
```

- [ ] **Step 3: Add the controller handler**

In `src/controllers/user.controller.ts`, add this handler inside the `userController` object:

```ts
    updatePushToken: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await userService.updatePushToken(req.userId!, req.body.token);
        res.status(200).json({ success: true });
    }),
```

- [ ] **Step 4: Mount the route**

In `src/routes/user.routes.ts`, update the imports and add the route:

```ts
import { Router } from "express";
import { userController } from "@/controllers/user.controller";
import { authenticate } from "@/middlewares/authenticate.middleware";
import { validate } from "@/middlewares/validate.middleware";
import {
    updateProfileSchema,
    changePasswordSchema,
    updatePushTokenSchema,
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
router.patch(
    "/users/push-token",
    authenticate,
    validate(updatePushTokenSchema),
    userController.updatePushToken
);

export default router;
```

- [ ] **Step 5: Typecheck**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 6: Run and verify with curl**

```bash
curl -X PATCH http://localhost:8000/api/users/push-token \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"token":"ExponentPushToken[test123]"}'
```

Expected: `200 { "success": true }`.

```bash
curl -X PATCH http://localhost:8000/api/users/push-token \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"token":""}'
```

Expected: `400` (empty token rejected).

- [ ] **Step 7: Commit**

```bash
git add src/validations/user.validation.ts src/services/user.service.ts src/controllers/user.controller.ts src/routes/user.routes.ts
git commit -m "feat: add push-token registration endpoint"
```

---

### Task 5: Backend — wire announcement publish trigger

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\services\announcement.service.ts`

**Interfaces:**
- Consumes: `notificationService.createForUsers` (Task 2).

- [ ] **Step 1: Add the import and the fan-out call**

In `src/services/announcement.service.ts`, add the import and change `create`:

```ts
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/AppError";
import { notificationService } from "@/services/notification.service";

export const announcementService = {
    async getActive(barangayName?: string) {
        const conditions: Array<Record<string, unknown>> = [{ audience: "All Users" }];

        if (barangayName) {
            conditions.push({
                audience: "Specific Barangay",
                barangayName: { equals: barangayName, mode: "insensitive" },
            });
        }

        return prisma.announcement.findFirst({
            where: { OR: conditions },
            orderBy: { createdAt: "desc" },
        });
    },

    async listForAdmin() {
        return prisma.announcement.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
        });
    },

    async create(
        createdByUserId: string,
        data: {
            title: string;
            content: string;
            priority: string;
            audience: string;
            barangayName?: string;
        }
    ) {
        const announcement = await prisma.announcement.create({
            data: {
                title: data.title,
                content: data.content,
                priority: data.priority,
                audience: data.audience,
                barangayName: data.barangayName ?? null,
                createdByUserId,
            },
        });

        if (data.audience === "All Users") {
            const citizens = await prisma.user.findMany({
                where: { role: "citizen" },
                select: { id: true },
            });
            await notificationService.createForUsers(
                citizens.map((c) => c.id),
                { type: "announcement", title: announcement.title, body: announcement.content }
            );
        }

        return announcement;
    },

    async remove(id: string) {
        const existing = await prisma.announcement.findUnique({ where: { id } });
        if (!existing) throw new AppError("Announcement not found", 404);
        await prisma.announcement.delete({ where: { id } });
    },
};
```

- [ ] **Step 2: Typecheck**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 3: Run and verify with curl**

With the server running and an admin bearer token:

```bash
curl -X POST http://localhost:8000/api/admin/announcements \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Alert","content":"Testing notification fan-out.","priority":"Normal","audience":"All Users"}'
```

Then, as a citizen:

```bash
curl http://localhost:8000/api/notifications -H "Authorization: Bearer <CITIZEN_TOKEN>"
```

Expected: the response now includes a row with `type: "announcement"`, `title: "Test Alert"`.

```bash
curl -X POST http://localhost:8000/api/admin/announcements \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Barangay Test","content":"Should not notify.","priority":"Normal","audience":"Specific Barangay","barangayName":"Poblacion"}'
curl http://localhost:8000/api/notifications -H "Authorization: Bearer <CITIZEN_TOKEN>"
```

Expected: no new row for the barangay-scoped announcement.

- [ ] **Step 4: Commit**

```bash
git add src/services/announcement.service.ts
git commit -m "feat: notify citizens on All Users announcement publish"
```

---

### Task 6: Backend — wire incident status change trigger

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\services\incident.service.ts`

**Interfaces:**
- Consumes: `notificationService.createForUsers` (Task 2).

- [ ] **Step 1: Add the import, the copy table, and the fan-out calls**

Replace the full contents of `src/services/incident.service.ts`:

```ts
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/AppError";
import { notificationService } from "@/services/notification.service";

const URGENCY_BY_CATEGORY: Record<string, string> = {
    fire: "high",
    medical: "high",
    flood: "medium",
    "road-accident": "medium",
    other: "low",
};

const NON_TERMINAL_STATUSES = ["pending", "lobby", "on_the_way", "arrived"];

const STATUS_NOTIFICATION_COPY: Record<string, { title: string; body: string }> = {
    lobby: { title: "Responder assigned", body: "A responder has accepted your report." },
    on_the_way: { title: "Responder en route", body: "Your responder is on the way." },
    arrived: { title: "Responder arrived", body: "Your responder has arrived at the location." },
    completed: { title: "Report resolved", body: "Your report has been resolved." },
    cancelled: { title: "Report cancelled", body: "Your report was cancelled." },
};

async function notifyStatusChange(reporterId: string, status: string) {
    const copy = STATUS_NOTIFICATION_COPY[status];
    if (!copy) return;
    await notificationService.createForUsers([reporterId], {
        type: "incident_status",
        title: copy.title,
        body: copy.body,
    });
}

export const incidentService = {
    async create(
        reporterId: string,
        data: {
            category: string;
            details?: string;
            locationLabel: string;
            latitude: number;
            longitude: number;
        }
    ) {
        return prisma.incident.create({
            data: {
                source: "report",
                reporterId,
                category: data.category,
                details: data.details,
                locationLabel: data.locationLabel,
                latitude: data.latitude,
                longitude: data.longitude,
                urgency: URGENCY_BY_CATEGORY[data.category] ?? "low",
            },
        });
    },

    async createFromSos(
        reporterId: string,
        sosAlertId: string,
        data: { latitude?: number; longitude?: number }
    ) {
        return prisma.incident.create({
            data: {
                source: "sos",
                reporterId,
                sosAlertId,
                category: "sos",
                locationLabel: "SOS Alert",
                latitude: data.latitude,
                longitude: data.longitude,
                urgency: "high",
            },
        });
    },

    async list() {
        return prisma.incident.findMany({
            where: { status: { in: NON_TERMINAL_STATUSES } },
            orderBy: { createdAt: "desc" },
        });
    },

    async listByReporter(reporterId: string) {
        return prisma.incident.findMany({
            where: { reporterId },
            orderBy: { createdAt: "desc" },
        });
    },

    async getById(id: string) {
        const incident = await prisma.incident.findUnique({ where: { id } });
        if (!incident) throw new AppError("Incident not found", 404);
        return incident;
    },

    async accept(id: string, responderId: string) {
        const incident = await prisma.incident.findUnique({ where: { id } });
        if (!incident) throw new AppError("Incident not found", 404);
        if (incident.status !== "pending") {
            throw new AppError("Incident already accepted", 409);
        }

        const updated = await prisma.incident.update({
            where: { id },
            data: { status: "lobby", acceptedByResponderId: responderId },
        });

        await notifyStatusChange(updated.reporterId, updated.status);
        return updated;
    },

    async updateStatus(id: string, responderId: string, status: string) {
        const incident = await prisma.incident.findUnique({ where: { id } });
        if (!incident) throw new AppError("Incident not found", 404);
        if (incident.acceptedByResponderId !== responderId) {
            throw new AppError("Not your incident", 403);
        }

        const updated = await prisma.incident.update({
            where: { id },
            data: { status },
        });

        await notifyStatusChange(updated.reporterId, updated.status);
        return updated;
    },
};
```

- [ ] **Step 2: Typecheck**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 3: Run and verify with curl**

As a citizen, create a report (`POST /api/incidents`); as a responder, accept it (`PATCH /api/incidents/:id/accept`) then walk it through statuses (`PATCH /api/incidents/:id/status` with `{"status":"on_the_way"}`, then `"arrived"`, then `"completed"`). After each step, as the citizen:

```bash
curl http://localhost:8000/api/notifications -H "Authorization: Bearer <CITIZEN_TOKEN>"
```

Expected: one new `type: "incident_status"` row appears after each transition, in order (`lobby` → `on_the_way` → `arrived` → `completed`).

- [ ] **Step 4: Commit**

```bash
git add src/services/incident.service.ts
git commit -m "feat: notify reporter on every incident status change"
```

---

### Task 7: Backend — wire tide risk escalation trigger

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Bacnkend\src\services\tide.service.ts`

**Interfaces:**
- Consumes: `notificationService.createForUsers` (Task 2).

- [ ] **Step 1: Add the severity comparison and fan-out call**

In `src/services/tide.service.ts`:

1. Add the import (alongside the existing ones):

```ts
import { notificationService } from "@/services/notification.service";
```

2. Add the severity rank and notification-copy constants (near `deriveWeatherDescription`):

```ts
const RISK_SEVERITY: Record<string, number> = { normal: 0, watch: 1, warning: 2 };

const RISK_NOTIFICATION_COPY: Record<"watch" | "warning", { title: string; body: string }> = {
    watch: { title: "Flood risk: Watch", body: "Water levels are elevated — stay alert." },
    warning: {
        title: "Flood risk: Warning",
        body: "Flood risk in low-lying areas — avoid the causeway.",
    },
};
```

3. Change `refreshTideStatus` to notify on escalation, right after the `upsert` call:

```ts
async function refreshTideStatus(): Promise<void> {
    const existing = await prisma.tideStatus.findUnique({ where: { id: "current" } });
    if (existing && Date.now() - existing.updatedAt.getTime() < FRESHNESS_WINDOW_MS) {
        return;
    }

    const { seaLevelM, nextExtremeAt, nextExtremeType, airTemperatureC, cloudCoverPct, precipitationMm } =
        await fetchFromStormglass();
    const floodRiskLevel = deriveFloodRiskLevel(seaLevelM);
    const weatherDescription = deriveWeatherDescription(cloudCoverPct, precipitationMm);
    const fetchedAt = new Date();

    await prisma.tideStatus.upsert({
        where: { id: "current" },
        create: {
            id: "current",
            seaLevelM,
            nextExtremeAt,
            nextExtremeType,
            floodRiskLevel,
            airTemperatureC,
            weatherDescription,
            fetchedAt,
        },
        update: {
            seaLevelM,
            nextExtremeAt,
            nextExtremeType,
            floodRiskLevel,
            airTemperatureC,
            weatherDescription,
            fetchedAt,
        },
    });

    const isEscalation =
        existing !== null && RISK_SEVERITY[floodRiskLevel] > RISK_SEVERITY[existing.floodRiskLevel];

    if (isEscalation && (floodRiskLevel === "watch" || floodRiskLevel === "warning")) {
        const copy = RISK_NOTIFICATION_COPY[floodRiskLevel];
        const citizens = await prisma.user.findMany({
            where: { role: "citizen" },
            select: { id: true },
        });
        await notificationService.createForUsers(
            citizens.map((c) => c.id),
            { type: "tide_risk", title: copy.title, body: copy.body }
        );
    }
}
```

- [ ] **Step 2: Typecheck**

```bash
cd C:\Users\kianr\CordovaRiskQ-Bacnkend
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 3: Verify with a manual DB edit + poll**

With the server running, in a DB client (or `npx prisma studio`), set the current `TideStatus` row's `floodRiskLevel` to `"normal"` and `updatedAt` to more than 7 hours in the past (so the freshness guard doesn't skip the poll). Restart the server (`startTidePolling()` polls once immediately on boot) and check the server logs for a successful poll, then:

```bash
curl http://localhost:8000/api/notifications -H "Authorization: Bearer <CITIZEN_TOKEN>"
```

Expected: if the live Stormglass data computes `"watch"` or `"warning"` for the current conditions, a `type: "tide_risk"` row appears. If it computes `"normal"` again, no row appears (no escalation) — this is data-dependent, not a bug; the important check is that a *second* poll immediately after (within the freshness window, so it no-ops) does not create a duplicate row.

- [ ] **Step 4: Commit**

```bash
git add src/services/tide.service.ts
git commit -m "feat: notify citizens when flood risk escalates"
```

---

### Task 8: Mobile — push registration service

**Files:**
- Create: `C:\Users\kianr\CordovaRiskQ-Frontend\services\push.service.ts`

**Interfaces:**
- Consumes: `apiPatch` from `@/services/api` (existing).
- Produces: `export async function registerForPushNotifications(token: string): Promise<void>`. Consumed by Task 9's `app/_layout.tsx`.

- [ ] **Step 1: Install the new dependencies**

```bash
cd C:\Users\kianr\CordovaRiskQ-Frontend
npx expo install expo-notifications expo-device
```

Expected: `package.json` gains `expo-notifications` and `expo-device` at SDK-compatible versions.

- [ ] **Step 2: Write the service**

```ts
// services/push.service.ts
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { apiPatch } from "./api";

export async function registerForPushNotifications(token: string): Promise<void> {
  if (!Device.isDevice) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  await apiPatch("/api/users/push-token", { token: pushToken }, token);
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
cd C:\Users\kianr\CordovaRiskQ-Frontend
npx tsc --noEmit
npx eslint services/push.service.ts
```

Expected: no errors from either command.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json services/push.service.ts
git commit -m "feat: add push notification registration service"
```

---

### Task 9: Mobile — wire push registration into the auth flow

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Frontend\app\_layout.tsx`

**Interfaces:**
- Consumes: `registerForPushNotifications` (Task 8); `token` from `useAuth()` (existing, not previously destructured here).

- [ ] **Step 1: Add the import**

In `app/_layout.tsx`, add alongside the other imports:

```ts
import { registerForPushNotifications } from "@/services/push.service";
```

- [ ] **Step 2: Destructure `token` and add the registration effect**

In `RootLayoutNav`, change:

```ts
const { isAuthenticated, isLoading, needsOnboarding, needsTerms, user } = useAuth();
```

to:

```ts
const { isAuthenticated, isLoading, needsOnboarding, needsTerms, user, token } = useAuth();
```

Then, right after the existing redirect `useEffect` (the one with the `[isAuthenticated, isLoading, needsOnboarding, needsTerms, segments, user]` dependency array), add a new effect:

```ts
  useEffect(() => {
    if (isAuthenticated && token) {
      registerForPushNotifications(token).catch(() => {});
    }
  }, [isAuthenticated, token]);
```

- [ ] **Step 3: Typecheck**

```bash
cd C:\Users\kianr\CordovaRiskQ-Frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run and verify on a physical device**

`expo-notifications`' permission prompt and push token don't work on simulators/emulators — this step needs a physical device via Expo Go or a dev client.

```bash
npx expo start
```

Log in on a physical device. Expected: a system push-permission prompt appears; after accepting, check the backend server logs or query `SELECT "pushToken" FROM "User" WHERE id = '<your user id>';` to confirm a token was saved.

- [ ] **Step 5: Commit**

```bash
git add "app/_layout.tsx"
git commit -m "feat: register for push notifications after login"
```

---

### Task 10: Mobile — rewrite `notification.service.ts` and add `formatRelativeTime`

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Frontend\services\notification.service.ts`
- Modify: `C:\Users\kianr\CordovaRiskQ-Frontend\utils\formatter.ts`

**Interfaces:**
- Consumes: `apiGet`, `apiPatch` from `@/services/api` (existing).
- Produces:
  - `export type NotificationType = "announcement" | "incident_status" | "tide_risk"`.
  - `export type AppNotification = { id: string; type: NotificationType; title: string; body: string; read: boolean; createdAt: string }`.
  - `export async function getNotifications(token: string): Promise<AppNotification[]>`.
  - `export async function markAllNotificationsRead(token: string): Promise<void>`.
  - `export function formatRelativeTime(value: string | Date): string` (in `utils/formatter.ts`).
  - Consumed by Task 11 (`app/notifications/index.tsx`) and Task 12 (`app/(tabs)/home.tsx`).

- [ ] **Step 1: Replace `services/notification.service.ts`**

```ts
// services/notification.service.ts
import { apiGet, apiPatch } from "./api";

export type NotificationType = "announcement" | "incident_status" | "tide_risk";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export async function getNotifications(token: string): Promise<AppNotification[]> {
  const response = await apiGet<{ success: true; notifications: AppNotification[] }>(
    "/api/notifications",
    token,
  );
  return response.notifications;
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await apiPatch("/api/notifications/read-all", {}, token);
}
```

- [ ] **Step 2: Add `formatRelativeTime` to `utils/formatter.ts`**

Append to the existing file:

```ts
export function formatRelativeTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return formatDate(date);
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
cd C:\Users\kianr\CordovaRiskQ-Frontend
npx tsc --noEmit
npx eslint services/notification.service.ts utils/formatter.ts
```

Expected: an error in `app/notifications/index.tsx` (still imports the old `AppNotification` shape with `timestamp`/`group`) and `app/(tabs)/home.tsx` (still calls `getNotifications()` with no token) — expected, fixed in Tasks 11–12. No errors in the two files touched by this task.

- [ ] **Step 4: Commit**

```bash
git add services/notification.service.ts utils/formatter.ts
git commit -m "feat: wire notification.service.ts to the real backend"
```

---

### Task 11: Mobile — update the notifications screen

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Frontend\app\notifications\index.tsx`

**Interfaces:**
- Consumes: `getNotifications`, `markAllNotificationsRead`, `type AppNotification`, `type NotificationType` from `@/services/notification.service` (Task 10); `formatRelativeTime` from `@/utils/formatter` (Task 10); `useAuth` from `@/context/AuthContext` (existing, not previously imported here).

- [ ] **Step 1: Replace the file**

```tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import { useAuth } from "@/context/AuthContext";
import {
  getNotifications,
  markAllNotificationsRead,
  type AppNotification,
  type NotificationType,
} from "@/services/notification.service";
import {
  useThemeColors,
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  type ColorPalette,
} from "@/theme";
import { formatRelativeTime } from "@/utils/formatter";

const ICON_BY_TYPE: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  announcement: "megaphone-outline",
  incident_status: "document-text-outline",
  tide_risk: "water-outline",
};

function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    getNotifications(token)
      .then((result) => {
        setNotifications(result);
        return markAllNotificationsRead(token);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [token]);

  const today = notifications.filter((n) => isToday(n.createdAt));
  const earlier = notifications.filter((n) => !isToday(n.createdAt));

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={styles.backButton} />
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loading} />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="notifications-off-outline"
              size={26}
              color={COLORS.textTertiary}
            />
          </View>
          <Text style={styles.emptyTitle}>You&apos;re all caught up</Text>
          <Text style={styles.emptyText}>
            New alerts and updates will show up here.
          </Text>
        </View>
      ) : (
        <>
          {today.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Today</Text>
              <View style={styles.card}>
                {today.map((item, index) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    isLast={index === today.length - 1}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {earlier.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Earlier</Text>
              <View style={styles.card}>
                {earlier.map((item, index) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    isLast={index === earlier.length - 1}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function NotificationRow({
  item,
  isLast,
}: {
  item: AppNotification;
  isLast: boolean;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[styles.row, !isLast && styles.rowDivider]}
        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        <LinearGradient
          colors={COLORS.iconTileGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <Ionicons
            name={ICON_BY_TYPE[item.type]}
            size={17}
            color={COLORS.primary}
          />
        </LinearGradient>
        <View style={styles.textCol}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
        </View>
        <Text style={styles.timestamp}>{formatRelativeTime(item.createdAt)}</Text>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.lg,
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
    fontFamily: FONT_FAMILY.displaySemibold,
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.text,
  },
  loading: {
    marginTop: SPACING.xl,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginLeft: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    paddingHorizontal: SPACING.md,
    ...SHADOW,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm + 2,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMuted,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  body: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.textTertiary,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
    gap: SPACING.xs,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "700",
    color: COLORS.text,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  });
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
cd C:\Users\kianr\CordovaRiskQ-Frontend
npx tsc --noEmit
npx eslint "app/notifications/index.tsx"
```

Expected: no errors from either command (the `home.tsx` error from Task 10 remains — fixed next in Task 12).

- [ ] **Step 3: Commit**

```bash
git add "app/notifications/index.tsx"
git commit -m "feat: wire notifications screen to real backend data"
```

---

### Task 12: Mobile — update Home's unread badge

**Files:**
- Modify: `C:\Users\kianr\CordovaRiskQ-Frontend\app\(tabs)\home.tsx`

**Interfaces:**
- Consumes: `getNotifications(token)` (Task 10); `token` from `useAuth()` (existing, `user` already destructured from the same hook).

- [ ] **Step 1: Destructure `token` and update the fetch/derivation**

In `app/(tabs)/home.tsx`, change:

```ts
const { user } = useAuth();
```

to:

```ts
const { user, token } = useAuth();
```

Then change the existing effect's notifications call from:

```ts
    getNotifications()
      .then((notifications) => setHasUnread(notifications.length > 0))
      .catch(() => {});
```

to:

```ts
    if (token) {
      getNotifications(token)
        .then((notifications) => setHasUnread(notifications.some((n) => !n.read)))
        .catch(() => {});
    }
```

- [ ] **Step 2: Typecheck and lint**

```bash
cd C:\Users\kianr\CordovaRiskQ-Frontend
npx tsc --noEmit
npx eslint "app/(tabs)/home.tsx"
```

Expected: no errors from either command.

- [ ] **Step 3: Run against the local backend and verify**

With the backend running and Tasks 1–11 in place, run the mobile app on a physical device (push registration in Task 9 needs one) and log in.

Expected end-to-end flow:
1. Publish an "All Users" announcement from the admin dashboard — the Home bell shows the unread dot, and (if the device granted push permission) a system push notification arrives even if the app is backgrounded.
2. Open the Notifications screen — the announcement appears under "Today" with the correct icon, relative time, and content; after the screen loads, return to Home — the dot is gone.
3. As a responder, accept and progress a report submitted from this device — each transition adds a new "Today" row and re-triggers the unread dot.
4. Deny push permission on a second test login (or a fresh install); confirm the in-app inbox and unread dot still work normally with no crash.

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/home.tsx"
git commit -m "feat: derive Home unread badge from real notification read state"
```

---

## Self-Review Notes

- **Spec coverage:** all 6 scope items map to tasks — `Notification` model + `pushToken` field (Task 1), notification service (Task 2), notification endpoints (Task 3), push-token endpoint (Task 4), the three trigger wirings (Tasks 5–7), mobile push registration (Tasks 8–9), mobile inbox rewiring (Tasks 10–12). Every "Out of scope" item from the spec (admin ops feed, barangay-scoped push, per-notification read/tap actions, notification preferences, retention/cleanup, multi-device push, de-escalation notifications) is left untouched by every task above.
- **Placeholder scan:** no TBD/TODO; every step has real code or an exact command with exact expected output.
- **Type consistency:** `notificationService.createForUsers(userIds: string[], data: { type, title, body })` (Task 2) is called identically by Task 5 (`announcement.service.ts`), Task 6 (`incident.service.ts`), and Task 7 (`tide.service.ts`) — all pass `type` as one of the same three string literals used in mobile's `NotificationType` (Task 10). `AppNotification`'s `{ id, type, title, body, read, createdAt }` (Task 10) matches exactly what Task 11's `NotificationRow`/`ICON_BY_TYPE` and Task 12's `.some((n) => !n.read)` consume. `registerForPushNotifications(token: string)` (Task 8) matches the call site in Task 9 exactly.
- **Severity/escalation check:** the `RISK_SEVERITY` comparison in Task 7 only fires when `existing !== null`, matching the spec's "no notification on the very first poll" rule, and only for `floodRiskLevel` of `"watch"`/`"warning"` (never re-notifies on a `"normal"` result, and never on de-escalation since that would make `RISK_SEVERITY[floodRiskLevel] > RISK_SEVERITY[existing.floodRiskLevel]` false).
