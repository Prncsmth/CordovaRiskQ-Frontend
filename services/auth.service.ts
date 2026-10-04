import { apiPost } from "./api";

export type LoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role?: "citizen" | "responder";
  };
};

export async function loginUser(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/api/auth/login", { email, password });
}

// verify-otp's response: the newly created account plus our JWT. isNewUser
// drives the phone-number/Terms onboarding.
export type RegisterResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role?: "citizen" | "responder";
  };
  isNewUser: boolean;
};

// Registration always goes through the emailed 6-digit code. The backend
// hashes the password and stores it with the pending registration; the code
// is only ever in the email, never in a response.
export async function requestRegistrationOtp(
  name: string,
  email: string,
  password: string,
): Promise<{ resendCooldownSeconds: number }> {
  const result = await apiPost<{ resendCooldownSeconds: number }>(
    "/api/auth/register/request-otp",
    { name, email, password },
  );
  return { resendCooldownSeconds: result.resendCooldownSeconds };
}

// Email only -- the backend reuses the password hash it already stored, so
// the app never has to keep the password around to resend.
export async function resendRegistrationOtp(
  email: string,
): Promise<{ resendCooldownSeconds: number }> {
  const result = await apiPost<{ resendCooldownSeconds: number }>(
    "/api/auth/register/resend-otp",
    { email },
  );
  return { resendCooldownSeconds: result.resendCooldownSeconds };
}

export async function verifyRegistrationOtp(
  email: string,
  code: string,
): Promise<RegisterResponse> {
  return apiPost<RegisterResponse>("/api/auth/register/verify-otp", { email, code });
}

// The backend answers identically whether or not the email has an account
// (no account enumeration) and only emails a code to eligible accounts.
export async function requestPasswordReset(
  email: string,
): Promise<{ message: string; resendCooldownSeconds: number }> {
  const result = await apiPost<{ message: string; resendCooldownSeconds: number }>(
    "/api/auth/forgot-password",
    { email },
  );
  return { message: result.message, resendCooldownSeconds: result.resendCooldownSeconds };
}

// Sets the new password if the 6-digit code is valid. Does not log in --
// the user signs in with the new password afterwards.
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ message: string }> {
  const result = await apiPost<{ message: string }>("/api/auth/reset-password", {
    email,
    code,
    newPassword,
  });
  return { message: result.message };
}

export type GoogleAuthResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role?: "citizen" | "responder";
  };
  isNewUser: boolean;
};

export async function googleAuth(
  idToken: string,
): Promise<GoogleAuthResponse> {
  return apiPost<GoogleAuthResponse>("/api/auth/google", { idToken });
}
