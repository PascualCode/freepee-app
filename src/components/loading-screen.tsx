import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

// Pantalla simple mientras useSession() comprueba si hay un token guardado
// al arrancar la app — nunca dejar la pantalla de auth o el contenido
// principal renderizarse a medias mientras eso se resuelve.
export function LoadingScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" color={theme.primary} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
