import type { ZodType } from "zod";
import type { ApiFailure, ApiSuccess } from "@shared/types/api";

const BASE_URL = import.meta.env.VITE_API_URL;

export type ApiMeta = NonNullable<ApiSuccess<unknown>["meta"]>;

export type ApiResult<T> = {
  data: T;
  meta?: ApiMeta;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type QueryValue = string | number | boolean | null | undefined;

type RequestOptions<T> = {
  query?: Record<string, QueryValue>;
  schema?: ZodType<T>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(path, BASE_URL);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function isEnvelope(value: unknown): value is ApiSuccess<unknown> | ApiFailure {
  if (typeof value !== "object" || value === null || !("success" in value)) return false;

  if (value.success === true) return "data" in value;

  if (value.success === false) {
    return (
      "error" in value &&
      typeof value.error === "object" &&
      value.error !== null &&
      "code" in value.error &&
      "message" in value.error
    );
  }

  return false;
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body: unknown,
  { query, schema, signal, headers }: RequestOptions<T> = {},
): Promise<ApiResult<T>> {
  let res: Response;

  try {
    res = await fetch(buildUrl(path, query), {
      method,
      credentials: "include",
      signal,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError(0, "NETWORK_ERROR", "Can't reach the server. Check your connection and try again.");
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, "INVALID_RESPONSE", `Unexpected response from the server (HTTP ${res.status}).`);
  }

  if (!isEnvelope(json)) {
    throw new ApiError(res.status, "INVALID_RESPONSE", `Unexpected response from the server (HTTP ${res.status}).`);
  }

  if (!json.success) {
    throw new ApiError(res.status, json.error.code, json.error.message);
  }

  if (!schema) {
    return { data: json.data as T, meta: json.meta };
  }

  const parsed = schema.safeParse(json.data);
  if (!parsed.success) {
    console.error(`[api] ${method} ${path} returned data that failed validation`, parsed.error.issues);
    throw new ApiError(res.status, "INVALID_RESPONSE", "The server sent data in an unexpected shape.");
  }

  return { data: parsed.data, meta: json.meta };
}

export const api = {
  get: <T>(path: string, options?: RequestOptions<T>) => request<T>("GET", path, undefined, options),
  post: <T>(path: string, body: unknown, options?: RequestOptions<T>) => request<T>("POST", path, body, options),
  put: <T>(path: string, body: unknown, options?: RequestOptions<T>) => request<T>("PUT", path, body, options),
  patch: <T>(path: string, body: unknown, options?: RequestOptions<T>) => request<T>("PATCH", path, body, options),
  delete: <T>(path: string, options?: RequestOptions<T>) => request<T>("DELETE", path, undefined, options),
};
