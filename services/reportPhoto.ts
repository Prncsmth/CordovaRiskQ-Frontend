// services/reportPhoto.ts
// The photo step of submitting a report (app/(tabs)/report.tsx). A failed
// photo no longer throws the whole report away: the user is asked whether
// to submit without it, and only then does the report go ahead -- with no
// photoUrl, so nothing pretends the photo was attached. Pure (upload and
// the confirmation prompt are injected) so it's unit-testable without the
// screen.
export type ReportPhotoDeps<TPhoto extends { uri: string }> = {
  fileExists(uri: string): boolean;
  upload(photo: TPhoto): Promise<{ photoUrl: string }>;
  // Resolves true for "Submit without photo", false for cancel.
  confirmSubmitWithoutPhoto(): Promise<boolean>;
};

export type ReportPhotoOutcome =
  | { proceed: true; photoUrl?: string }
  | { proceed: false };

export async function resolveReportPhoto<TPhoto extends { uri: string }>(
  photo: TPhoto | null,
  deps: ReportPhotoDeps<TPhoto>,
): Promise<ReportPhotoOutcome> {
  if (!photo) return { proceed: true };

  // A photo that's gone from the device (e.g. a cleared cache) fails the
  // same way as a failed upload.
  if (deps.fileExists(photo.uri)) {
    try {
      const { photoUrl } = await deps.upload(photo);
      return { proceed: true, photoUrl };
    } catch {
      // Fall through to the confirmation below.
    }
  }

  const submitWithoutPhoto = await deps.confirmSubmitWithoutPhoto();
  return submitWithoutPhoto ? { proceed: true } : { proceed: false };
}
