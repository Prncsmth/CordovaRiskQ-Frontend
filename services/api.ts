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

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`GET ${path} failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `POST ${path} failed with status ${response.status}: ${errorText}`,
    );
  }

  return response.json() as Promise<T>;
}
