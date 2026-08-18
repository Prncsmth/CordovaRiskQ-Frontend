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

export type RegisterResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role?: "citizen" | "responder";
  };
};

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<RegisterResponse> {
  return apiPost<RegisterResponse>("/api/auth/register", {
    name,
    email,
    password,
  });
}

export async function requestPasswordReset(
  email: string,
): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>("/api/auth/forgot-password", { email });
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
