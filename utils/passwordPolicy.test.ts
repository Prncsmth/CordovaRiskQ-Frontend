import { isPasswordValid, PASSWORD_REQUIREMENTS_MESSAGE, utf8ByteLength } from "./passwordPolicy";

describe("utf8ByteLength", () => {
  it("counts bytes the way the backend's Buffer.byteLength does", () => {
    expect(utf8ByteLength("Abc1!")).toBe(5);
    expect(utf8ByteLength("ñ")).toBe(2);
    expect(utf8ByteLength("€")).toBe(3);
    expect(utf8ByteLength("\u{1F600}")).toBe(4);
  });
});

describe("72-byte cap (bcrypt)", () => {
  it("rejects a password under 64 characters that is over 72 bytes", () => {
    const emoji = "Ab1!" + "\u{1F600}".repeat(20); // 84 bytes
    expect(emoji.length).toBeLessThanOrEqual(64);
    expect(isPasswordValid(emoji)).toBe(false);
  });

  it("still accepts a few multi-byte characters", () => {
    expect(isPasswordValid("Mañana-Cebu-1!")).toBe(true);
  });
});

// "Ab1!" + lowercase padding: exactly n characters with every required type.
const ofLength = (n: number) => "Ab1!" + "x".repeat(n - 4);

describe("isPasswordValid", () => {
  it("accepts the shortest valid password (8 chars, all required types)", () => {
    expect(isPasswordValid("Abcde1!g")).toBe(true);
  });

  it("accepts the longest valid password (64 chars, all required types)", () => {
    expect(ofLength(64)).toHaveLength(64);
    expect(isPasswordValid(ofLength(64))).toBe(true);
  });

  it("accepts a long passphrase that the old 12-character limit refused", () => {
    expect(isPasswordValid("Cordova-Flood-Safe-2026!")).toBe(true);
  });

  it("rejects 7 characters (one below the minimum)", () => {
    expect(isPasswordValid("Abcde1!")).toBe(false);
  });

  it("rejects 65 characters (one above the maximum)", () => {
    expect(isPasswordValid(ofLength(65))).toBe(false);
  });

  it("states the 8-64 rule in its message", () => {
    expect(PASSWORD_REQUIREMENTS_MESSAGE).toMatch(/^Password must be 8-64 characters/);
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
