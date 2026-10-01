// Cliente API de la app móvil.
// En Expo, EXPO_PUBLIC_API_URL se define en .env (distinto valor en dev/prod).

import Constants from 'expo-constants';

import { clearToken, getToken, setToken } from '@/lib/auth/storage';

import type {
  ApiErrorBody,
  CreateMarkerInput,
  CreateOrUpdateReviewInput,
  CreateReportInput,
  LoginInput,
  LoginResponse,
  Marker,
  MarkerNearby,
  MarkerRouteParams,
  MarkerRoute,
  MarkerStats,
  MarkerWithReviews,
  NearbyMarkersParams,
  RegisterInput,
  RegisteredUser,
  ReviewUpsertResult,
  UpdateMarkerInput,
  UserProfile,
  VerifyEmailInput,
} from './types';

// En nativo (Expo Go / dev client), "localhost" apunta al propio
// dispositivo, nunca al ordenador donde corre el backend. Sin
// EXPO_PUBLIC_API_URL explícito (producción, o quien prefiera fijarlo a
// mano), se deriva la IP de LAN que el propio Metro ya está usando para
// servir el bundle (`Constants.expoConfig.hostUri`, formato
// "192.168.1.23:8081", solo presente en desarrollo vía @expo/cli) y se
// asume que el backend escuche en esa misma máquina, puerto 3000 (ver
// server/src/index.ts, que escucha en 0.0.0.0 precisamente para aceptar
// conexiones desde otros dispositivos de la LAN, no solo localhost).
function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:3000`;
  return 'http://localhost:3000';
}

const API_URL = resolveApiUrl();

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: ApiErrorBody
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Punto de enganche para reaccionar a un 401 desde cualquier parte de la
// app (p. ej. redirigir a /login) sin acoplar este cliente a Expo Router.
// La redirección en sí no se implementa aquí — ver CLAUDE.md → Pendiente.
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function extractErrorMessage(body: ApiErrorBody | undefined, status: number): string {
  if (!body) return `API error ${status}`;
  // Los errores de validación de Fastify/ajv traen el mensaje útil en
  // `message` ("body/latitude must be <= 90"); `error` ahí es genérico
  // ("Bad Request"). Los errores de negocio de nuestros handlers usan
  // `error` ("Credenciales inválidas", "Marcador no encontrado", ...).
  if (body.code === 'FST_ERR_VALIDATION' && body.message) return body.message;
  return body.error ?? body.message ?? `API error ${status}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    // Solo con body: Fastify rechaza (FST_ERR_CTP_EMPTY_JSON_BODY) un
    // Content-Type: application/json sin cuerpo — afecta a DELETE, que
    // nunca manda body en este cliente (deleteMarker, deleteAccount).
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // Los 401 de /auth/login y /auth/register son por credenciales inválidas
  // (esas dos rutas ni siquiera miran el header Authorization) — no
  // significan que el token de sesión guardado haya dejado de valer, así
  // que no disparan este mecanismo. Cualquier otro 401 (incluido
  // /auth/me, que SÍ es un endpoint protegido) indica un token rechazado
  // (expiró, o la cuenta se dio de baja).
  const isPublicAuthEndpoint = path === '/auth/login' || path === '/auth/register';
  if (res.status === 401 && !isPublicAuthEndpoint) {
    await clearToken();
    unauthorizedListeners.forEach((listener) => listener());
  }

  if (!res.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = await res.json();
    } catch {
      // cuerpo vacío o no-JSON: seguimos con el mensaje genérico
    }
    throw new ApiError(res.status, extractErrorMessage(body, res.status), body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  return query.toString();
}

export const api = {
  register: (input: RegisterInput) =>
    request<RegisteredUser>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  login: async (input: LoginInput) => {
    const result = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    await setToken(result.token);
    return result;
  },

  logout: () => clearToken(),

  verifyEmail: (input: VerifyEmailInput) =>
    request<void>('/auth/verify-email', { method: 'POST', body: JSON.stringify(input) }),

  resendVerification: () => request<void>('/auth/resend-verification', { method: 'POST' }),

  // Perfil completo a partir del token guardado — ver lib/auth/session.tsx.
  getMe: () => request<UserProfile>('/auth/me'),

  // Todos los marcadores, sin límite de radio — para pintar el mapa
  // completo. Distinto de getNearbyMarkers, que sigue limitado a un radio
  // y es lo único que alimenta el desplegable de "cercanos".
  getAllMarkers: () => request<Marker[]>('/markers'),

  getMyMarkers: () => request<Marker[]>('/markers/mine'),

  getMyStats: () => request<MarkerStats>('/users/me/stats'),

  getNearbyMarkers: ({ lat, lng, radius, limit, types, genders, minComodidad, minHigiene }: NearbyMarkersParams) =>
    request<MarkerNearby[]>(
      `/markers/nearby?${buildQuery({
        lat,
        lng,
        radius,
        limit,
        types: types && types.length > 0 ? types.join(',') : undefined,
        genders: genders && genders.length > 0 ? genders.join(',') : undefined,
        minComodidad,
        minHigiene,
      })}`
    ),

  getMarkerById: (id: string) => request<MarkerWithReviews>(`/markers/${id}`),

  // Ruta a pie desde la posición del usuario hasta el marcador — "Cómo
  // llegar" en marker/[id].tsx. Sin fallback si ORS no está disponible: el
  // backend devuelve 503 (ver ApiError), no un valor degradado.
  getMarkerRoute: ({ id, lat, lng }: MarkerRouteParams) =>
    request<MarkerRoute>(`/markers/${id}/route?${buildQuery({ lat, lng })}`),

  createMarker: (input: CreateMarkerInput) =>
    request<Marker>('/markers', { method: 'POST', body: JSON.stringify(input) }),

  updateMarker: (id: string, input: UpdateMarkerInput) =>
    request<Marker>(`/markers/${id}`, { method: 'PUT', body: JSON.stringify(input) }),

  deleteMarker: (id: string) => request<void>(`/markers/${id}`, { method: 'DELETE' }),

  createOrUpdateReview: (markerId: string, input: CreateOrUpdateReviewInput) =>
    request<ReviewUpsertResult>(`/markers/${markerId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // Borra la reseña propia del usuario autenticado en ese marcador —
  // identificada por authorId (del JWT) + markerId, nunca por un id de
  // reseña aparte (ver POST /markers/:id/reviews, mismo patrón).
  deleteReview: (markerId: string) => request<void>(`/markers/${markerId}/reviews`, { method: 'DELETE' }),

  deleteAccount: () => request<void>('/users/me', { method: 'DELETE' }),

  reportMarker: (id: string, input: CreateReportInput) =>
    request<{ message: string }>(`/markers/${id}/report`, { method: 'POST', body: JSON.stringify(input) }),

  reportReview: (markerId: string, reviewId: string, input: CreateReportInput) =>
    request<{ message: string }>(`/markers/${markerId}/reviews/${reviewId}/report`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  favoriteMarker: (id: string) => request<{ favorited: boolean }>(`/markers/${id}/favorite`, { method: 'POST' }),

  unfavoriteMarker: (id: string) => request<void>(`/markers/${id}/favorite`, { method: 'DELETE' }),

  getFavoriteMarkers: () => request<Marker[]>('/users/me/favorites'),
};

export type * from './types';
