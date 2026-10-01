import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = ViewProps;

// Contenedor con esquinas redondeadas + sombra sutil reutilizable en toda
// la app (formularios, listados de marcadores, etc.), no solo en auth.
// Borde explícito (no solo sombra) para que el límite de la tarjeta sea
// nítido incluso cuando el fondo de la página es del mismo tono que la
// tarjeta (p. ej. blanco sobre blanco) — la sombra sola no basta ahí.
export function Card({ style, ...rest }: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    padding: Spacing.four,
    borderWidth: 1,
    // boxShadow (string unificado, soportado desde RN 0.76+) en vez de
    // shadow*/elevation por separado, para que se vea igual en iOS/Android.
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.06)',
  },
});
