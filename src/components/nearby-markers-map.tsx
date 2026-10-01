import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BottomNavBar } from '@/components/bottom-nav-bar';
import { MapLegend } from '@/components/map-legend';
import { LocateIcon } from '@/components/nav-icons';
import { SearchFiltersPanel } from '@/components/search-filters-panel';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useActiveRoute } from '@/hooks/use-active-route';
import { useTheme } from '@/hooks/use-theme';
import type { NearbyMarkersState, SearchState } from '@/hooks/use-nearby-markers';
import type { Marker, MarkerNearby } from '@/lib/api/client';
import type { SessionUser } from '@/lib/auth/session';
import { MapView } from '@/lib/maps';
import type { SelectedLocation } from '@/lib/maps';
import { formatDistance, formatDuration, formatMarkerType, formatPrice, getMarkerGenderColor } from '@/utils/format';
import { EMPTY_SEARCH_FILTERS, hasActiveFilters, type MarkerSearchFilters } from '@/utils/marker-search-filters';
import { consumeSearchIntent } from '@/utils/search-intent';

// Alto de BottomNavBar (64px) + separación — la pill "Ver X cercanos" se
// apila justo encima cuando ambos son visibles a la vez, en vez de
// superponerse.
const SEARCH_BUTTON_RESERVED_SPACE = 80;

interface NearbyMarkersMapProps {
  state: NearbyMarkersState;
  errorMessage: string | null;
  coords: { latitude: number; longitude: number } | null;
  // Todos los marcadores que existen — se pintan siempre en el mapa, sin
  // límite de radio (ver useNearbyMarkers).
  allMarkers: Marker[];
  // Solo los que caen dentro del radio de búsqueda — alimentan
  // únicamente el desplegable de "cercanos" (listado + contador de la
  // pill "Ver X cercanos"), nunca el mapa.
  nearbyMarkers: MarkerNearby[];
  // Búsqueda manual (botón "Buscar", ver más abajo) — sin límite de
  // distancia por defecto, tope de 10, filtrable desde "Ajustes". Todo
  // esto vive en useNearbyMarkers; este componente solo dispara search()
  // con los filtros que el propio usuario configuró aquí dentro.
  searchResults: MarkerNearby[];
  searchState: SearchState;
  searchErrorMessage: string | null;
  onSearch: (filters: MarkerSearchFilters) => void;
  // Botón "reubicarme" — la única acción que pide una posición nueva y
  // recentra el mapa (ver useNearbyMarkers → locate()). `state` ya indica
  // si hay una petición en curso ('requesting-permission'/'loading').
  onLocate: () => void;
  // Si se indica, los marcadores propios del usuario logueado se marcan en
  // el listado con una etiqueta "Tuyo" — en /map (sin sesión) no hay nada
  // que marcar, así que se omite.
  currentUserId?: string | null;
  // Presente solo en la Home autenticada — /map no ofrece crear marcadores.
  // El modo de selección de ubicación (tocar el mapa, mover el pin,
  // confirmar/cancelar) vive por completo dentro de este componente; solo
  // se avisa hacia fuera cuando el usuario confirma un punto, para que la
  // pantalla que lo use abra ahí el formulario de creación.
  onLocationPicked?: (location: SelectedLocation) => void;
  // Sin sesión en /map, ambos se omiten — "Añadir marcador" queda
  // deshabilitado (ver canAdd) y no hay sidebar/avatar que dependa de esto.
  sessionUser?: SessionUser | null;
  onLogout?: () => void;
}

