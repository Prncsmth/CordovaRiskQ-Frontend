import { callResponderAction, toTelUrl } from "./callResponder";

describe("toTelUrl", () => {
  it("dials the number with only + and digits, like the Contacts screen", () => {
    expect(toTelUrl("+63 912 345 6789")).toBe("tel:+639123456789");
    expect(toTelUrl("0917-123-4567")).toBe("tel:09171234567");
  });

  it("has nothing to dial when the number is missing, blank or too short", () => {
    expect(toTelUrl(null)).toBeNull();
    expect(toTelUrl(undefined)).toBeNull();
    expect(toTelUrl("   ")).toBeNull();
    expect(toTelUrl("12345")).toBeNull();
  });
});

describe("callResponderAction", () => {
  it("calls the primary responder when they have a number", () => {
    expect(callResponderAction("09171234567")).toEqual({ kind: "call", telUrl: "tel:09171234567" });
  });

  it("is unavailable (not an error) when the primary responder has no number", () => {
    expect(callResponderAction(null)).toEqual({ kind: "unavailable" });
  });
});
