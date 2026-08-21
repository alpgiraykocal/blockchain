/** Shared SWR fetcher. Turns the API's `{ error, detail }` envelope into a
 *  thrown Error carrying a message the UI can show verbatim. */
export async function jsonFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.detail && payload?.error
        ? `${payload.error} — ${payload.detail}`
        : (payload?.error ?? `Request failed with status ${response.status}`);
    throw new Error(message);
  }
  return payload as T;
}
