// Tipos de request/response del backend — mantener en sincronía con
// server/src/routes/*.ts y server/prisma/schema.prisma. Las fechas viajan
// como string ISO 8601 (JSON no tiene tipo Date).

export type MarkerType = 'AIRE_LIBRE' | 'PUBLICO' | 'PRIVADO';
export type PriceType = 'GRATIS' | 'CONSUMICION' | 'PRECIO';
export type MarkerGender = 'MASCULINO' | 'FEMENINO' | 'MIXTO' | 'PIPICAN';
export type WheelchairAccess = 'COMPLETA' | 'PARCIAL' | 'NINGUNA';
export type Role = 'USER' | 'ADMIN';

// --- Auth ---------------------------------------------------------------

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  username: string;
  // Token de Cloudflare Turnstile — ausente si EXPO_PUBLIC_TURNSTILE_SITE_KEY
  // no está configurada (ver src/app/(auth)/register.tsx), el backend omite
  // la verificación en ese caso (ver server/src/lib/turnstile.ts).
  turnstileToken?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// Perfil completo del usuario — nunca incluye password. Misma forma para
// la respuesta de POST /auth/register y de GET /auth/me (ver
// lib/auth/session.tsx, que usa este último tanto al arrancar la app como
// tras login/registro, tratándolos como la misma fuente de verdad).
// `username` es `null` solo en cuentas creadas antes de que este campo
// existiera — el registro nuevo siempre lo exige.
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username: string | null;
  role: Role;
  createdAt: string;
  // Gatea crear marcadores/reseñas (nunca el login en sí) — ver
  // POST /auth/verify-email y POST /auth/resend-verification. Cuentas
  // creadas antes de esta funcionalidad son `true` de oficio.
  emailVerified: boolean;
}

export type RegisteredUser = UserProfile;

// POST /auth/login solo devuelve el token — el perfil se pide aparte con
// GET /auth/me (ver lib/auth/session.tsx).
export interface LoginResponse {
  token: string;
}

export interface VerifyEmailInput {
  token: string;
}

// --- Markers --------------------------------------------------------------

export interface Marker {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  type: MarkerType;
  priceType: PriceType | null;
  amount: number | null;
  // Obligatorio (columna NOT NULL desde la migración
  // 20260824190000_marker_gender_not_null) — ver el comentario de `gender`
  // en server/prisma/schema.prisma.
  gender: MarkerGender;
  // Data URL base64 (o `null` sin imagen) — ver Notas técnicas en CLAUDE.md
  // sobre por qué no es una URL de un bucket de almacenamiento real.
  imageUrl: string | null;
  // Texto libre (2026-08-30), `null` = sin especificar.
  openingHours: string | null;
  // `null` = sin especificar (a diferencia de gender, no es un cuarto valor
  // del enum) — ver MarkerWheelchairField.
  wheelchairAccess: WheelchairAccess | null;
  ownerId: string;
  createdAt: string;
}

// Fila de GET /markers/nearby — incluye distance_m, no incluye reviews.
export interface MarkerNearby {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  type: MarkerType;
  priceType: PriceType | null;
  amount: number | null;
  gender: MarkerGender;
  imageUrl: string | null;
  ownerId: string;
  createdAt: string;
  distance_m: number;
}

export interface NearbyMarkersParams {
  lat: number;
  lng: number;
  // Metros. Ausente = sin límite de distancia (ver GET /markers/nearby) —
  // el fetch automático de "cercanos" pasa 5000 explícito, el botón
  // "Buscar" del mapa lo omite salvo que el usuario fije una distancia en
  // Ajustes.
  radius?: number;
  limit?: number;
  types?: MarkerType[];
  genders?: MarkerGender[];
  minComodidad?: number;
  minHigiene?: number;
}

export interface CreateMarkerInput {
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  type: MarkerType;
  priceType?: PriceType | null;
  amount?: number | null;
  gender: MarkerGender;
  imageUrl?: string | null;
  openingHours?: string | null;
  wheelchairAccess?: WheelchairAccess | null;
}

// Todos los campos opcionales — edición parcial (PUT /markers/:id).
export interface UpdateMarkerInput {
  title?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  type?: MarkerType;
  priceType?: PriceType | null;
  amount?: number | null;
  gender?: MarkerGender;
  imageUrl?: string | null;
  openingHours?: string | null;
  wheelchairAccess?: WheelchairAccess | null;
}

// Resumen para la pantalla de Perfil — no reseñas que el usuario haya
// escrito, sino las que ha recibido en sus propios marcadores. Los avg son
// `null` (no 0) si todavía no hay ninguna reseña.
export interface MarkerStats {
  markerCount: number;
  reviewCount: number;
  avgComodidad: number | null;
  avgHigiene: number | null;
}

// --- Reviews ----------------------------------------------------------

export interface ReviewAuthor {
  id: string;
  // "Usuario eliminado" si el autor se dio de baja (isActive: false).
  name: string;
}

// Reseña tal como aparece embebida en GET /markers/:id (con autor).
export interface Review {
  id: string;
  comodidad: number;
  higiene: number;
  text: string | null;
  createdAt: string;
  updatedAt: string;
  author: ReviewAuthor;
}

export interface MarkerWithReviews extends Marker {
  reviews: Review[];
}

export interface CreateOrUpdateReviewInput {
  comodidad: number;
  higiene: number;
  text?: string;
}

// Respuesta de POST /markers/:id/reviews — no incluye el autor embebido
// (eso solo lo añade GET /markers/:id).
export interface ReviewUpsertResult {
  id: string;
  comodidad: number;
  higiene: number;
  text: string | null;
  authorId: string;
  markerId: string;
  createdAt: string;
  updatedAt: string;
}

// --- Reportes ---------------------------------------------------------

export type ReportReason = 'SITIO_CERRADO' | 'INFORMACION_INCORRECTA' | 'CONTENIDO_INAPROPIADO' | 'OTRO';

export interface CreateReportInput {
  reason: ReportReason;
  details?: string;
}

// --- Rutas ----------------------------------------------------------------

export interface MarkerRouteParams {
  id: string;
  lat: number;
  lng: number;
}

// Respuesta de GET /markers/:id/route ("Cómo llegar") — distancia/tiempo a
// pie reales + la geometría completa de la ruta, ya en el formato
// {latitude,longitude} de esta app (el backend convierte desde el
// [lng,lat] de ORS/GeoJSON, ver server/src/lib/ors.ts).
export interface MarkerRoute {
  distanceM: number;
  durationS: number;
  coordinates: { latitude: number; longitude: number }[];
}

// --- Errores ------------------------------------------------------------

// Cuerpo de error tal como lo devuelve el backend: o bien un error de
// negocio (`{ error }`, ver server/src/routes/*.ts) o un error de
// validación de Fastify/ajv (`{ statusCode, code, error, message }`, donde
// el mensaje útil está en `message`, no en `error`).
export interface ApiErrorBody {
  error?: string;
  message?: string;
  statusCode?: number;
  code?: string;
}
