import type { MarkerGender, MarkerType } from '@/lib/api/client';

// Filtros configurables desde "Ajustes" en el sidebar (ver
// search-filters-panel.tsx) y consumidos por el botón "Buscar" del mapa
// (ver nearby-markers-map.tsx) — viven levantados en NearbyMarkersMap para
// que ambos puedan leer/editar el mismo estado.
export interface MarkerSearchFilters {
  // En km; `null` = sin límite de distancia.
  radiusKm: number | null;
  // Vacío = todos los tipos/géneros, sin filtrar por ese campo.
  types: MarkerType[];
  genders: MarkerGender[];
  // 1-5; `null` = sin mínimo. Un marcador sin reseñas nunca cumple un
  // mínimo explícito (ver validación espejo en server/src/routes/markers.ts).
  minComodidad: number | null;
  minHigiene: number | null;
}

export const EMPTY_SEARCH_FILTERS: MarkerSearchFilters = {
  radiusKm: null,
  types: [],
  genders: [],
  minComodidad: null,
  minHigiene: null,
};

export function hasActiveFilters(filters: MarkerSearchFilters): boolean {
  return (
    filters.radiusKm != null ||
    filters.types.length > 0 ||
    filters.genders.length > 0 ||
    filters.minComodidad != null ||
    filters.minHigiene != null
  );
}
