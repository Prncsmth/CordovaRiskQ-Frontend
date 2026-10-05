// utils/signupFinish.ts
// What "I Agree & Continue" on Terms does at the end of sign-up.
//
// - Email/password sign-up: log out to Registration Complete, then Login --
//   the user signs in once with the password they just created.
// - Google sign-up: Google has already verified who they are and there is
//   no password to practise, so they stay signed in and go straight to
//   Home, where the first-time app guide starts (isFreshAccount).
export type SignupFinish = "stay-signed-in" | "log-out-to-login";

export function signupFinishAction(signedUpWithGoogle: boolean): SignupFinish {
  return signedUpWithGoogle ? "stay-signed-in" : "log-out-to-login";
}

// Only a brand-new account created through Google counts -- an existing
// Google user signing in again never goes through Phone/Terms at all.
export function isGoogleSignup(isNewAccount: boolean, viaGoogle: boolean | undefined): boolean {
  return isNewAccount && viaGoogle === true;
}
