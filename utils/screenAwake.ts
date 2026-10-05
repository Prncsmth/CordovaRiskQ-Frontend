// utils/screenAwake.ts
// Keeps the screen on for one scope of work and releases it afterwards --
// used while a responder is sharing their live location
// (hooks/useLiveLocationUpload.ts), so the phone doesn't auto-lock mid-drive
// and silently stop the uploads. There's no background location, so a
// locked screen used to freeze the responder's marker on the citizen's map.
//
// The keep-awake API is injected (expo-keep-awake in production) so this is
// unit-tested without the native module. Uses a tag so it only ever
// releases its own hold, never one taken elsewhere.
export const LIVE_TRACKING_KEEP_AWAKE_TAG = "responder-live-tracking";

export type KeepAwakeApi = {
  activate(tag: string): Promise<unknown>;
  deactivate(tag: string): Promise<unknown> | unknown;
};

// Starts holding the screen awake; returns the release function. Safe in
// every order: releasing before activation finishes still ends up released,
// releasing twice is a no-op, and a failure in either call is ignored (worst
// case the screen may lock as before -- never a crash).
export function holdScreenAwake(api: KeepAwakeApi, tag: string = LIVE_TRACKING_KEEP_AWAKE_TAG): () => void {
  let released = false;

  const deactivate = () => {
    try {
      Promise.resolve(api.deactivate(tag)).catch(() => {});
    } catch {
      // Ignore -- see above.
    }
  };

  Promise.resolve()
    .then(() => api.activate(tag))
    .then(
      () => {
        // Released while activation was still in flight: undo it now.
        if (released) deactivate();
      },
      () => {},
    );

  return () => {
    if (released) return;
    released = true;
    deactivate();
  };
}
