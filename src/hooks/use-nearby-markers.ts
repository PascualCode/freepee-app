import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api, ApiError } from '@/lib/api/client';
import type { Marker, MarkerNearby } from '@/lib/api/client';
import type { MarkerSearchFilters } from '@/utils/marker-search-filters';

export type NearbyMarkersState =
  | 'requesting-permission'
  | 'loading'
  | 'ready'
  | 'permission-denied'
  | 'error';

export type SearchState = 'idle' | 'loading' | 'ready' | 'error';

// Radio del fetch automático de "cercanos" (desplegable + pill "Ver X
// cercanos") — antes era el valor por defecto del propio backend; ahora que
// GET /markers/nearby trata un radius ausente como "sin límite" (para el
// botón "Buscar", ver search() más abajo), este fetch lo pasa explícito
// para no cambiar su comportamiento de siempre.
const DEFAULT_NEARBY_RADIUS_M = 5000;

export interface NearbyMarkersResult {
  state: NearbyMarkersState;
  errorMessage: string | null;
  coords: { latitude: number; longitude: number } | null;
  // Todos los marcadores que existen, sin límite de radio — para pintar el
  // mapa. Se cargan aparte, sin depender del permiso de ubicación: el mapa
  // debe mostrarlos siempre, incluso si el usuario deniega el GPS.
  allMarkers: Marker[];
  // Solo los que caen dentro de DEFAULT_NEARBY_RADIUS_M — alimentan
  // únicamente el desplegable automático de "cercanos" y su pill "Ver X
  // cercanos", nunca el mapa. Distinto de searchResults (ver más abajo).
  nearbyMarkers: MarkerNearby[];
  // Repite el flujo de permiso + posición + fetch (y recarga allMarkers) —
  // usado tras crear un marcador nuevo para que aparezca sin recargar la
  // pantalla. Pedir permiso de nuevo cuando ya está concedido es
  // instantáneo (el SO no vuelve a mostrar diálogo), así que no hace falta
  // separar esa lógica.
  refresh: () => void;
  // Permiso + posición NUEVA + recarga de "cercanos" — la única forma de que
  // `coords` cambie después del montaje, y por tanto la única que recentra
  // el mapa (ver initialRegion en nearby-markers-map.tsx). Botón "reubicarme".
  locate: () => void;
  // Búsqueda manual (botón "Buscar" del mapa): sin límite de distancia por
  // defecto, tope de 10 resultados, filtrable por tipo/género/puntuación
  // mínima vía los filtros de "Ajustes" — completamente independiente del
  // fetch automático de arriba (radio fijo, sin filtros).
  search: (filters: MarkerSearchFilters) => void;
  searchResults: MarkerNearby[];
  searchState: SearchState;
  searchErrorMessage: string | null;
}

const SEARCH_RESULTS_LIMIT = 10;

