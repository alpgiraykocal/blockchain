export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
  accept?: "json" | "text";
}

/** Fetch JSON from a public block explorer with a timeout and one bounded retry.
 *  429 and 5xx are retried with a short backoff; 4xx fail immediately. */
export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { timeoutMs = 12_000, retries = 1, accept = "json" } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { accept: "application/json", "user-agent": "BlockchainAnalysis/0.1" },
        cache: "no-store",
      });

      if (!response.ok) {
        const retriable = response.status === 429 || response.status >= 500;
        const error = new UpstreamError(
          `Upstream responded ${response.status}`,
          response.status,
          url,
        );
        if (!retriable || attempt === retries) throw error;
        lastError = error;
      } else {
        const text = await response.text();
        if (accept === "text") return text as unknown as T;
        return (text ? JSON.parse(text) : null) as T;
      }
    } catch (error) {
      lastError =
        error instanceof Error && error.name === "AbortError"
          ? new UpstreamError(
              `Upstream did not respond within ${timeoutMs / 1000}s`,
              504,
              url,
            )
          : error;
      if (error instanceof UpstreamError && error.status < 500 && error.status !== 429) {
        throw error;
      }
      if (attempt === retries) break;
    } finally {
      clearTimeout(timer);
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }

  if (lastError instanceof Error) throw lastError;
  throw new UpstreamError("Upstream request failed", 502, url);
}
