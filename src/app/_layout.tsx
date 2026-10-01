import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { LoadingScreen } from '@/components/loading-screen';
import { ActiveRouteProvider } from '@/hooks/use-active-route';
import { AppEntryProvider, useAppEntry } from '@/hooks/use-app-entry';
import { FavoritesProvider } from '@/hooks/use-favorites';
import { SessionProvider, useSession } from '@/lib/auth/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SessionProvider>
        <AppEntryProvider>
          <ActiveRouteProvider>
            <FavoritesProvider>
              <AnimatedSplashOverlay />
              <RootNavigator />
            </FavoritesProvider>
          </ActiveRouteProvider>
        </AppEntryProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

// Separado del layout raíz para poder leer useSession()/useAppEntry() — los
// Providers tienen que ser ancestros de quien los consume, no pueden
// leerse en el mismo componente que los monta.
function RootNavigator() {
  const { user, isLoading } = useSession();
  const { hasEntered } = useAppEntry();

  // Mientras se comprueba si hay un token guardado al arrancar: pantalla de
  // carga simple, nunca las pantallas de auth en blanco ni contenido a medias.
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    // contentStyle transparente: por defecto el navegador de pantallas pinta
    // su propio fondo opaco (gris claro) detrás de cada screen — sin esto,
    // taparía el <ImageBackground> del grupo (auth). Las pantallas de (tabs)
    // ya pintan su propio fondo (AppTabs/ThemedView), así que quitarles este
    // fondo por defecto no cambia nada ahí.
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      {/* hasEntered además de !!user: pedido explícitamente que, aunque
          haya sesión iniciada, la primera pantalla al arrancar la app sea
          siempre (welcome) — ver useAppEntry. Una vez se pulsa uno de sus
          dos botones (WelcomeScreen llama a enterApp()), el guard vuelve a
          comportarse como antes (sesión → tabs directo). Declarado primero
          a propósito: react-navigation usa el primer Stack.Screen incluido
          como ruta inicial de respaldo cuando la URL solicitada no
          resuelve todavía en el primer render (mientras se resuelven
          user/hasEntered) — declarándolo primero, ese respaldo es siempre
          (welcome), nunca (auth)/(tabs). */}
      <Stack.Protected guard={!user || !hasEntered}>
        {/* (welcome) es el punto de entrada — siempre al arrancar, con o
            sin sesión (ver guard de arriba); una vez "entrado" solo vuelve
            a aparecer si la sesión termina. Ya no se va directo a (auth);
            "Iniciar sesión" desde ahí navega a (auth) a mano, y con sesión
            iniciada su botón secundario lleva al mapa en su lugar (ver
            (welcome)/index.tsx). */}
        <Stack.Screen name="(welcome)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        {/* (auth) nunca tiene sentido con sesión, entrada o no. */}
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!user && hasEntered}>
        <Stack.Screen name="(tabs)" />
        {/* Solo tienen sentido con sesión (perfil/marcadores propios) — el
            mismo guard que (tabs) las saca automáticamente si la sesión
            termina mientras están abiertas, sin código extra. */}
        <Stack.Screen name="profile" />
        <Stack.Screen name="my-markers" />
        <Stack.Screen name="favorites" />
      </Stack.Protected>
      {/* Sin Stack.Protected: accesibles con o sin sesión. "Buscar ahora"
          desde (welcome) depende de que map no esté detrás de ningún guard.
          verify-email tampoco puede depender de sesión: el enlace del
          correo puede abrirse en un dispositivo/navegador distinto al que
          inició el registro. */}
      <Stack.Screen name="map" />
      <Stack.Screen name="marker/[id]" />
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}
