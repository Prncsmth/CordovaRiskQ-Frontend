# Emergency Hotlines Backend Integration — Design

**Date:** 2026-09-21
**Repos touched:** `CordovaRiskQ-Frontend` (this repo) and `CordovaRiskQ-Bacnkend` (sibling repo, Express + Prisma/Postgres + JWT, TypeScript, ESM with `@/` path aliases).

## Purpose

The Contacts screen (`app/contacts/index.tsx`) currently reads its six emergency hotlines from a hardcoded array in `services/contacts.service.ts`. This spec replaces that with a real backend resource, mirroring the `EvacuationCenter` pattern already shipped (`2026-09-15_add_evacuation_center`): a Prisma model, a seed matching the current hardcoded data, and a real `GET` endpoint the app reads from instead of the local array.

## Scope

1. Backend: `Hotline` Prisma model.
2. Backend: seed data (the same 6 hotlines, same ids) added to `prisma/seed.ts`.
3. Backend: `GET /api/hotlines`, authenticated (same convention as `GET /api/evacuation-centers`).
4. Frontend: `services/contacts.service.ts`'s `getHotlines(token)` calls the real endpoint.
5. Frontend: `app/contacts/index.tsx` passes `token`, and drops its local `HOTLINE_CATEGORY` lookup in favor of the server's `category` field.

## Out of scope

- **Admin-editable hotlines.** No `PATCH` route, no `CordovaRiskQ-Admin` page. Evacuation centers have this because MDRRMO staff toggle live capacity; hotline numbers change rarely enough that a direct DB update is an acceptable path for now. Follow-up work if that changes.
- **Icon / accent color / agency-seal image mapping.** These stay exactly where they are today — client-side lookups in `app/contacts/index.tsx` keyed by hotline id (`HOTLINE_ICONS`, `HOTLINE_ACCENT_COLORS`, `HOTLINE_IMAGES`). Same reasoning as evacuation centers' `photo` field: presentation detail, not real data, and the backend model has no such field.
- **User-added personal contacts.** No such feature exists in the app today (the Contacts screen is agency hotlines only) — not being added here.
- **Automated tests.** Neither repo has test coverage for this class of resource (`evacuationCenter.*` on the backend has none either — only pure-logic services like `geofence`/`incidentRoster` are tested); verification is manual.

## Architecture

### Backend

**Prisma schema** (`prisma/schema.prisma`) gains:

```prisma
model Hotline {
  id        String   @id // fixed slug, matches the frontend's current ids exactly
  name      String
  number    String
  category  String   // "police" | "fire" | "medical" | "maritime"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Fixed slug ids (`mdrrmo`, `police`, `bfp`, `coast-guard`, `health-center`, `red-cross`) so the frontend's existing icon/color/image lookups by id keep working unchanged. `category` moves server-side — it's real classification data, not presentation — replacing the frontend's own `HOTLINE_CATEGORY` map.

**Migration**: per the known Neon DB drift between this repo and `CordovaRiskQ- Admin` (`prisma migrate dev`/`migrate reset`/`db push --accept-data-loss` are all destructive here — they'd offer to drop the Admin repo's `Admin` table), the migration is hand-written and applied the same way `SosAlert` was:
1. Write `prisma/migrations/20260921120000_add_hotline/migration.sql` by hand, matching the style of `20260915165423_add_evacuation_center/migration.sql`.
2. Apply it with `npx prisma db execute --file <path>`.
3. Record it with `npx prisma migrate resolve --applied 20260921120000_add_hotline`.
4. `npx prisma generate` to refresh the client.

**Seed** (`prisma/seed.ts`): a `seedHotlines()` function added alongside `seedEvacuationCenters()`, called from `main()`. Uses `upsert` per row (not delete-and-recreate), same reasoning as evacuation centers — safe to re-run.

**Route/controller/service**, following the existing four-file pattern minus validation (no request body — this is a GET-only resource, same as `tide.routes.ts` having no validation file):
- `src/services/hotline.service.ts` — `list()`: `prisma.hotline.findMany({ orderBy: { name: "asc" } })`.
- `src/controllers/hotline.controller.ts` — `list`: calls the service, returns `{ success: true, hotlines }`.
- `src/routes/hotline.routes.ts` — `router.get("/hotlines", authenticate, hotlineController.list)`. Authenticated, matching `evacuationCenter.routes.ts` (not `tide.routes.ts`'s public precedent) since this is explicitly mirroring the evacuation-center resource.
- Mounted in `src/routes/index.ts` alongside the other route files.

### Frontend

**`services/contacts.service.ts`** (rewritten, same shape as `evacuation.service.ts`'s recent rewrite):
```ts
export type Hotline = { id: string; name: string; number: string; category: HotlineCategory };
export type HotlineCategory = "police" | "fire" | "medical" | "maritime";

export async function getHotlines(token: string): Promise<Hotline[]> {
  const response = await apiGet<{ success: true; hotlines: HotlineApiRow[] }>("/api/hotlines", token);
  return response.hotlines.map(toHotline);
}
```

**`app/contacts/index.tsx`**: add `useAuth()` for `token`, pass it into `getHotlines(token)` (guard on `!token` the same way other screens do), and delete the local `HOTLINE_CATEGORY` map — group by `hotline.category` directly instead. `HOTLINE_ICONS`/`HOTLINE_ACCENT_COLORS`/`HOTLINE_IMAGES` are untouched.

## Testing

No existing test coverage to extend on either repo for this class of resource. Verification is manual: seed the backend, hit `GET /api/hotlines` with a valid token, then run the mobile app and confirm the Contacts screen renders the same six hotlines, grouped the same way, dialing still works.
