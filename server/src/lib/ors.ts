// Distancia/tiempo/ruta a pie reales vía OpenRouteService (basado en OSM,
// mismo origen de datos que MapLibre — ver CLAUDE.md → Pendiente). fetch
// plano, sin SDK, mismo criterio que turnstile.ts/email.ts. Sin
// ORS_API_KEY configurada, ninguna de las dos funciones rompe nada: avisan
// por log y devuelven `null` para que quien llama haga el fallback
// correspondiente (línea recta en /nearby, 503 explícito en /:id/route).
const ORS_MATRIX_URL = "https://api.openrouteservice.org/v2/matrix/foot-walking";
const ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/foot-walking";

interface LatLng {
  lat: number;
  lng: number;
}

interface WalkingDistance {
  distanceM: number;
  durationS: number;
}

interface ORSMatrixResponse {
  distances: (number | null)[][];
  durations: (number | null)[][];
}

// Un origen (el usuario) y varios destinos (candidatos a marcador) de golpe
// — una sola llamada a la API en vez de una por marcador, ver CLAUDE.md.
// `null` en una posición del array = ORS no encontró ruta hasta ese destino
// concreto (p. ej. desconectado de la red peatonal); `null` la función
// entera = la llamada falló del todo (sin key, red, error HTTP).
export async function getWalkingDistances(
  origin: LatLng,
  destinations: LatLng[]
): Promise<(WalkingDistance | null)[] | null> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    console.warn("[ors] ORS_API_KEY no configurada — distancia real omitida, se usa línea recta");
    return null;
  }
  if (destinations.length === 0) return [];

  try {
    const locations = [[origin.lng, origin.lat], ...destinations.map((d) => [d.lng, d.lat])];
    const res = await fetch(ORS_MATRIX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({
        locations,
        sources: [0],
        destinations: destinations.map((_, i) => i + 1),
        metrics: ["distance", "duration"],
      }),
    });

    if (!res.ok) {
      console.warn(`[ors] matrix respondió ${res.status} — distancia real omitida, se usa línea recta`);
      return null;
    }

    const data = (await res.json()) as ORSMatrixResponse;
    const distances = data.distances[0];
    const durations = data.durations[0];

    return destinations.map((_, i) => {
      const distanceM = distances[i];
      const durationS = durations[i];
      if (distanceM == null || durationS == null) return null;
      return { distanceM, durationS };
    });
  } catch (err) {
    console.warn("[ors] matrix falló — distancia real omitida, se usa línea recta:", err);
    return null;
  }
}

export interface WalkingRoute extends WalkingDistance {
  coordinates: { latitude: number; longitude: number }[];
}

interface ORSDirectionsResponse {
  features: {
    geometry: { coordinates: [number, number][] };
    properties: { segments: { distance: number; duration: number }[] };
  }[];
}

// Un solo punto a otro, con la geometría completa de la ruta — para dibujarla
// en el mapa (ver "Cómo llegar" en marker/[id].tsx). A diferencia de
// getWalkingDistances, aquí no hay un fallback razonable (no existe "línea
// recta dibujada" que tenga sentido como ruta a pie) — `null` siempre se
// traduce en un 503 explícito en el endpoint que la usa.
export async function getWalkingRoute(from: LatLng, to: LatLng): Promise<WalkingRoute | null> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    console.warn("[ors] ORS_API_KEY no configurada — no se puede calcular la ruta");
    return null;
  }

  try {
    const url = `${ORS_DIRECTIONS_URL}?api_key=${encodeURIComponent(apiKey)}&start=${from.lng},${from.lat}&end=${to.lng},${to.lat}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.warn(`[ors] directions respondió ${res.status} — no se pudo calcular la ruta`);
      return null;
    }

    const data = (await res.json()) as ORSDirectionsResponse;
    const feature = data.features[0];
    const segment = feature?.properties.segments[0];
    if (!feature || !segment) return null;

    // ORS/GeoJSON usa [lng, lat] — convertido a {latitude, longitude} aquí,
    // en el borde, mismo criterio ya aplicado a LngLat en lib/maps/map-view.tsx.
    return {
      distanceM: segment.distance,
      durationS: segment.duration,
      coordinates: feature.geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
    };
  } catch (err) {
    console.warn("[ors] directions falló — no se pudo calcular la ruta:", err);
    return null;
  }
}
