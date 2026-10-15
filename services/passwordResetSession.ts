// services/passwordResetSession.ts
// Carries the verified reset code from reset-code.tsx to reset-password.tsx
// in memory only. Like every other auth screen, the code never travels in
// route params, which can end up in navigation state, logs or deep links.
// The code is still only usable once and only for a few minutes -- the
// backend checks it again when the new password is set.
let verified: { email: string; code: string } | null = null;

export function rememberVerifiedResetCode(email: string, code: string): void {
  verified = { email, code };
}

// Null when nothing was verified for this email (e.g. the app was restarted
// on the new-password screen), so that screen can send the user back.
export function getVerifiedResetCode(email: string): string | null {
  return verified && verified.email === email ? verified.code : null;
}

export function clearVerifiedResetCode(): void {
  verified = null;
}
