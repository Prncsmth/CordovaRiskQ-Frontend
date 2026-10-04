// services/passwordResetFlow.ts
// Screen-independent logic for forgot password (forgot-password.tsx) and
// reset password (reset-password.tsx), mirroring registrationFlow.ts:
// dependencies are injected so this is unit-tested directly, and the screens
// only hold UI state.
//
// Flow: forgot-password.tsx sends the email to /auth/forgot-password. The
// backend answers the same way whether or not an account exists (no account
// enumeration), so the app always moves on to the reset screen. There the
// user enters the 6-digit code plus a new password, which is sent to
// /auth/reset-password. Success does NOT log the user in -- they go back to
// Login and sign in with the new password.
import { isPasswordValid, PASSWORD_REQUIREMENTS_MESSAGE } from "@/utils/passwordPolicy";

import { OTP_LENGTH, RESEND_COOLDOWN_SECONDS } from "./registrationFlow";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const NETWORK_ERROR = "Network error. Check your connection and try again.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = new RegExp(`^\\d{${OTP_LENGTH}}$`);

export function validateForgotPasswordEmail(email: string): string | null {
  if (!email.trim()) return "Please enter your email address.";
  if (!EMAIL_PATTERN.test(email.trim())) return "Please enter a valid email address.";
  return null;
}

export type RequestResetDeps = {
  requestPasswordReset(email: string): Promise<{ message: string; resendCooldownSeconds?: number }>;
};

// Only what the reset screen needs: the email to show and the countdown.
export type RequestResetResult = { email: string; resendCooldownSeconds: number };

export async function requestResetCode(
  rawEmail: string,
  deps: RequestResetDeps,
): Promise<RequestResetResult> {
  const email = rawEmail.trim();
  const { resendCooldownSeconds } = await deps.requestPasswordReset(email);
  return { email, resendCooldownSeconds: resendCooldownSeconds || RESEND_COOLDOWN_SECONDS };
}

// Returns the new cooldown in seconds, or null when nothing was sent. The
// countdown is checked here so a fast double tap can't send twice; the
// backend enforces its own cooldown regardless.
export async function resendResetCode(
  email: string,
  state: { cooldownRemaining: number; inFlight: boolean },
  deps: RequestResetDeps,
): Promise<number | null> {
  if (state.cooldownRemaining > 0 || state.inFlight) return null;
  const { resendCooldownSeconds } = await deps.requestPasswordReset(email);
  return resendCooldownSeconds || RESEND_COOLDOWN_SECONDS;
}

export type PasswordResetInput = {
  code: string;
  newPassword: string;
  confirmPassword: string;
};

// Returns the message to show, or null when the input is valid. The backend
// re-validates regardless.
export function validatePasswordReset(input: PasswordResetInput): string | null {
  if (!input.code.trim() || !input.newPassword || !input.confirmPassword) {
    return "Please fill in all fields.";
  }
  if (!OTP_PATTERN.test(input.code.trim())) {
    return "Enter the 6-digit code.";
  }
  if (!isPasswordValid(input.newPassword)) {
    return PASSWORD_REQUIREMENTS_MESSAGE;
  }
  if (input.newPassword !== input.confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}

export type SubmitResetDeps = {
  resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }>;
};

export type SubmitResetResult =
  | { status: "invalid-input"; message: string }
  | { status: "reset" };

export async function submitPasswordReset(
  email: string,
  input: PasswordResetInput,
  deps: SubmitResetDeps,
): Promise<SubmitResetResult> {
  const validationError = validatePasswordReset(input);
  if (validationError) return { status: "invalid-input", message: validationError };

  // The backend is the authority: it checks the code and sets the new
  // password. Its errors are deliberately generic and propagate as-is.
  await deps.resetPassword(email, input.code.trim(), input.newPassword);
  return { status: "reset" };
}

// The backend's reset messages are already generic and user-facing
// ("Invalid or expired code. Request a new one."), so they are shown as-is;
// only fetch's raw offline error is replaced.
export function describePasswordResetError(err: unknown): string {
  if (err instanceof Error && err.message) {
    if (err.message === "Network request failed") return NETWORK_ERROR;
    return err.message;
  }
  return GENERIC_ERROR;
}
