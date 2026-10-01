import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import type { NativeSyntheticEvent, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map as MapLibreMap, Marker, UserLocation } from '@maplibre/maplibre-react-native';
import type { CameraRef, LngLat, PressEvent, StyleSpecification } from '@maplibre/maplibre-react-native';

import type { MapViewProps } from './types';

const FALLBACK_CENTER: LngLat = [-3.7038, 40.4168]; // Madrid, [lng, lat]

// Estilo mínimo de MapLibre con tiles raster de OpenStreetMap, sin API key.
// Antes esta pantalla usaba react-native-maps con el proveedor por defecto
// de Android (Google Maps), que exige autenticarse contra la API de Google
// incluso dentro de Expo Go — al fallar esa autenticación (mapa gris, sin
// tiles, coordenadas de toque sin sentido; ver CLAUDE.md), se sustituyó
// react-native-maps por MapLibre para no depender de ninguna cuenta/clave.
// `maxzoom: 19` — el propio servidor de tile.openstreetmap.org no sirve
// niveles de zoom más altos (devuelve HTTP 400 para z=20+, visible en el log
// nativo como "Failed to load tile ... HTTP status code 400" en bucle cada
// vez que el usuario hace zoom cerca). Con `maxzoom` fijado, MapLibre hace
// "over-zoom" reutilizando/escalando los tiles de z=19 en vez de pedir
// niveles que no existen.
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

// Zoom aproximadamente equivalente al `latitudeDelta`/`longitudeDelta` que
// usaba react-native-maps: 14 para un centro preciso (posición GPS o el
// primer marcador real), 11 para el fallback de Madrid (vista más abierta,
// antes `latitudeDelta: 0.5`).
const PRECISE_ZOOM = 14;
const FALLBACK_ZOOM = 11;
// Zoom para `focusRequest` (p. ej. tocar un marcador en un listado) — más
// cerrado que PRECISE_ZOOM a propósito: "ampliar la vista" sobre un punto
// concreto, no solo centrarlo.
const FOCUS_ZOOM = 17;

// Pin dibujado a mano (un cuadrado con 3 esquinas redondeadas +
// rotate(-45deg), sin ningún asset de imagen). `anchor="bottom"` en
// <Marker> sitúa la punta de la gota (no su centro) sobre la coordenada
// real. `alignItems`/`justifyContent` centrados: sin hijos no cambia nada
// (pin de color de siempre), pero permite centrar la foto del pin con
// imagen (ver PHOTO_PIN_SIZE más abajo) sin tocar esta función.
function dropPinStyle(size: number, color: string): ViewStyle {
  return {
    width: size,
    height: size,
    borderTopLeftRadius: size / 2,
    borderTopRightRadius: size / 2,
    borderBottomRightRadius: size / 2,
    borderBottomLeftRadius: 0,
    backgroundColor: color,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.35)',
  };
}

// Pin con foto — misma gota de siempre (mismo `dropPinStyle`, mismo color
// de género, mismo "rabito" apuntando abajo para identificar el tipo de
// baño), con la foto como un círculo CENTRADO dentro de esa gota, no un pin
// distinto. El centro geométrico del cuadrado sin rotar cae dentro de la
// parte redondeada de la gota (los tres corners a 50% de radio la
// aproximan a un círculo de radio PHOTO_PIN_SIZE/2 ahí) — el límite es que
// el círculo de la foto no sobrepase ese radio; por debajo de él, el
// rabito (el corner recto, el que sobresale tras rotar) nunca corre riesgo
// de quedar tapado, así que el margen que importa de verdad es el que deja
// visible el color de género como marco alrededor de la foto, pedido
// explícitamente para no perder esa identificación visual (ajustado a
// petición del usuario antes de la 2ª tanda de pruebas alpha — más grande
// que el primer valor, pero sin comerse el marco entero). La foto necesita
// `rotate('45deg')` propio para compensar el `rotate(-45deg)` de la gota
// que la contiene — si no, la imagen se vería girada, aunque su recorte
// circular no cambiaría de forma.
const PHOTO_PIN_SIZE = 40;
const PHOTO_IMAGE_SIZE = 30;

const DEFAULT_PIN_COLOR = '#EA4335';

