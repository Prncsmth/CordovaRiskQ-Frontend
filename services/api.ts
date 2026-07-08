export const API_BASE_URL = "https://api.example.com";

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  return response.json() as Promise<T>;
}
