/**
 * Public API client for the Bar Exchange backend.
 *
 * The guest frontend talks ONLY to the backend public API. No direct database
 * access, no admin API keys, no secrets. The backend already filters
 * `isExchangeProduct === true && isActive === true` server-side, so the public
 * response only exposes `{ id, name, price, currency, previousPrice,
 * changePercent, isAvailable }` per product (no category / isExchangeProduct /
 * isActive / round type fields are leaked).
 *
 * Endpoints (verified against the live backend + backend source
 * `src/modules/public-api/public.routes.ts`):
 *   GET /api/v1/public/products        -> ProductsResponse
 *   GET /api/v1/public/rounds/current  -> CurrentRoundResponse
 *   GET /api/v1/public/rounds/next     -> NextRoundResponse
 *
 * Fetches are CORS-compatible: no credentials are sent (`credentials: "omit"`)
 * because the backend public endpoints do not require cookies/auth.
 */

const API_PREFIX = "/api/v1/public";

/**
 * Production API base URL. Configured via `VITE_API_URL` at build time
 * (Cloudflare Pages env var). Falls back to the local dev backend only.
 */
type ApiEnv = { [key: string]: string | undefined };

export function resolveApiUrl(env: ApiEnv): string {
  return env["VITE_API_URL"] ?? "http://localhost:3000";
}

export const API_URL: string = resolveApiUrl(import.meta.env as unknown as ApiEnv);

export type PublicProduct = {
  id: string;
  name: string;
  price: number;
  currency: string;
  previousPrice: number;
  changePercent: number;
  isAvailable: boolean;
};

export type CurrentRound = {
  id: string;
  roundKey: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

export type CurrentRoundStatus = "ok" | "no_published_round";

export type CurrentRoundResponse = {
  generatedAt: string;
  timezone: string;
  status: CurrentRoundStatus;
  currentRound: CurrentRound | null;
  products: PublicProduct[];
};

export type NextRoundResponse = {
  roundKey: string;
  startsAt: string;
  endsAt: string;
  countdownSeconds: number;
  intervalMinutes: number;
  timezone: string;
};

export type ProductsResponse = {
  generatedAt: string;
  timezone: string;
  products: PublicProduct[];
};

export class ApiError extends Error {
  readonly status: number;
  readonly endpoint: string;
  constructor(message: string, status: number, endpoint: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.endpoint = endpoint;
  }
}

function apiUrl(path: string): string {
  return `${API_URL}${API_PREFIX}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: "GET",
      // Public endpoints require no cookies/auth — keep the request
      // CORS-friendly by omitting credentials.
      credentials: "omit",
      headers: { accept: "application/json" },
      ...init,
    });
  } catch (cause) {
    // Network error / CORS rejection / DNS failure — surface a readable error.
    throw new ApiError(cause instanceof Error ? cause.message : "Сеть недоступна", 0, path);
  }

  if (!response.ok) {
    throw new ApiError(`Backend вернул ${response.status}`, response.status, path);
  }

  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new ApiError(
      cause instanceof Error ? cause.message : "Некорректный JSON",
      response.status,
      path,
    );
  }
}

/** Текущий опубликованный раунд + цены для экрана гостей. */
export function fetchCurrentRound(init?: RequestInit): Promise<CurrentRoundResponse> {
  return request<CurrentRoundResponse>("/rounds/current", init);
}

/** Время следующего 15-минутного раунда и countdown. */
export function fetchNextRound(init?: RequestInit): Promise<NextRoundResponse> {
  return request<NextRoundResponse>("/rounds/next", init);
}

/** Список биржевых товаров (без цен незакрытых раундов). */
export function fetchProducts(init?: RequestInit): Promise<ProductsResponse> {
  return request<ProductsResponse>("/products", init);
}
