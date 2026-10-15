import { clearVerifiedResetCode, getVerifiedResetCode, rememberVerifiedResetCode } from "./passwordResetSession";

beforeEach(() => {
  clearVerifiedResetCode();
});

describe("passwordResetSession", () => {
  it("hands the verified code to the new-password step for the same email", () => {
    rememberVerifiedResetCode("juana@yahoo.com", "048213");
    expect(getVerifiedResetCode("juana@yahoo.com")).toBe("048213");
  });

  it("does not hand the code over for a different email", () => {
    rememberVerifiedResetCode("juana@yahoo.com", "048213");
    expect(getVerifiedResetCode("pedro@yahoo.com")).toBeNull();
  });

  it("forgets the code once cleared, e.g. after a successful reset", () => {
    rememberVerifiedResetCode("juana@yahoo.com", "048213");
    clearVerifiedResetCode();
    expect(getVerifiedResetCode("juana@yahoo.com")).toBeNull();
  });
});
