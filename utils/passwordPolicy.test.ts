import { isPasswordValid } from "./passwordPolicy";

describe("isPasswordValid", () => {
  it("accepts the shortest valid password (8 chars, all required types)", () => {
    expect(isPasswordValid("Abcde1!g")).toBe(true);
  });

  it("accepts the longest valid password (12 chars, all required types)", () => {
    expect(isPasswordValid("Abcdefghij1!")).toBe(true);
  });

  it("rejects 7 characters (one below the minimum)", () => {
    expect(isPasswordValid("Abcde1!")).toBe(false);
  });

  it("rejects 13 characters (one above the maximum)", () => {
    expect(isPasswordValid("Abcdefghijk1!")).toBe(false);
  });

  it("rejects a password missing an uppercase letter", () => {
    expect(isPasswordValid("abcdefg1!")).toBe(false);
  });

  it("rejects a password missing a lowercase letter", () => {
    expect(isPasswordValid("ABCDEFG1!")).toBe(false);
  });

  it("rejects a password missing a number", () => {
    expect(isPasswordValid("Abcdefgh!")).toBe(false);
  });

  it("rejects a password missing a symbol", () => {
    expect(isPasswordValid("Abcdefg12")).toBe(false);
  });
});
