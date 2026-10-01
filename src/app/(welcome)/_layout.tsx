import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';

// Mismo motivo que (auth)/_layout.tsx: el componente Background interno de
// Expo Router pinta colors.background del tema de NAVEGACIÓN por cada
// pantalla, algo que contentStyle no anula — hace falta darle a este grupo
// su propio tema con fondo transparente para que el ImageBackground se vea.
const transparentNavigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent' },
};

export default function WelcomeLayout() {
  return (
    <ThemeProvider value={transparentNavigationTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
    </ThemeProvider>
  );
}
