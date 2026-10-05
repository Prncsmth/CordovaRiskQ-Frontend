// utils/pendingOnboarding.ts
// Sign-up steps still owed by a new account (Phone Number, then Terms),
// saved on the device so they can't be skipped by closing the app: reopening
// -- or signing in to the same account again, even after a logout -- goes
// back to the first unfinished step instead of Home. Removed only when the
// last step is actually completed.
//
// Device-local: an account that started sign-up on another phone isn't
// known here (that would need a backend field).
export const PENDING_ONBOARDING_KEY = "pending_onboarding";

export type PendingOnboarding = {
  userId: string;
  needsOnboarding: boolean; // Phone Number still owed
  needsTerms: boolean; // Terms & Conditions still owed
  signedUpWithGoogle: boolean;
};

export type OnboardingStep = "phone" | "terms";

// A new account owes both steps.
export function startPendingOnboarding(userId: string, signedUpWithGoogle: boolean): PendingOnboarding {
  return { userId, needsOnboarding: true, needsTerms: true, signedUpWithGoogle };
}

// Anything unreadable counts as "nothing pending" -- never as a reason to
// block someone, since a corrupt value is far likelier than tampering, and
// the steps themselves aren't a security boundary.
export function parsePendingOnboarding(raw: string | null): PendingOnboarding | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingOnboarding>;
    if (
      typeof value.userId !== "string" ||
      value.userId.length === 0 ||
      typeof value.needsOnboarding !== "boolean" ||
      typeof value.needsTerms !== "boolean" ||
      typeof value.signedUpWithGoogle !== "boolean"
    ) {
      return null;
    }
    if (!value.needsOnboarding && !value.needsTerms) return null;
    return value as PendingOnboarding;
  } catch {
    return null;
  }
}

// Only for the account it was saved for -- another account signing in on
// the same phone is unaffected.
export function pendingForUser(pending: PendingOnboarding | null, userId: string): PendingOnboarding | null {
  return pending && pending.userId === userId ? pending : null;
}

// The state after a step is done, or null once nothing is left.
export function completeOnboardingStep(
  pending: PendingOnboarding,
  step: OnboardingStep,
): PendingOnboarding | null {
  const next =
    step === "phone" ? { ...pending, needsOnboarding: false } : { ...pending, needsTerms: false };
  return next.needsOnboarding || next.needsTerms ? next : null;
}
