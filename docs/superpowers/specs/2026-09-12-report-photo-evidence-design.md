# Report Photo Evidence — Design

## Goal

Replace the mock "Add Photo" toggle on the report-incident screen with a real
camera/gallery picker, a real preview, and a real (gated) upload before
submission.

## Current state (why this is greenfield, not a tweak)

- `components/report/PhotoPicker.tsx` is explicitly mock-only today — its
  original design doc says: *"No `expo-image-picker` integration... Add
  Photo is UI-only: tapping toggles a mock 'attached' state."*
  (`docs/superpowers/specs/2026-07-29-report-incident-design.md:31`)
- `services/report.service.ts#createReport` posts plain JSON with no photo
  field at all.
- The only other photo flow in the app, `context/ProfilePhotoContext.tsx`, is
  explicitly local-only: *"the backend has no avatar-upload endpoint yet...
  swap the setter below for a real upload call once that endpoint exists."*
- The responder app (`responder/`) has zero photo-evidence handling.

So there is no existing backend contract for incident-photo upload anywhere
in this repo, and the backend repo isn't available to inspect from here.

## Open dependency — backend contract assumption

This plan builds against an **assumed** REST contract, isolated entirely to
two functions in `services/report.service.ts`:

- `POST {API_BASE_URL}/api/incidents/photo` — `multipart/form-data`, field
  name `photo`, `Authorization: Bearer <token>` header. Response:
  `{ success: true, photoUrl: string }`.
- `POST {API_BASE_URL}/api/incidents` (existing `createReport` call) gains an
  optional `photoUrl?: string` field in its JSON body.

**This must be confirmed against the actual backend once available.** If the
real contract differs, only `uploadReportPhoto` and `createReport`'s payload
type in `services/report.service.ts` need to change — nothing in the UI
layer (`PhotoPicker.tsx`, `report.tsx`) depends on the wire format. Until the
backend implements this route, calls to it will fail (404/network error),
which correctly exercises the "upload failed" path end to end rather than
silently lying about success.

**Out of scope:** implementing the backend endpoint itself, and building
responder-side photo display. This plan only guarantees the frontend never
*claims* photo evidence exists unless a real upload succeeded — what the
responder app does with `photoUrl` once the backend supports it is a
separate piece of work.

## UX flow

1. Tap "Add Photo" → action sheet: **Take Photo** / **Choose from Gallery** /
   Cancel.
2. On successful capture/selection: show an immediate preview (thumbnail +
   file name), and replace the "Add Photo" box with the preview card showing
   **Change Photo** / **Remove Photo**.
3. Cancelling the camera or gallery picker leaves the current state
   (attached photo, or the empty "Add Photo" box) completely unchanged.
4. On submit, only if a photo is attached:
   - Verify the file still exists at its URI (`expo-file-system`'s `File`
     class) before attempting upload.
   - Show an uploading state (submit button spinner + "Uploading photo..."
     caption) while the upload is in flight.
   - If the file is missing, or the upload request fails for any reason,
     **stop submission** (do not call `createReport` at all) and show:
     `Photo upload failed. Please try again or remove the photo.`
   - Only on a successful upload does the created report's payload include
     `photoUrl`. No photo attached → submit proceeds normally with no photo
     field, exactly as before.

## Component/type design

- New shared type `SelectedPhoto = { uri: string; fileName: string }`,
  exported from `components/report/PhotoPicker.tsx`.
- `PhotoPicker` props change from `{ attached: boolean; onToggle: () => void
  }` to `{ photo: SelectedPhoto | null; onSelect: (photo: SelectedPhoto) =>
  void; onRemove: () => void }`.
- `app/(tabs)/report.tsx`'s `submitPhase` state gains an `"uploading-photo"`
  member: `"idle" | "locating" | "uploading-photo" | "submitting"`.
- Failure alert: title `"Photo upload failed"`, message `"Please try again
  or remove the photo."` (matches the existing `Alert.alert(title, message)`
  convention already used in this file for submit failures).

## New dependency

`expo-file-system` is not currently installed. Add it via `npx expo install
expo-file-system` so the version matches the Expo SDK 57 lockfile expectations
(per `AGENTS.md`: Expo has changed — install/read against the exact
versioned SDK 57 docs, not older API shapes).
