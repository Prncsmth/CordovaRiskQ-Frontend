import { isValidPhMobile, toPhMobile } from "./responderContact";

describe("isValidPhMobile", () => {
  it("accepts the formats the backend accepts", () => {
    expect(isValidPhMobile("09171234567")).toBe(true);
    expect(isValidPhMobile("+639171234567")).toBe(true);
    expect(isValidPhMobile("+63 917 123 4567")).toBe(true);
    expect(isValidPhMobile("0917-123-4567")).toBe(true);
  });

  it("rejects a missing, blank, short or non-mobile number", () => {
    expect(isValidPhMobile(null)).toBe(false);
    expect(isValidPhMobile(undefined)).toBe(false);
    expect(isValidPhMobile("  ")).toBe(false);
    expect(isValidPhMobile("0917123")).toBe(false);
    expect(isValidPhMobile("0281234567")).toBe(false);
  });
});

describe("toPhMobile", () => {
  it("formats 10 local digits like the onboarding phone-number step", () => {
    expect(toPhMobile("9171234567")).toBe("+63 917 123 4567");
    expect(toPhMobile("917 123 4567")).toBe("+63 917 123 4567");
  });

  it("is null until it's a complete PH mobile number", () => {
    expect(toPhMobile("917123")).toBeNull();
    expect(toPhMobile("8171234567")).toBeNull();
    expect(toPhMobile("91712345678")).toBeNull();
  });

  it("always produces something the backend accepts", () => {
    expect(isValidPhMobile(toPhMobile("9171234567"))).toBe(true);
  });
});
