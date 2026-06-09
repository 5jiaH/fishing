/** Thrown when `fetch` cannot complete (DNS, TCP, TLS, invalid URL, etc.). Real reason is usually `cause`. */
export class FetchNetworkError extends Error {
  readonly url: string;
  constructor(url: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'FetchNetworkError';
    this.url = url;
    Object.setPrototypeOf(this, FetchNetworkError.prototype);
  }
}

/** Thrown when the HTTP status is not ok or the body is not valid JSON. */
export class BaseRequestError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: string;

  constructor(
    status: number,
    statusText: string,
    body: string,
    message?: string,
  ) {
    super(message ?? `HTTP ${status} ${statusText}`);
    this.name = 'BaseRequestError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    Object.setPrototypeOf(this, BaseRequestError.prototype);
  }
}

function mergeHeaders(
  a?: HeadersInit,
  b?: HeadersInit,
): HeadersInit | undefined {
  if (a === undefined && b === undefined) return undefined;
  const out = new Headers(a);
  if (b !== undefined) {
    new Headers(b).forEach((value, key) => {
      out.set(key, value);
    });
  }
  return out;
}

function mergeRequestInit(
  base: RequestInit,
  override?: RequestInit,
): RequestInit {
  if (!override) return { ...base };
  const { headers: overrideHeaders, ...restOverride } = override;
  const merged: RequestInit = { ...base, ...restOverride };
  if (base.headers !== undefined || overrideHeaders !== undefined) {
    merged.headers = mergeHeaders(base.headers, overrideHeaders);
  }
  return merged;
}

/** Join base URL and path without duplicating slashes; absolute `url` is left as-is. */
function joinBaseUrl(baseUrl: string, url: string): string {
  const path = url.trim();
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = baseUrl.trim();
  if (!base) {
    return path;
  }
  if (!path) {
    return base.replace(/\/+$/, '') || base;
  }
  const b = base.replace(/\/+$/, '');
  const p = path.replace(/^\/+/, '');
  return `${b}/${p}`;
}

async function readJsonOrThrow(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!res.ok) {
    throw new BaseRequestError(res.status, res.statusText, text);
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new BaseRequestError(
      res.status,
      res.statusText,
      text,
      `Response is not valid JSON (HTTP ${res.status})`,
    );
  }
}

export function baseRequest<T = unknown>(
  baseUrl: string = '',
  baseInit: RequestInit = {},
): (url: string, init?: RequestInit) => Promise<T> {
  return async (url: string, init?: RequestInit) => {
    const resolved = joinBaseUrl(baseUrl, url);
    let res: Response;
    try {
      res = await fetch(resolved, mergeRequestInit(baseInit, init));
    } catch (e) {
      const hint =
        e instanceof Error && e.cause instanceof Error
          ? ` (${e.cause.name}: ${e.cause.message})`
          : e instanceof Error && e.message
            ? ` (${e.message})`
            : '';
      throw new FetchNetworkError(
        resolved,
        `fetch failed for ${resolved}${hint}`,
        { cause: e },
      );
    }
    return (await readJsonOrThrow(res)) as T;
  };
}
