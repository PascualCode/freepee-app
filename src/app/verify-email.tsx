import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { Spacing } from '@/constants/theme';
import { api, ApiError } from '@/lib/api/client';
import { useSession } from '@/lib/auth/session';

type VerifyState = 'verifying' | 'success' | 'error';

// Sin guard en _layout.tsx a propósito — el enlace del correo puede abrirse
// en un dispositivo/navegador distinto al que inició el registro, así que
// no puede depender de que exista sesión aquí.
//
// "Continuar" navega a /map, no a '/': con esta pantalla cargada en frío
// desde un enlace externo (nunca navegada desde dentro de la app), el
// navegador de Expo Router no resuelve `router.replace('/')` a ningún sitio
// — la raíz depende de a qué grupo ((welcome)/(auth)/(tabs)) apunte según
// los guards, ambiguo en este estado de arranque concreto. `/map` es una
// ruta siempre accesible sin guard, sin esa ambigüedad.
export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { refreshUser } = useSession();
  const [state, setState] = useState<VerifyState>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMessage('Enlace de verificación incompleto.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await api.verifyEmail({ token });
        // Si el enlace se abrió en la misma instancia de la app que inició
        // el registro (p. ej. minimizada, no cerrada), el `user` en memoria
        // de SessionProvider sigue con emailVerified: false — sin esto, el
        // botón de crear marcador seguiría deshabilitado hasta cerrar y
        // reabrir la app del todo. Sin sesión en este dispositivo, no hace
        // nada (ver refreshUser).
        await refreshUser();
        if (!cancelled) setState('success');
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof ApiError ? err.message : 'No se pudo verificar el email');
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, refreshUser]);

  return (
    <ThemedView style={styles.container}>
      {state === 'verifying' && <ThemedText themeColor="textSecondary">Verificando tu email…</ThemedText>}

      {state === 'success' && (
        <>
          <ThemedText type="subtitle">¡Email verificado!</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.message}>
            Ya puedes crear marcadores y dejar reseñas.
          </ThemedText>
          <AppButton label="Continuar" onPress={() => router.replace('/map')} />
        </>
      )}

      {state === 'error' && (
        <>
          <ThemedText type="subtitle" themeColor="danger">
            No se pudo verificar
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.message}>
            {errorMessage} Si el enlace ha caducado, pide uno nuevo desde tu perfil.
          </ThemedText>
          <AppButton label="Continuar" onPress={() => router.replace('/map')} />
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  message: {
    textAlign: 'center',
  },
});
