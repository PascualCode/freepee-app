export interface MapMarkerData {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  // Color del pin — quien use MapView lo calcula (p. ej. según el género
  // del marcador, ver getMarkerGenderColor en utils/format.ts); lib/maps
  // no conoce ese dominio, solo pinta el color que le pasan, mismo patrón
  // que selectedLocationColor. Sin color, cada plataforma usa su icono por
  // defecto (marcadores creados antes de tener género, ver CLAUDE.md).
  color?: string;
  // Con imagen, el pin es un avatar circular con esa foto (borde del color
  // de arriba) en vez de la gota de color habitual — ver map-view.tsx.
  // `null`/ausente: gota de color, mismo pin de siempre.
  imageUrl?: string | null;
}

export interface SelectedLocation {
  latitude: number;
  longitude: number;
}

export interface MapViewProps {
  markers: MapMarkerData[];
  onMarkerPress?: (id: string) => void;
  // Región a la que centrar el mapa — reactiva: si cambia después del
  // montaje inicial (p. ej. la posición GPS tarda en llegar y llega
  // después con un valor distinto al de arranque), el mapa se recentra ahí
  // solo, no hace falta desmontar/remontar (ver `easeTo` en map-view.tsx).
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  // Modo "selección de ubicación": si se indica, tocar/hacer clic en el
  // mapa (fuera de un marcador ya existente) reporta esas coordenadas —
  // usado al crear un marcador nuevo para colocar su pin.
  onMapPress?: (coords: SelectedLocation) => void;
  // Pin temporal de la ubicación elegida — visualmente distinto de los
  // marcadores reales (color propio vía selectedLocationColor, nunca
  // hardcodeado aquí: quien use MapView decide el token de color).
  selectedLocation?: SelectedLocation | null;
  selectedLocationColor?: string;
  // Centra y amplía el mapa sobre un punto concreto — reactivo, igual que
  // initialRegion, pero independiente de él: initialRegion sigue la
  // posición GPS del usuario, esto responde a una acción puntual (p. ej.
  // tocar un marcador en un listado) y usa un zoom más cerrado. No exige
  // que initialRegion también esté definido.
  focusRequest?: SelectedLocation | null;
  // Ruta activa a dibujar sobre el mapa (ver "Cómo llegar" en
  // marker/[id].tsx, guardada en useActiveRoute y consumida aquí desde
  // NearbyMarkersMap) — lista ordenada de puntos de la ruta a pie,
  // `null`/ausente = sin ruta dibujada. Sin ajuste de cámara propio (no hay
  // fit-to-bounds en lib/maps todavía): se dibuja sobre la vista actual.
  route?: { latitude: number; longitude: number }[] | null;
}
