import { keyboardOverlap } from "./keyboardOverlap";

describe("keyboardOverlap", () => {
  it("is how far the view extends below the keyboard's top edge (edge-to-edge: window not resized)", () => {
    // View fills an 800px-tall screen; keyboard top at 500 -> 300px hidden.
    expect(keyboardOverlap(800, 500)).toBe(300);
  });

  it("is 0 when the window was already resized so the view ends above the keyboard", () => {
    expect(keyboardOverlap(500, 500)).toBe(0);
    expect(keyboardOverlap(480, 500)).toBe(0);
  });

  it("rounds to whole pixels", () => {
    expect(keyboardOverlap(800.6, 500.2)).toBe(300);
  });

  it("is 0 for missing measurements, never a bogus padding", () => {
    expect(keyboardOverlap(Number.NaN, 500)).toBe(0);
    expect(keyboardOverlap(800, Number.POSITIVE_INFINITY)).toBe(0);
  });
});
