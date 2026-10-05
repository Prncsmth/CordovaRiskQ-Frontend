// utils/keyboardOverlap.ts
// How many pixels of a view the on-screen keyboard covers. Apps on this
// Expo SDK draw edge-to-edge on Android, where the system no longer resizes
// the window for the keyboard (adjustResize has no effect), so the bottom of
// a form -- e.g. Confirm Password -- ends up behind it. KeyboardSafeView
// pads by exactly this amount. On a device that does still resize the
// window, the view already ends above the keyboard and this is 0, so no
// space is added twice.
export function keyboardOverlap(viewBottom: number, keyboardTop: number): number {
  if (!Number.isFinite(viewBottom) || !Number.isFinite(keyboardTop)) return 0;
  return Math.max(0, Math.round(viewBottom - keyboardTop));
}
