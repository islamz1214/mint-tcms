const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ─── Lightweight GET cache ─────────────────────────────────────────────
// Solves the "refetch on every mount/navigation" problem (#3): GET responses
// are cached briefly so re-rendering or navigating doesn't repeat the same
// round-trip. Every mutation invalidates the cache, and each entry is keyed by
// both the path and the auth token so one user's data never leaks to another.
const GET_CACHE_TTL_MS = 30_000; // 30 seconds
const GET_CACHE_MAX_ENTRIES = 1000;

interface CacheEntry {
  value: unknown;
  expiresAt: number;
  generation: number;
}

const getCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
// Bumped on every successful mutation. Stale in-flight GETs check it before
// writing to the cache so they don't re-seed data that a mutation invalidated.
let cacheGeneration = 0;

function invalidateGetCache(): void {
  cacheGeneration += 1;
  getCache.clear();
}

function trimGetCache(): void {
  if (getCache.size > GET_CACHE_MAX_ENTRIES) {
    getCache.clear();
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: Record<string, unknown>,
  ) {
    super(`${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function parseBody(res: Response): Promise<unknown> {
  // Handle empty body (204 No Content or 0-length responses)
  const text = await res.text();
  if (!text) return undefined;
  return JSON.parse(text);
}

async function performFetch(
  path: string,
  options: RequestInit,
  token: string | null,
): Promise<unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let body: Record<string, unknown> | undefined;
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      // no json body
    }
    throw new ApiError(res.status, res.statusText, body);
  }

  return parseBody(res);
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const method = (options.method ?? 'GET').toUpperCase();
  const isGet = method === 'GET';
  const cacheKey = `${method}:${path}:${token ?? ''}`;

  if (isGet) {
    const existing = getCache.get(cacheKey);
    if (existing && existing.expiresAt > Date.now()) {
      return existing.value as T;
    }

    const pending = inflight.get(cacheKey);
    if (pending) return pending as Promise<T>;

    const generationAtStart = cacheGeneration;
    const request = performFetch(path, options, token)
      .then((value) => {
        if (generationAtStart === cacheGeneration) {
          getCache.set(cacheKey, {
            value,
            expiresAt: Date.now() + GET_CACHE_TTL_MS,
            generation: generationAtStart,
          });
          trimGetCache();
        }
        return value;
      })
      .finally(() => {
        inflight.delete(cacheKey);
      });

    inflight.set(cacheKey, request);
    return request as Promise<T>;
  }

  // Mutation (POST/PATCH/DELETE/PUT): perform it, then drop cached reads so
  // the next GET reflects the change.
  const result = await performFetch(path, options, token);
  invalidateGetCache();
  return result as T;
}

// ─── Convenience methods ────────────────────────────
export const get = <T>(path: string) => api<T>(path);

export const post = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) });

export async function upload<T>(path: string, body: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    body,
    headers,
  });

  if (!res.ok) {
    let bodyData: Record<string, unknown> | undefined;
    try {
      bodyData = (await res.json()) as Record<string, unknown>;
    } catch {
      // no json body
    }
    throw new ApiError(res.status, res.statusText, bodyData);
  }

  const text = await res.text();
  if (!text) return undefined as T;

  // A successful mutation just happened outside of `api`, so keep the cache in
  // sync with the server too.
  invalidateGetCache();
  return JSON.parse(text);
}

export async function download(path: string): Promise<{ blob: Blob; filename: string | null }> {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    let bodyData: Record<string, unknown> | undefined;
    try {
      bodyData = (await res.json()) as Record<string, unknown>;
    } catch {
      // no json body
    }
    throw new ApiError(res.status, res.statusText, bodyData);
  }

  const disposition = res.headers.get('content-disposition');
  const filenameMatch = disposition?.match(/filename="?([^";]+)"?/i);
  return {
    blob: await res.blob(),
    filename: filenameMatch?.[1] ?? null,
  };
}

export const patch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export const del = <T = void>(path: string) =>
  api<T>(path, { method: 'DELETE' });
