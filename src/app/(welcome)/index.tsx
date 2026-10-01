import { router } from 'expo-router';
import { ImageBackground, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { GlassCard } from '@/components/ui/glass-card';
import { Wordmark } from '@/components/wordmark';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppEntry } from '@/hooks/use-app-entry';
import { useSession } from '@/lib/auth/session';
import { markSearchIntent } from '@/utils/search-intent';

// Misma foto que (auth) — punto de entrada público, mismo lenguaje visual.
const WELCOME_BACKGROUND = require('@/assets/images/auth-background.jpg');

export default function WelcomeScreen() {
  const { user } = useSession();
  const { enterApp } = useAppEntry();

  // Con sesión iniciada esta pantalla se sigue viendo siempre primero al
  // arrancar (ver useAppEntry), pero no tiene sentido ofrecer "Iniciar
  // sesión" — el botón secundario lleva directo al mapa autenticado en su
  // lugar.
  function handleSecondaryPress() {
    enterApp();
    router.push(user ? '/(tabs)' : '/login');
  }

  function handleSearchPress() {
    // El popup automático de "cercanos" en /map (o en Home, si hay sesión
    // y /map redirige ahí) solo debe aparecer llegando desde este botón —
    // ver consumeSearchIntent en NearbyMarkersMap.
    markSearchIntent();
    enterApp();
    router.push('/map');
  }

  return (
    <ImageBackground source={WELCOME_BACKGROUND} style={styles.background} resizeMode="cover">
      <View style={styles.container}>
        <GlassCard style={styles.card}>
          <Wordmark />
          <ThemedText themeColor="textSecondary">
            Mapa colaborativo de sitios donde hacer tus necesidades en paz y a
            gusto, solo o con tu mascota. Empezamos por Cáceres — ayúdanos a
            hacerlo crecer añadiendo los tuyos.
          </ThemedText>

          {/* "Buscar ahora" resuelve una necesidad urgente (encontrar un
              sitio ya) sin fricción de cuenta — por eso va primero y en
              variant primary; el botón secundario cambia según haya sesión
              o no. */}
          <AppButton label="Buscar ahora" onPress={handleSearchPress} />
          <AppButton
            label={user ? 'Ir al mapa' : 'Iniciar sesión / Registrarse'}
            variant="secondary"
            onPress={handleSecondaryPress}
          />
        </GlassCard>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth / 2,
  },
});
