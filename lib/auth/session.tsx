// Estado global de sesión — Context + hook, sin librería externa de estado.
// No crea ninguna pantalla: <SessionProvider> debe montarse en el layout raíz
// de la app cuando se construyan las pantallas.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { api, onUnauthorized } from '@/lib/api/client';
import type { LoginInput, RegisterInput, UserProfile } from '@/lib/api/client';
import { getToken } from '@/lib/auth/storage';

// Perfil completo del usuario en sesión — GET /auth/me es la única fuente
// de verdad, tanto al arrancar la app (token guardado) como justo después
// de login/registro. Antes esto se resolvía decodificando el JWT (solo
// daba el `id`, sin verificar firma) porque no existía ningún endpoint
// "whoami" — con /auth/me ya no hace falta: además de tener siempre el
// perfil completo, arrancar la app ahora sí confirma de verdad que el
// token guardado sigue siendo válido (antes había que esperar a la
// primera petición protegida real para descubrir que había expirado).
export type SessionUser = UserProfile;

interface SessionContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  // Vuelve a pedir GET /auth/me y actualiza `user` — para cuando algo cambia
  // el perfil en el backend sin pasar por login/register (p. ej. verificar
  // el email desde la pantalla verify-email, que puede reabrir la misma
  // instancia de la app minimizada, con el `user` en memoria ya obsoleto).
  // Sin sesión activa en este dispositivo, no hace nada.
  refreshUser: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Al arrancar: si hay un token guardado, se confirma contra el backend
  // (GET /auth/me) — si expiró o la cuenta se dio de baja, esa petición
  // devuelve 401, lo que dispara onUnauthorized (más abajo) y limpia todo.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await getToken();
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const profile = await api.getMe();
        if (!cancelled) setUser(profile);
      } catch {
        // request() ya limpió el token y notificó a onUnauthorized si el
        // 401 vino de ahí; cualquier otro fallo (red caída, etc.) también
        // deja la sesión sin confirmar — mejor pedir login de nuevo que
        // asumir una sesión que no se pudo verificar.
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Cualquier petición del cliente API que reciba un 401 dispara esto —
  // corta la sesión inmediatamente en toda la app.
  useEffect(() => onUnauthorized(() => setUser(null)), []);

  const login = useCallback(async (input: LoginInput) => {
    await api.login(input);
    setUser(await api.getMe());
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    // register() ya encadena un login con las mismas credenciales (el
    // backend no autentica en el registro) — luego se pide el perfil igual
    // que en login(), no hace falta tratarlo distinto solo porque la
    // respuesta de POST /auth/register ya traía el perfil completo.
    await api.register(input);
    await api.login({ email: input.email, password: input.password });
    setUser(await api.getMe());
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await api.getMe());
    } catch {
      // Sin token guardado (o ya inválido) en este dispositivo — nada que
      // refrescar; onUnauthorized ya se encarga de limpiar la sesión si el
      // 401 vino de ahí.
    }
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ user, isLoading, login, register, logout, refreshUser }),
    [user, isLoading, login, register, logout, refreshUser]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession() debe usarse dentro de <SessionProvider>');
  }
  return context;
}
