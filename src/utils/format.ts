import type { MarkerGender, MarkerType, PriceType, WheelchairAccess } from '@/lib/api/client';

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

const MARKER_TYPE_LABELS: Record<MarkerType, string> = {
  AIRE_LIBRE: 'Aire libre',
  PUBLICO: 'Público',
  PRIVADO: 'Privado',
};

export function formatMarkerType(type: MarkerType): string {
  return MARKER_TYPE_LABELS[type];
}

const PRICE_TYPE_LABELS: Record<Exclude<PriceType, 'PRECIO'>, string> = {
  GRATIS: 'Gratis',
  CONSUMICION: 'Con consumición',
};

export function formatPrice(priceType: PriceType | null, amount: number | null): string | null {
  if (!priceType) return null;
  if (priceType === 'PRECIO') {
    return amount != null ? `${amount.toFixed(2)} €` : 'De pago';
  }
  return PRICE_TYPE_LABELS[priceType];
}

// Etiquetas visibles — deliberadamente distintas del identificador interno
// del enum (MASCULINO/FEMENINO, sin cambios en Prisma/BD): renombrar el
// enum en sí habría exigido una migración y tocar validación/tipos en todo
// el repo por un cambio que es solo de rótulo. MIXTO/PIPICAN no cambiaron.
const MARKER_GENDER_LABELS: Record<MarkerGender, string> = {
  MASCULINO: 'De Pie',
  FEMENINO: 'Sentado',
  MIXTO: 'Mixto',
  PIPICAN: 'Pipicán',
};

export function formatMarkerGender(gender: MarkerGender): string {
  return MARKER_GENDER_LABELS[gender];
}

// Color asociado a cada género, reflejado tanto en el selector del
// formulario como en el pin del marcador en el mapa (ver lib/maps →
// MapMarkerData.color). `gender` es obligatorio desde la migración
// 20260824190000_marker_gender_not_null — ya no hace falta un color de
// fallback para marcadores sin género, todos tienen uno de estos cuatro.
const MARKER_GENDER_COLORS: Record<MarkerGender, string> = {
  // "De Pie"/"Sentado" piden un azul/rojo más intensos que antes —
  // MIXTO/PIPICAN no cambiaron.
  MASCULINO: '#1D4ED8',
  FEMENINO: '#DC2626',
  MIXTO: '#8B5CF6',
  PIPICAN: '#F7B500',
};

export function getMarkerGenderColor(gender: MarkerGender): string {
  return MARKER_GENDER_COLORS[gender];
}

// Semáforo tipo Wheelmap — colores propios (no theme.*), mismo criterio que
// MARKER_GENDER_COLORS: son un código de estado, no una superficie de la app.
const WHEELCHAIR_ACCESS_LABELS: Record<WheelchairAccess, string> = {
  COMPLETA: 'Accesible',
  PARCIAL: 'Parcialmente accesible',
  NINGUNA: 'No accesible',
};

const WHEELCHAIR_ACCESS_COLORS: Record<WheelchairAccess, string> = {
  COMPLETA: '#16A34A',
  PARCIAL: '#D97706',
  NINGUNA: '#DC2626',
};

export function formatWheelchairAccess(value: WheelchairAccess): string {
  return WHEELCHAIR_ACCESS_LABELS[value];
}

export function getWheelchairAccessColor(value: WheelchairAccess): string {
  return WHEELCHAIR_ACCESS_COLORS[value];
}