// Mismo amarillo que theme.primary/BottomNavBar — color fijo, no useTheme()
// (el mapa ya es una superficie de colores cerrados, ver dropPinStyle). El
// halo blanco debajo (más ancho) es lo que hace que la línea se lea bien
// sobre tiles de OSM con cualquier combinación de colores de fondo.
const ROUTE_LINE_COLOR = '#F7B500';

export function MapView({
  markers,
  onMarkerPress,
  initialRegion,
  onMapPress,
  selectedLocation,
  selectedLocationColor,
  focusRequest,
  route,
}: MapViewProps) {
  const cameraRef = useRef<CameraRef>(null);
  const isFirstRender = useRef(true);

  const hasPreciseCenter = initialRegion != null || markers[0] != null;
  const center: LngLat = initialRegion
    ? [initialRegion.longitude, initialRegion.latitude]
    : markers[0]
      ? [markers[0].longitude, markers[0].latitude]
      : FALLBACK_CENTER;
  const zoom = hasPreciseCenter ? PRECISE_ZOOM : FALLBACK_ZOOM;

  // `initialViewState` de <Camera>, como su nombre indica, solo se aplica al
  // montar — si el mapa arranca en el fallback (GPS aún sin resolver) y la
  // posición real llega después, hay que recentrarlo a mano. Se salta la
  // primera vez (ya cubierta por `initialViewState`) y depende de los
  // números sueltos, no de la tupla `center` completa, que cambia de
  // referencia en cada render aunque el valor sea el mismo.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    cameraRef.current?.easeTo({ center, zoom, duration: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);

  // focusRequest: independiente de initialRegion (que sigue la posición GPS)
  // — arranca en `null` y solo cambia por una acción puntual del usuario
  // (tocar un marcador en un listado), así que nunca hace falta saltar un
  // "primer render" como con `center` arriba.
  useEffect(() => {
    if (!focusRequest) return;
    cameraRef.current?.easeTo({
      center: [focusRequest.longitude, focusRequest.latitude],
      zoom: FOCUS_ZOOM,
      duration: 500,
    });
  }, [focusRequest?.latitude, focusRequest?.longitude]);

  return (
    <MapLibreMap
      style={styles.map}
      mapStyle={OSM_STYLE}
      onPress={
        onMapPress
          ? (event: NativeSyntheticEvent<PressEvent>) => {
              const [longitude, latitude] = event.nativeEvent.lngLat;
              onMapPress({ latitude, longitude });
            }
          : undefined
      }>
      <Camera ref={cameraRef} initialViewState={{ center, zoom }} />

      {/* Punto azul nativo de "aquí estoy" (MapLibre gestiona su propia
          posición internamente) — no hace falta pasarle `userLocation`,
          mismo motivo que antes con `showsUserLocation` de react-native-maps
          (ver el comentario de `userLocation` en ./types.ts). */}
      <UserLocation />

      {route && route.length > 1 && (
        <GeoJSONSource
          id="route"
          data={{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: route.map((point): LngLat => [point.longitude, point.latitude]),
            },
          }}>
          <Layer
            id="route-halo"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': '#ffffff', 'line-width': 7 }}
          />
          <Layer
            id="route-line"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': ROUTE_LINE_COLOR, 'line-width': 4 }}
          />
        </GeoJSONSource>
      )}

      {markers.map((marker) => (
        <Marker
          key={marker.id}
          lngLat={[marker.longitude, marker.latitude]}
          anchor="bottom"
          onPress={onMarkerPress ? () => onMarkerPress(marker.id) : undefined}>
          {marker.imageUrl ? (
            <View style={dropPinStyle(PHOTO_PIN_SIZE, marker.color ?? DEFAULT_PIN_COLOR)}>
              <Image source={{ uri: marker.imageUrl }} style={styles.photoPinImage} contentFit="cover" />
            </View>
          ) : (
            <View style={dropPinStyle(32, marker.color ?? DEFAULT_PIN_COLOR)} />
          )}
        </Marker>
      ))}

      {selectedLocation && (
        <Marker lngLat={[selectedLocation.longitude, selectedLocation.latitude]} anchor="bottom">
          <View style={dropPinStyle(28, selectedLocationColor ?? DEFAULT_PIN_COLOR)} />
        </Marker>
      )}
    </MapLibreMap>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  photoPinImage: {
    width: PHOTO_IMAGE_SIZE,
    height: PHOTO_IMAGE_SIZE,
    borderRadius: PHOTO_IMAGE_SIZE / 2,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
  },
});
