import { scrollToEndWhenKeyboardReady, type KeyboardLike } from "./scrollOnKeyboard";

function fakeKeyboard(visible: boolean) {
  const listeners: (() => void)[] = [];
  const removed: number[] = [];
  const keyboard: KeyboardLike = {
    isVisible: () => visible,
    addListener: (_event, listener) => {
      const index = listeners.push(listener) - 1;
      return { remove: () => removed.push(index) };
    },
  };
  return {
    keyboard,
    listeners,
    removed,
    show() {
      listeners.forEach((listener) => listener());
    },
  };
}

const runNow = (run: () => void) => run();

describe("scrollToEndWhenKeyboardReady", () => {
  it("keyboard already open (Password -> Confirm): scrolls right away, no waiting for an event that won't come", () => {
    const { keyboard, listeners } = fakeKeyboard(true);
    const scroll = jest.fn();

    scrollToEndWhenKeyboardReady(keyboard, scroll, runNow);

    expect(scroll).toHaveBeenCalledTimes(1);
    expect(listeners).toHaveLength(0);
  });

  it("keyboard not open yet: waits until it has fully shown, then scrolls once", () => {
    const fake = fakeKeyboard(false);
    const scroll = jest.fn();

    scrollToEndWhenKeyboardReady(fake.keyboard, scroll, runNow);
    expect(scroll).not.toHaveBeenCalled();

    fake.show();
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(fake.removed).toEqual([0]); // listener cleaned up
  });

  it("defers the scroll so the keyboard padding is laid out first", () => {
    const { keyboard } = fakeKeyboard(true);
    const scroll = jest.fn();
    const deferred: (() => void)[] = [];

    scrollToEndWhenKeyboardReady(keyboard, scroll, (run) => deferred.push(run));
    expect(scroll).not.toHaveBeenCalled();

    deferred.forEach((run) => run());
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it("uses a short real delay by default", () => {
    jest.useFakeTimers();
    try {
      const { keyboard } = fakeKeyboard(true);
      const scroll = jest.fn();

      scrollToEndWhenKeyboardReady(keyboard, scroll);
      expect(scroll).not.toHaveBeenCalled();
      jest.advanceTimersByTime(150);
      expect(scroll).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
