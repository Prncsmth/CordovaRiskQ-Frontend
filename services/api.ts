import Constants from "expo-constants";

function resolveApiBaseUrl(): string {
  // Expo Go / dev client exposes the packager's host (your PC's LAN IP) here.
  // This keeps working automatically even if your PC's IP changes, as long
  // as you're running via `expo start` and testing on the same network.
  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (debuggerHost) {
    const host = debuggerHost.split(":")[0];
    return `http://${host}:8000`;
  }

  // Fallback for web builds or production, where this detection doesn't apply.
  return "http://localhost:8000";
}

export const API_BASE_URL = resolveApiBaseUrl();

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Lets AuthContext force a logout when the backend rejects a stored token --
// this module is plain (not a component/hook), so it can't call useAuth()
// itself. AuthProvider registers the handler on mount.
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

async function extractErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(text) as { message?: string };
    if (typeof parsed.message === "string" && parsed.message.length > 0) {
      return parsed.message;
    }
  } catch {
    // Response body wasn't JSON — fall through to a generic message.
  }
  return `Request failed with status ${response.status}`;
}

// A 401 on a request that carried a token means the stored session is
// invalid/expired -- distinct from a 401 on an unauthenticated endpoint
// (e.g. wrong password on login), which never passes a token and so never
// triggers this.
async function handleErrorResponse(
  response: Response,
  token?: string,
): Promise<never> {
  const message = await extractErrorMessage(response);
  if (response.status === 401 && token) {
    onUnauthorized?.();
  }
  throw new Error(message);
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    await handleErrorResponse(response, token);
  }

  return response.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await handleErrorResponse(response, token);
  }

  return response.json() as Promise<T>;
}

export async function apiPut<T>(
  path: string,
  body: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await handleErrorResponse(response, token);
  }

  return response.json() as Promise<T>;
}

export async function apiPatch<T>(
  path: string,
  body: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await handleErrorResponse(response, token);
  }

  return response.json() as Promise<T>;
}
