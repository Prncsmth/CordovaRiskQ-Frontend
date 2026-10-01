// services/registrationFlow.ts
// Screen-independent logic for registration (register.tsx) and 6-digit code
// verification (verify-email.tsx). Dependencies are injected so this is
// unit-tested directly -- the screens only hold UI state and wire in the
// real services + AuthContext.login.
//
// Flow: register.tsx sends name/email/password to request-otp; the backend
// hashes the password, emails a 6-digit CORDOVA RISKQ code and stores both.
// verify-email.tsx sends { email, code } to verify-otp, which creates the
// account and returns our JWT for AuthContext.login. Resending needs only
// the email. The password never leaves register.tsx except in that one
// request -- it is never put in route params or kept for resending.
import type { RegisterResponse } from "./auth.service";
import { isPasswordValid, PASSWORD_REQUIREMENTS_MESSAGE } from "@/utils/passwordPolicy";

export const RESEND_COOLDOWN_SECONDS = 60;
export const OTP_LENGTH = 6;

const GENERIC_ERROR = "Something went wrong. Please try again.";
const NETWORK_ERROR = "Network error. Check your connection and try again.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = /^\d{6}$/;

export type RegistrationInput = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

// Returns the message to show, or null when the input is valid. The backend
// re-validates regardless.
export function validateRegistration(input: RegistrationInput): string | null {
  if (!input.name.trim() || !input.email.trim() || !input.password || !input.confirmPassword) {
    return "Please fill in all fields.";
  }
  if (!EMAIL_PATTERN.test(input.email.trim())) {
    return "Please enter a valid email address.";
  }
  if (!isPasswordValid(input.password)) {
    return PASSWORD_REQUIREMENTS_MESSAGE;
  }
  if (input.password !== input.confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}

// Keeps only digits, capped at 6 -- for the code input's onChangeText.
export function sanitizeOtpInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export type RegistrationDeps = {
  requestRegistrationOtp(
    name: string,
    email: string,
    password: string,
  ): Promise<{ resendCooldownSeconds: number }>;
};

// Only what the verify screen displays: never the password or the code.
export type RegistrationResult = { email: string; resendCooldownSeconds: number };

export async function requestRegistration(
  input: RegistrationInput,
  deps: RegistrationDeps,
): Promise<RegistrationResult> {
  const email = input.email.trim();
  const { resendCooldownSeconds } = await deps.requestRegistrationOtp(
    input.name.trim(),
    email,
    input.password,
  );
  return { email, resendCooldownSeconds };
}

export type VerificationDeps = {
  verifyRegistrationOtp(email: string, code: string): Promise<RegisterResponse>;
  // AuthContext.login -- the existing JWT session entry point.
  login(token: string, user: RegisterResponse["user"], isNewUser: boolean): Promise<void>;
};

export type VerificationResult =
  | { status: "invalid-input"; message: string }
  | { status: "signed-in" };

export async function submitVerificationCode(
  email: string,
  rawCode: string,
  deps: VerificationDeps,
): Promise<VerificationResult> {
  const code = rawCode.trim();
  if (!OTP_PATTERN.test(code)) {
    return { status: "invalid-input", message: "Enter the 6-digit code." };
  }

  // The backend is the authority: it checks the code, then creates the
  // account and issues our JWT. Errors (wrong/expired code, too many
  // attempts) propagate and leave no session behind.
  const result = await deps.verifyRegistrationOtp(email, code);

  // A verified registration is always a brand-new account, which starts the
  // existing phone-number/Terms onboarding.
  await deps.login(result.token, result.user, result.isNewUser ?? true);
  return { status: "signed-in" };
}

export type ResendDeps = {
  resendRegistrationOtp(email: string): Promise<{ resendCooldownSeconds: number }>;
};

// Returns the new cooldown in seconds, or null when nothing was sent. The
// countdown is checked here too so a fast double tap can't send twice, but
// the backend enforces the real cooldown independently.
export async function resendVerificationCode(
  email: string,
  state: { cooldownRemaining: number; inFlight: boolean },
  deps: ResendDeps,
): Promise<number | null> {
  if (state.cooldownRemaining > 0 || state.inFlight) return null;
  const { resendCooldownSeconds } = await deps.resendRegistrationOtp(email);
  return resendCooldownSeconds;
}

function errorStatus(err: unknown): number | undefined {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

// True when the current code is dead (expired / too many attempts), so the
// screen should allow an immediate resend.
export function shouldAllowImmediateResend(err: unknown): boolean {
  const status = errorStatus(err);
  return status === 410 || status === 429;
}

// Keeps the app's existing convention of showing the Error's message -- the
// backend's registration messages ("Incorrect code", "Code has expired.
// Request a new one.", "Email already registered", ...) are already
// user-facing -- except for fetch's raw offline error.
export function describeRegistrationError(err: unknown): string {
  if (err instanceof Error && err.message) {
    if (err.message === "Network request failed") return NETWORK_ERROR;
    return err.message;
  }
  return GENERIC_ERROR;
}
