import { Stack } from 'expo-router';

// Login/registro ya no usan una foto de fondo a pantalla completa (ver
// AuthSplitLayout — la foto ahora es un panel lateral dentro de cada
// pantalla, no un fondo del grupo de rutas), así que este layout no
// necesita el tema de navegación transparente que sí sigue haciendo falta
// en (welcome) (ver ese _layout.tsx y CLAUDE.md → Notas técnicas).
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