// Lógica de datos compartida entre /map (pública) y la Home autenticada de
// (tabs): todos los marcadores (para el mapa), permiso de ubicación,
// posición actual y marcadores cercanos (para el desplegable). El
// renderizado (mapa, modal, lista) vive en components/nearby-markers-map.tsx
// — cada pantalla decide ahí qué acciones extra mostrar sobre estos mismos
// datos, sin duplicar esta parte.
export function useNearbyMarkers(): NearbyMarkersResult {
  const [state, setState] = useState<NearbyMarkersState>('requesting-permission');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [allMarkers, setAllMarkers] = useState<Marker[]>([]);
  const [nearbyMarkers, setNearbyMarkers] = useState<MarkerNearby[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchResults, setSearchResults] = useState<MarkerNearby[]>([]);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [searchErrorMessage, setSearchErrorMessage] = useState<string | null>(null);

  // No usar setState tras un desmontaje (locate() puede seguir en vuelo si
  // el usuario navega fuera justo después de pulsar "reubicarme").
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  // Todos los marcadores, independiente del permiso de ubicación — el mapa
  // debe mostrarlos siempre, denegar el GPS solo afecta a poder buscar
  // "cercanos", no a qué existe en el mapa.
  useEffect(() => {
    let cancelled = false;

    api
      .getAllMarkers()
      .then((markers) => {
        if (!cancelled) setAllMarkers(markers);
      })
      .catch(() => {
        // Fallo silencioso: el mapa se queda sin marcadores hasta el
        // próximo refresh() en vez de bloquear el resto de la pantalla —
        // el estado `error`/`errorMessage` de aquí abajo ya cubre el caso
        // más importante (ubicación), no hace falta duplicar un aviso.
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Recarga "cercanos" con una posición YA conocida — nunca pide permiso ni
  // una posición nueva, así que nunca toca `coords` ni recentra el mapa
  // (ver initialRegion en nearby-markers-map.tsx, reactivo a `coords`).
  // Fallo silencioso, igual que allMarkers: la lista se queda como estaba.
  const reloadNearbyAt = useCallback(async (latitude: number, longitude: number) => {
    try {
      const nearby = await api.getNearbyMarkers({ lat: latitude, lng: longitude, radius: DEFAULT_NEARBY_RADIUS_M });
      if (mountedRef.current) setNearbyMarkers(nearby);
    } catch {
      // Ver comentario de arriba.
    }
  }, []);

  // Permiso + posición NUEVA + recarga de "cercanos" — se ejecuta al montar
  // y cada vez que el usuario pulsa "reubicarme" (única otra forma de
  // cambiar `coords`, ver el comentario de esa prop más arriba). Separado a
  // propósito de refresh(): antes ambos compartían el mismo `reloadKey`, así
  // que CUALQUIER refresh —incluido el automático al volver a esta pantalla
  // (useFocusEffect en (tabs)/index.tsx)— repetía la petición de posición y
  // recentraba el mapa de golpe, molesto si el usuario estaba navegando por
  // su cuenta. Ver CLAUDE.md → Pendiente.
  const locate = useCallback(async () => {
    setState('requesting-permission');
    setErrorMessage(null);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (!mountedRef.current) return;

    // Denegar el permiso no debe romper la pantalla — se sigue mostrando
    // el mapa (con todos los marcadores, ver el efecto de arriba), sin
    // centrar en el usuario ni poder buscar cercanos, con un aviso claro.
    if (status !== 'granted') {
      setState('permission-denied');
      return;
    }

    setState('loading');

    // Separado en dos try/catch: obtener la posición (fallo real de
    // ubicación/GPS) y pedir los cercanos al backend (fallo de red/API)
    // son errores de naturaleza distinta — antes compartían un único
    // mensaje genérico ("No se pudo obtener tu ubicación"), que en la
    // práctica ocultaba un fallo de conexión con el backend (p. ej. la
    // API no era alcanzable desde el dispositivo) detrás de un texto que
    // hacía pensar que el GPS era el problema.
    let position: Location.LocationObject;
    try {
      // Sin `accuracy` explícito, expo-location puede resolver por una
      // fuente de baja precisión (ver el bug ya diagnosticado en CLAUDE.md
      // → Notas técnicas), desviándose varios kilómetros de la posición
      // real. `High` pide la mejor precisión disponible.
      position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    } catch {
      if (!mountedRef.current) return;
      setErrorMessage('No se pudo obtener tu ubicación');
      setState('error');
      return;
    }
    if (!mountedRef.current) return;
    const { latitude, longitude } = position.coords;
    setCoords({ latitude, longitude });

    try {
      const nearby = await api.getNearbyMarkers({ lat: latitude, lng: longitude, radius: DEFAULT_NEARBY_RADIUS_M });
      if (!mountedRef.current) return;
      setNearbyMarkers(nearby);
      setState('ready');
    } catch (error) {
      if (!mountedRef.current) return;
      setErrorMessage(
        error instanceof ApiError ? error.message : 'No se pudo conectar con el servidor. Comprueba tu conexión.'
      );
      setState('error');
    }
  }, []);

  useEffect(() => {
    locate();
    // Solo al montar — locate() es estable (useCallback sin deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(() => {
    setReloadKey((key) => key + 1);
    // Con posición ya conocida, refresca también "cercanos" (p. ej. tras
    // crear un marcador, o al volver de "Mis marcadores" con cambios) sin
    // pedir una posición nueva ni recentrar el mapa.
    if (coords) reloadNearbyAt(coords.latitude, coords.longitude);
  }, [coords, reloadNearbyAt]);

  const search = useCallback(
    (filters: MarkerSearchFilters) => {
      if (!coords) return;
      setSearchState('loading');
      setSearchErrorMessage(null);
      api
        .getNearbyMarkers({
          lat: coords.latitude,
          lng: coords.longitude,
          radius: filters.radiusKm != null ? filters.radiusKm * 1000 : undefined,
          limit: SEARCH_RESULTS_LIMIT,
          types: filters.types,
          genders: filters.genders,
          minComodidad: filters.minComodidad ?? undefined,
          minHigiene: filters.minHigiene ?? undefined,
        })
        .then((results) => {
          setSearchResults(results);
          setSearchState('ready');
        })
        .catch((err) => {
          setSearchErrorMessage(err instanceof ApiError ? err.message : 'No se pudo completar la búsqueda');
          setSearchState('error');
        });
    },
    [coords]
  );

  return {
    state,
    errorMessage,
    coords,
    allMarkers,
    nearbyMarkers,
    refresh,
    locate,
    search,
    searchResults,
    searchState,
    searchErrorMessage,
  };
}
