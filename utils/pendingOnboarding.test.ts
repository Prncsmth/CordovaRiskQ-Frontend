import {
  completeOnboardingStep,
  parsePendingOnboarding,
  pendingForUser,
  startPendingOnboarding,
} from "./pendingOnboarding";

describe("pending onboarding", () => {
  it("a new account owes Phone Number and Terms", () => {
    expect(startPendingOnboarding("u1", true)).toEqual({
      userId: "u1",
      needsOnboarding: true,
      needsTerms: true,
      signedUpWithGoogle: true,
    });
  });

  it("survives being saved and read back (app closed and reopened)", () => {
    const saved = JSON.stringify(startPendingOnboarding("u1", false));
    expect(parsePendingOnboarding(saved)).toEqual(startPendingOnboarding("u1", false));
  });

  it("closing after Phone Number brings the user back to Terms, not Home", () => {
    const afterPhone = completeOnboardingStep(startPendingOnboarding("u1", true), "phone");
    expect(afterPhone).toEqual({
      userId: "u1",
      needsOnboarding: false,
      needsTerms: true,
      signedUpWithGoogle: true,
    });
    expect(parsePendingOnboarding(JSON.stringify(afterPhone))).toEqual(afterPhone);
  });

  it("is cleared once Terms is done too", () => {
    const afterPhone = completeOnboardingStep(startPendingOnboarding("u1", false), "phone")!;
    expect(completeOnboardingStep(afterPhone, "terms")).toBeNull();
  });

  it("only applies to the account it was saved for", () => {
    const pending = startPendingOnboarding("u1", false);
    expect(pendingForUser(pending, "u1")).toBe(pending);
    expect(pendingForUser(pending, "someone-else")).toBeNull();
    expect(pendingForUser(null, "u1")).toBeNull();
  });

  it("treats missing or unreadable data as nothing pending", () => {
    expect(parsePendingOnboarding(null)).toBeNull();
    expect(parsePendingOnboarding("")).toBeNull();
    expect(parsePendingOnboarding("not json")).toBeNull();
    expect(parsePendingOnboarding(JSON.stringify({ userId: "u1" }))).toBeNull();
    expect(
      parsePendingOnboarding(
        JSON.stringify({ userId: "u1", needsOnboarding: false, needsTerms: false, signedUpWithGoogle: false }),
      ),
    ).toBeNull();
  });
});
