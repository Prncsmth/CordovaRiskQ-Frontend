// utils/scrollOnKeyboard.ts
// onFocus helper for a field near the bottom of a form (Confirm Password):
// scroll it into view above the keyboard.
//
// - Keyboard not open yet (first tap into the form): wait for the OS's
//   "keyboard is now fully shown" event, so the scroll happens against the
//   final layout instead of landing short while the keyboard still rises.
// - Keyboard ALREADY open (typing Password, then tapping Confirm): that
//   event never fires again, which used to leave Confirm Password hidden --
//   so scroll right away instead.
// Either way the scroll is deferred briefly so KeyboardSafeView's Android
// bottom padding (applied on the same keyboard event) has rendered first.
export const LAYOUT_SETTLE_MS = 150;

export type KeyboardLike = {
  isVisible(): boolean;
  addListener(event: "keyboardDidShow", listener: () => void): { remove(): void };
};

export function scrollToEndWhenKeyboardReady(
  keyboard: KeyboardLike,
  scrollToEnd: () => void,
  defer: (run: () => void) => void = (run) => {
    setTimeout(run, LAYOUT_SETTLE_MS);
  },
): void {
  if (keyboard.isVisible()) {
    defer(scrollToEnd);
    return;
  }
  const subscription = keyboard.addListener("keyboardDidShow", () => {
    subscription.remove();
    defer(scrollToEnd);
  });
}
