import { apiPost } from "./api";

export type LoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
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