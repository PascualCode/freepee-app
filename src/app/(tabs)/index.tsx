import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { CreateMarkerModal } from '@/components/create-marker-modal';
import { NearbyMarkersMap } from '@/components/nearby-markers-map';
import { useNearbyMarkers } from '@/hooks/use-nearby-markers';
import { useSession } from '@/lib/auth/session';
import type { SelectedLocation } from '@/lib/maps';

// Home autenticada: mismo núcleo que /map (pública) — comparten datos vía
// useNearbyMarkers y renderizado vía <NearbyMarkersMap> — con lo que solo
// tiene sentido con sesión: crear un marcador nuevo, y ver cuáles del
// listado son propios.
export default function HomeScreen() {
  const { user, logout } = useSession();
  const {
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
  } = useNearbyMarkers();
  const [pickedLocation, setPickedLocation] = useState<SelectedLocation | null>(null);

  // Editar/eliminar un marcador desde "Mis marcadores" no toca el estado de
  // este hook (vive en una pantalla distinta, que Expo Router mantiene
  // montada debajo al navegar) — sin esto, volver aquí seguía mostrando el
  // mapa desactualizado hasta recargar la app entera. Se salta el primer
  // foco (coincide con el montaje inicial, que el propio hook ya cubre) para
  // no duplicar el fetch de arranque.
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );

  return (
    <>
      <NearbyMarkersMap
        state={state}
        errorMessage={errorMessage}
        coords={coords}
        allMarkers={allMarkers}
        nearbyMarkers={nearbyMarkers}
        searchResults={searchResults}
        searchState={searchState}
        searchErrorMessage={searchErrorMessage}
        onSearch={search}
        onLocate={locate}
        currentUserId={user?.id ?? null}
        // El modo de selección de ubicación vive dentro de NearbyMarkersMap
        // — solo nos avisa cuando el usuario confirma un punto, momento en
        // el que abrimos el formulario con esa ubicación ya fija.
        onLocationPicked={setPickedLocation}
        sessionUser={user}
        // "Cerrar sesión" vive en Perfil, no aquí: al vaciar user, el guard
        // de Stack.Protected en el layout raíz saca solo de (tabs) y monta
        // (welcome) — no hace falta navegar a mano, mismo mecanismo que ya
        // usa el login/registro.
        onLogout={logout}
      />

      <CreateMarkerModal
        visible={pickedLocation != null}
        location={pickedLocation}
        onClose={() => setPickedLocation(null)}
        onCreated={() => {
          setPickedLocation(null);
          refresh();
        }}
      />
    </>
  );
}
