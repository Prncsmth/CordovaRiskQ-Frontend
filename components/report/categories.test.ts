import { canMarkUrgent } from "./categories";

describe("canMarkUrgent", () => {
  it("is false until a category is picked", () => {
    expect(canMarkUrgent(null)).toBe(false);
  });

  it("is false for categories that are already high urgency", () => {
    expect(canMarkUrgent("fire")).toBe(false);
    expect(canMarkUrgent("medical")).toBe(false);
  });

  it("is true for categories the toggle can raise", () => {
    expect(canMarkUrgent("flood")).toBe(true);
    expect(canMarkUrgent("road-accident")).toBe(true);
    expect(canMarkUrgent("other")).toBe(true);
  });
});
