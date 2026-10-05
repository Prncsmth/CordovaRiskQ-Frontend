import { isGoogleSignup, signupFinishAction } from "./signupFinish";

describe("signupFinishAction", () => {
  it("keeps a new Google user signed in after Terms (straight to Home + guide)", () => {
    expect(signupFinishAction(true)).toBe("stay-signed-in");
  });

  it("keeps the email/password flow: log out to Registration Complete, then Login", () => {
    expect(signupFinishAction(false)).toBe("log-out-to-login");
  });
});

describe("isGoogleSignup", () => {
  it("is true only for a brand-new account created through Google", () => {
    expect(isGoogleSignup(true, true)).toBe(true);
  });

  it("is false for a new email/password account", () => {
    expect(isGoogleSignup(true, undefined)).toBe(false);
    expect(isGoogleSignup(true, false)).toBe(false);
  });

  it("is false for an existing account signing in with Google", () => {
    expect(isGoogleSignup(false, true)).toBe(false);
  });
});
