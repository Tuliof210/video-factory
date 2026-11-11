export function apiKey(name: string): string {
  const key = process.env[name];
  if (!key?.trim())
    throw new Error(`Missing ${name}. Configure the local .env file.`);
  return key;
}
export async function requestJson(
  url: string,
  init: RequestInit = {},
): Promise<unknown> {
  const hostname = new URL(url).hostname;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new Error(
      `API connection failed (${hostname}). Check network and provider status.`,
    );
  }
  if (!response.ok)
    throw new Error(
      `API request failed: HTTP ${response.status} (${hostname}). Check credentials, quota and provider status.`,
    );
  return response.json();
}
