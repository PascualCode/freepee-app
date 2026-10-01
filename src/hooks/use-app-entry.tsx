import { createContext, useContext, useState, type ReactNode } from 'react';

interface AppEntryContextValue {
  // Empieza en `false` en cada arranque de la app (useState normal, sin
  // persistir) — pedido explícitamente así: aunque haya sesión iniciada,
  // la primera pantalla siempre es (welcome), y solo tras pulsar uno de
  // sus dos botones ("Buscar ahora" o el que lleve al mapa/login) se
  // considera "entrada" y el guard del layout raíz deja de forzar
  // (welcome). No se resetea al cerrar sesión dentro de la misma
  // ejecución — "entrar a la app" se refiere al arranque, no a cada login.
  hasEntered: boolean;
  enterApp: () => void;
}

const AppEntryContext = createContext<AppEntryContextValue | null>(null);

export function AppEntryProvider({ children }: { children: ReactNode }) {
  const [hasEntered, setHasEntered] = useState(false);

  return (
    <AppEntryContext.Provider value={{ hasEntered, enterApp: () => setHasEntered(true) }}>
      {children}
    </AppEntryContext.Provider>
  );
}

export function useAppEntry(): AppEntryContextValue {
  const context = useContext(AppEntryContext);
  if (!context) {
    throw new Error('useAppEntry debe usarse dentro de AppEntryProvider');
  }
  return context;
}
