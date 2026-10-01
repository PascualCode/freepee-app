import { router } from 'expo-router';
import { useEffect } from 'react';

import { NearbyMarkersMap } from '@/components/nearby-markers-map';
import { useNearbyMarkers } from '@/hooks/use-nearby-markers';
import { useSession } from '@/lib/auth/session';

// Ruta pública (sin sesión) — "Buscar ahora" desde (welcome) llega aquí. Un
// usuario ya logueado tiene lo mismo y más en la Home de (tabs) (además
// puede crear marcadores), así que si llega aquí con sesión activa se le
// redirige allí en vez de duplicar la pantalla.
export default function MapScreen() {
  const { user } = useSession();
  const { state, errorMessage, coords, allMarkers, nearbyMarkers, locate, search, searchResults, searchState, searchErrorMessage } =
    useNearbyMarkers();

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  if (user) return null;

  return (
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
    />
  );
}