// Núcleo visual compartido entre /map (pública, sin sesión) y la Home
// autenticada de (tabs): mapa, aviso de permiso/estado, y el modal/bottom
// sheet con el listado de marcadores cercanos. La lógica de datos (permiso,
// posición, fetch) vive en el hook useNearbyMarkers — este componente solo
// renderiza a partir de lo que ese hook ya resolvió, para que ambas
// pantallas compartan exactamente el mismo comportamiento y solo difieran
// en qué acciones extra se muestran encima.
export function NearbyMarkersMap({
  state,
  errorMessage,
  coords,
  allMarkers,
  nearbyMarkers,
  searchResults,
  searchState,
  searchErrorMessage,
  onSearch,
  onLocate,
  currentUserId = null,
  onLocationPicked,
  sessionUser = null,
  onLogout,
}: NearbyMarkersMapProps) {
  const theme = useTheme();
  const { route, clearRoute } = useActiveRoute();
  const [modalVisible, setModalVisible] = useState(false);
  // Qué lista alimenta el modal — el fetch automático de "cercanos" (radio
  // fijo, sin filtros) o la última búsqueda manual (botón "Buscar", sin
  // límite de distancia salvo que se fije en Ajustes, filtrable). Mismo
  // Modal/lista para ambas, solo cambia de dónde vienen los datos.
  const [modalSource, setModalSource] = useState<'nearby' | 'search'>('nearby');
  const [filters, setFilters] = useState<MarkerSearchFilters>(EMPTY_SEARCH_FILTERS);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const autoOpenedRef = useRef(false);
  // Modo selección de ubicación (activado desde el FAB de crear marcador):
  // mientras está activo, se sustituyen los controles normales del mapa
  // (pill de reabrir cercanos, BottomNavBar) por los propios de este modo,
  // y los marcadores reales dejan de navegar al tocarlos — así no
  // interfiere con la exploración normal, que sigue igual cuando no está
  // activo.
  const [pickingLocation, setPickingLocation] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<SelectedLocation | null>(null);
  // Punto sobre el que centrar/ampliar el mapa al tocar un ítem del
  // desplegable de cercanos/búsqueda — independiente de `coords` (posición
  // GPS), nunca la toca ni dispara "reubicarme". Ver focusRequest en
  // lib/maps.
  const [focusedMarker, setFocusedMarker] = useState<SelectedLocation | null>(null);

  // Abre el modal automáticamente la primera vez que llegan resultados —
  // pedido explícitamente así: solo si se llegó aquí desde "Buscar ahora"
  // en (welcome) (ver consumeSearchIntent), nunca al entrar a Home con
  // sesión ya iniciada ni al volver a /map por cualquier otro camino. Solo
  // se consulta una vez por montaje (autoOpenedRef), para no reabrirlo tras
  // un refresh (p. ej. después de crear un marcador) si el usuario ya lo
  // cerró.
  useEffect(() => {
    if (state === 'ready' && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      if (consumeSearchIntent()) {
        setModalSource('nearby');
        setModalVisible(true);
      }
    }
  }, [state]);

  // Toque directo sobre el pin en el mapa — sigue llevando al detalle +
  // reseñas, sin cambios.
  const handleMarkerPress = useCallback((id: string) => {
    setModalVisible(false);
    router.push(`/marker/${id}`);
  }, []);

  // Toque sobre un ítem del desplegable (cercanos/búsqueda) — ya NO navega
  // al detalle; cierra el desplegable y centra/amplía el mapa sobre ese
  // marcador. El detalle + la posibilidad de dejar reseña pasan a ser
  // accesibles solo tocando el pin en el mapa (handleMarkerPress arriba).
  const handleListItemPress = useCallback((marker: MarkerNearby) => {
    setModalVisible(false);
    setFocusedMarker({ latitude: marker.latitude, longitude: marker.longitude });
  }, []);

  function handleSearchPress() {
    setModalSource('search');
    onSearch(filters);
    setModalVisible(true);
  }

  const modalLoading = modalSource === 'search' ? searchState === 'loading' : state === 'loading';
  const modalMarkers = modalLoading ? null : modalSource === 'search' ? searchResults : nearbyMarkers;
  const modalErrorMessage = modalSource === 'search' && searchState === 'error' ? searchErrorMessage : null;

  function startPickingLocation() {
    setModalVisible(false);
    setPendingLocation(null);
    setPickingLocation(true);
  }

  function cancelPickingLocation() {
    setPickingLocation(false);
    setPendingLocation(null);
  }

  function confirmPickingLocation() {
    if (!pendingLocation) return;
    onLocationPicked?.(pendingLocation);
    setPickingLocation(false);
    setPendingLocation(null);
  }

  // Hay sesión real solo si se recibió onLogout (en /map, sin sesión, ni
  // sessionUser ni onLogout llegan).
  const isAuthenticated = onLogout != null;
  // "Añadir marcador" en BottomNavBar exige además el email verificado
  // (mismo requisito que ya aplica el backend en POST /markers) — pedido
  // explícitamente así: el botón se ve siempre (incluso sin sesión, en
  // /map), pero en gris hasta que se puede usar de verdad.
  const canAdd = isAuthenticated && sessionUser?.emailVerified === true;
  // "reubicarme" ya tiene una petición de permiso/posición en curso — evita
  // apilar toques repetidos mientras se resuelve.
  const locating = state === 'requesting-permission' || state === 'loading';

  // Solo la llama BottomNavBar, y su icono de Perfil está deshabilitado sin
  // sesión (ver más abajo) — nunca se invoca sin sesión real.
  function goToProfile() {
    router.push('/profile');
  }

  return (
    <View style={styles.flex}>
      <View style={styles.mapContainer}>
        <MapView
          markers={allMarkers.map((marker) => ({
            id: marker.id,
            title: marker.title,
            latitude: marker.latitude,
            longitude: marker.longitude,
            color: getMarkerGenderColor(marker.gender),
            imageUrl: marker.imageUrl,
          }))}
          // Los marcadores reales se siguen viendo como referencia durante la
          // selección de ubicación, pero dejan de navegar al tocarlos — ese
          // toque debe colocar el pin, no sacar al usuario de este flujo.
          onMarkerPress={pickingLocation ? undefined : handleMarkerPress}
          onMapPress={pickingLocation ? setPendingLocation : undefined}
          selectedLocation={pickingLocation ? pendingLocation : null}
          selectedLocationColor={theme.primary}
          // Reactivo (ver comentario en MapViewProps): en cuanto coords deja
          // de ser null (el GPS tarda en resolver, antes se muestra un
          // centro de fallback), el mapa se recentra solo aquí.
          initialRegion={
            coords
              ? { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
              : undefined
          }
          focusRequest={focusedMarker}
          route={route?.coordinates ?? null}
        />
      </View>

      {route && (
        <View style={[styles.routePill, { backgroundColor: theme.background }]}>
          <ThemedText type="smallBold">
            {formatDistance(route.distanceM)} · {formatDuration(route.durationS)}
          </ThemedText>
          <Pressable onPress={clearRoute} accessibilityRole="button" accessibilityLabel="Cerrar ruta">
            <ThemedText type="smallBold" themeColor="primary">
              ✕
            </ThemedText>
          </Pressable>
        </View>
      )}

      {pickingLocation ? (
        <>
          <View style={[styles.banner, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small">
              {pendingLocation
                ? 'Ubicación marcada. Puedes tocar otro punto para moverla, o confirmarla.'
                : 'Toca el mapa para marcar la ubicación exacta.'}
            </ThemedText>
          </View>

          <View style={[styles.pickerActions, { bottom: Spacing.four }]}>
            <Pressable
              onPress={cancelPickingLocation}
              style={[styles.pickerButton, { backgroundColor: theme.backgroundElement }]}
              accessibilityRole="button">
              <ThemedText type="smallBold">Cancelar</ThemedText>
            </Pressable>
            <Pressable
              onPress={confirmPickingLocation}
              disabled={!pendingLocation}
              style={[
                styles.pickerButton,
                { backgroundColor: theme.primary },
                !pendingLocation && styles.pickerButtonDisabled,
              ]}
              accessibilityRole="button">
              <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                Confirmar ubicación
              </ThemedText>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          {/* Con sesión no hace falta nada aquí (Perfil ya está en
              BottomNavBar, duplicarlo no aporta nada — decisión explícita
              del usuario); sin sesión, un botón de texto que lleva a
              /login (Mis marcadores/Perfil de BottomNavBar quedan
              deshabilitados sin sesión, así que hace falta otra vía). */}
          {!isAuthenticated && (
            <Pressable
              onPress={() => router.push('/login')}
              style={styles.loginButton}
              accessibilityRole="button"
              accessibilityLabel="Inicio de sesión">
              <ThemedText type="smallBold" style={styles.loginButtonText}>
                Inicio de sesión
              </ThemedText>
            </Pressable>
          )}

          {nearbyMarkers.length > 0 && !modalVisible && (
            <Pressable
              onPress={() => {
                setModalSource('nearby');
                setModalVisible(true);
              }}
              style={[
                styles.reopenButton,
                { backgroundColor: theme.primary, bottom: Spacing.four + SEARCH_BUTTON_RESERVED_SPACE },
              ]}
              accessibilityRole="button">
              <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                Ver {nearbyMarkers.length} cercano{nearbyMarkers.length === 1 ? '' : 's'}
              </ThemedText>
            </Pressable>
          )}

          {/* "reubicarme" — la única forma de recentrar el mapa ahora que
              volver a esta pantalla ya no lo hace solo (ver
              useNearbyMarkers → locate() y CLAUDE.md → Pendiente). Mismo
              diseño cerrado (blanco/negro fijos) que BottomNavBar/loginButton,
              no theme.*. */}
          <Pressable
            onPress={onLocate}
            disabled={locating}
            style={[
              styles.locateButton,
              { bottom: Spacing.four + SEARCH_BUTTON_RESERVED_SPACE },
              locating && styles.locateButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Reubicarme">
            {locating ? <ActivityIndicator color="#000000" size="small" /> : <LocateIcon size={22} color="#000000" />}
          </Pressable>

          <MapLegend bottom={Spacing.four + SEARCH_BUTTON_RESERVED_SPACE} />

          <BottomNavBar
            bottom={Spacing.four}
            isAuthenticated={isAuthenticated}
            onMyMarkers={() => isAuthenticated && router.push('/my-markers')}
            onProfile={goToProfile}
            onAdd={startPickingLocation}
            canAdd={canAdd}
            canSearch={!!coords}
            onSearch={handleSearchPress}
            onSettings={() => setSettingsVisible(true)}
          />

          {state === 'permission-denied' && (
            <View style={[styles.banner, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">
                No hemos podido acceder a tu ubicación. Puedes explorar el mapa igualmente, pero no podemos
                mostrarte los marcadores más cercanos a ti sin ella.
              </ThemedText>
            </View>
          )}

          {state === 'error' && errorMessage && (
            <View style={[styles.banner, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="danger">
                {errorMessage}
              </ThemedText>
            </View>
          )}
        </>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: Spacing.four }]}>
            <View style={styles.sheetHeader}>
              <ThemedText type="subtitle" style={styles.sheetTitle} numberOfLines={1}>
                {modalSource === 'search' ? 'Resultados de tu búsqueda' : 'Marcadores cercanos'}
              </ThemedText>
              <Pressable onPress={() => setModalVisible(false)} accessibilityRole="button">
                <ThemedText type="linkPrimary">Cerrar</ThemedText>
              </Pressable>
            </View>

            {modalMarkers === null ? (
              <ThemedText themeColor="textSecondary">Buscando…</ThemedText>
            ) : (
              <>
                {modalErrorMessage && (
                  <ThemedText themeColor="danger">{modalErrorMessage}</ThemedText>
                )}
                {!modalErrorMessage && modalMarkers.length === 0 && (
                  <ThemedText themeColor="textSecondary">
                    {modalSource === 'search' && hasActiveFilters(filters)
                      ? 'Ningún marcador coincide con los filtros elegidos.'
                      : 'No hay marcadores cerca de ti todavía.'}
                  </ThemedText>
                )}
              </>
            )}

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {(modalMarkers ?? []).map((marker) => {
                const price = formatPrice(marker.priceType, marker.amount);
                const isOwn = currentUserId != null && marker.ownerId === currentUserId;
                return (
                  <Pressable
                    key={marker.id}
                    onPress={() => handleListItemPress(marker)}
                    style={[styles.listItem, { borderColor: theme.border }]}
                    accessibilityRole="button">
                    <View style={styles.listItemMain}>
                      <View style={styles.listItemTitleRow}>
                        <ThemedText type="smallBold">{marker.title}</ThemedText>
                        {isOwn && (
                          <View style={[styles.ownTag, { backgroundColor: theme.primarySoft }]}>
                            <ThemedText type="small" themeColor="primary">
                              Tuyo
                            </ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatMarkerType(marker.type)}
                        {price ? ` · ${price}` : ''}
                      </ThemedText>
                    </View>
                    <ThemedText type="smallBold" themeColor="primary">
                      {formatDistance(marker.distance_m)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={settingsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: Spacing.four }]}>
            <View style={styles.sheetHeader}>
              <ThemedText type="subtitle" style={styles.sheetTitle} numberOfLines={1}>
                Ajustes
              </ThemedText>
              <Pressable onPress={() => setSettingsVisible(false)} accessibilityRole="button">
                <ThemedText type="linkPrimary">Cerrar</ThemedText>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.listContent}>
              <SearchFiltersPanel filters={filters} onChange={setFilters} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  // Mismo hueco arriba a la derecha que tenía antes el avatar — solo
  // visible sin sesión (ver comentario en el uso). Colores fijos (blanco +
  // texto negro), no theme.*: mismo diseño cerrado que BottomNavBar (ver
  // comentario en bottom-nav-bar.tsx) — en modo oscuro theme.background
  // pintaría negro, muy distinto del blanco fijo del resto de estos
  // controles.
  loginButton: {
    position: 'absolute',
    top: Spacing.six,
    right: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: '#ffffff',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
    zIndex: 2,
  },
  loginButtonText: {
    color: '#000000',
  },
  // Píldora de "ruta activa" (ver useActiveRoute) — centrada arriba, mismo
  // hueco vertical que el resto de banners de este archivo pero pill-shaped
  // en vez de a todo el ancho, para no tapar el mapa más de lo necesario.
  // theme.background (no un color fijo): a diferencia de BottomNavBar, esta
  // sí es una superficie normal de la app, ya sigue el tema del sistema
  // igual que el resto de banners/listas de este componente.
  routePill: {
    position: 'absolute',
    top: Spacing.six,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
    zIndex: 2,
  },
  reopenButton: {
    position: 'absolute',
    alignSelf: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
    zIndex: 1,
  },
  locateButton: {
    position: 'absolute',
    right: Spacing.three,
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
    zIndex: 1,
  },
  locateButtonDisabled: {
    opacity: 0.6,
  },
  pickerActions: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.two,
    zIndex: 1,
  },
  pickerButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
  },
  pickerButtonDisabled: {
    opacity: 0.5,
  },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.three,
    paddingHorizontal: Spacing.three,
    zIndex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // flex:1 + numberOfLines=1 en el título (ver uso): sin esto, un título
  // largo ("Resultados de tu búsqueda") a 32px (tamaño por defecto de
  // "subtitle") empujaba "Cerrar" fuera del ancho visible de la hoja,
  // dejándolo cortado en el borde. fontSize/lineHeight más pequeños que
  // "subtitle" — un encabezado de bottom sheet no necesita ese tamaño.
  sheetTitle: {
    flex: 1,
    fontSize: 20,
    lineHeight: 26,
    marginRight: Spacing.two,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: Spacing.two,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  listItemMain: {
    flex: 1,
    gap: Spacing.half,
  },
  listItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  ownTag: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
});
