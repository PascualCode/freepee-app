import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Wordmark } from '@/components/wordmark';
import { Spacing } from '@/constants/theme';
import { ThemeOverrideContext } from '@/hooks/use-theme';

// Mismo fondo que ya usaba GlassCard en login/register, reutilizado aquí
// como panel lateral en vez de imagen de pantalla completa.
const AUTH_IMAGE = require('@/assets/images/auth-background.jpg');

// A partir de aquí hay espacio real para mostrar la foto al lado del
// formulario (diseño de dos columnas, como la referencia). Por debajo,
// pantallas nativas/web estrechas: una sola columna, solo el formulario —
// no hay hueco para una columna de foto sin comprimir el formulario.
const WIDE_BREAKPOINT = 900;

interface AuthSplitLayoutProps {
  // Lado en el que va la foto — login la lleva a la derecha, registro a la
  // izquierda (pedido explícitamente así).
  imageSide: 'left' | 'right';
  children: ReactNode;
}

// Layout de dos columnas para login/registro: panel claro con el
// formulario a un lado, foto de fondo al otro — sustituye al diseño
// anterior (glassmorphism sobre foto a pantalla completa). El panel del
// formulario no tiene variante oscura (ver GlassCard/ThemeOverrideContext),
// así que se fuerza aquí también a la paleta clara.
export function AuthSplitLayout({ imageSide, children }: AuthSplitLayoutProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const formPanel = (
    <ThemeOverrideContext.Provider value="light">
      <KeyboardAvoidingView
        style={[styles.formPanel, !isWide && styles.formPanelNarrow]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Wordmark type="smallBold" style={styles.brand} />
        <ScrollView contentContainerStyle={styles.formScrollContent} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemeOverrideContext.Provider>
  );

  const photoPanel = isWide && <Image source={AUTH_IMAGE} style={styles.photoPanel} resizeMode="cover" />;

  return (
    <View style={styles.root}>
      {imageSide === 'left' && photoPanel}
      {formPanel}
      {imageSide === 'right' && photoPanel}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
  },
  formPanel: {
    width: 480,
    maxWidth: '100%',
    paddingHorizontal: Spacing.six,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.four,
  },
  formPanelNarrow: {
    flex: 1,
    width: '100%',
    paddingHorizontal: Spacing.four,
  },
  brand: {
    fontSize: 18,
    marginBottom: Spacing.six,
  },
  formScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  photoPanel: {
    flex: 1,
    height: '100%',
  },
});
