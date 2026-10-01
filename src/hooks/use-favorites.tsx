import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { api } from '@/lib/api/client';
import type { Marker } from '@/lib/api/client';
import { useSession } from '@/lib/auth/session';

interface FavoritesContextValue {
  favorites: Marker[];
  favoriteIds: Set<string>;
  loading: boolean;
  isFavorite: (markerId: string) => boolean;
  // Alterna favorito/no favorito — optimista (actualiza el estado local sin
  // esperar la respuesta ni volver a pedir la lista entera), igual que el
  // resto de la app trata acciones reversibles de un solo tap.
  toggleFavorite: (markerId: string) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

// Se resuelve una sola vez por sesión (GET /users/me/favorites) en vez de
// exponer isFavorite vía GET /markers/:id (que es público, sin
// app.authenticate) — evita inventar un mecanismo de "auth opcional" nuevo
// en el backend solo para esto. Solo pide datos con sesión iniciada; sin
// ella, favoriteIds se queda vacío y isFavorite() siempre da false (el
// corazón ni se muestra en marker/[id].tsx sin sesión).
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [favorites, setFavorites] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }
    setLoading(true);
    try {
      const result = await api.getFavoriteMarkers();
      setFavorites(result);
    } catch {
      // Fallo silencioso: la pantalla de Favoritos muestra su propia lista
      // vacía, no hay un banner de error dedicado para esto todavía.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const favoriteIds = new Set(favorites.map((marker) => marker.id));

  async function toggleFavorite(markerId: string) {
    const isCurrentlyFavorite = favoriteIds.has(markerId);
    if (isCurrentlyFavorite) {
      setFavorites((prev) => prev.filter((marker) => marker.id !== markerId));
      try {
        await api.unfavoriteMarker(markerId);
      } catch {
        // Revierte si el backend falla — el estado local no debe divergir
        // silenciosamente de lo que hay realmente guardado.
        refresh();
      }
    } else {
      try {
        const marker = await api.getMarkerById(markerId);
        setFavorites((prev) => [marker, ...prev]);
        await api.favoriteMarker(markerId);
      } catch {
        refresh();
      }
    }
  }

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        favoriteIds,
        loading,
        isFavorite: (markerId) => favoriteIds.has(markerId),
        toggleFavorite,
      }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites debe usarse dentro de FavoritesProvider');
  }
  return context;
}
