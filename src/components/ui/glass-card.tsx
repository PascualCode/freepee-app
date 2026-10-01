import { BlurView } from 'expo-blur';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { ThemeOverrideContext } from '@/hooks/use-theme';

export type GlassCardProps = ViewProps;

// Tarjeta con efecto glassmorphism, reutilizable en cualquier pantalla con
// fondo de imagen (por ahora login/register). BlurView (expo-blur) ya trae
// implementación real con blur de sistema nativo.
//
// El tinte blanco va en una capa aparte (no en el propio BlurView) porque
// BlurView calcula su color de fondo internamente a partir de
// tint/intensity y lo aplica DESPUÉS del style del caller, así que un
// backgroundColor pasado directamente quedaría sobrescrito.
//
// El tinte es blanco fijo, sin variante oscura — por eso todo lo de dentro
// se fuerza a la paleta clara vía ThemeOverrideContext, pase lo que pase
// con el modo oscuro del sistema (ver hooks/use-theme.ts). Sin esto, un
// sistema en modo oscuro pintaba labels/texto en blanco (theme.text)
// encima de esta misma tarjeta blanca — prácticamente invisibles.
export function GlassCard({ style, children, ...rest }: GlassCardProps) {
  return (
    <BlurView intensity={70} tint="light" style={[styles.blur, style]} {...rest}>
      <View style={[StyleSheet.absoluteFill, styles.tint]} pointerEvents="none" />
      <View style={styles.content}>
        <ThemeOverrideContext.Provider value="light">{children}</ThemeOverrideContext.Provider>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
  },
  tint: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
