import { createContext, useContext, useState, type ReactNode } from 'react';

export interface ActiveRoute {
  markerId: string;
  coordinates: { latitude: number; longitude: number }[];
  distanceM: number;
  durationS: number;
}

interface ActiveRouteContextValue {
  route: ActiveRoute | null;
  setRoute: (route: ActiveRoute) => void;
  clearRoute: () => void;
}

const ActiveRouteContext = createContext<ActiveRouteContextValue | null>(null);

// Estado en memoria (sin persistir), mismo patrón que AppEntryContext —
// puente entre marker/[id].tsx (donde vive el botón "Cómo llegar" y se pide
// la ruta al backend) y NearbyMarkersMap (donde se dibuja, dentro de /map o
// (tabs), ver CLAUDE.md → decisión de UX). Al pulsar "Cómo llegar" se llama
// a setRoute() y luego router.back() — la pantalla de mapa a la que se
// vuelve ya lee `route` de este mismo contexto.
export function ActiveRouteProvider({ children }: { children: ReactNode }) {
  const [route, setRouteState] = useState<ActiveRoute | null>(null);

  return (
    <ActiveRouteContext.Provider
      value={{
        route,
        setRoute: setRouteState,
        clearRoute: () => setRouteState(null),
      }}>
      {children}
    </ActiveRouteContext.Provider>
  );
}

export function useActiveRoute(): ActiveRouteContextValue {
  const context = useContext(ActiveRouteContext);
  if (!context) {
    throw new Error('useActiveRoute debe usarse dentro de ActiveRouteProvider');
  }
  return context;
}
