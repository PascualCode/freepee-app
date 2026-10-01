import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GENDER_OPTIONS } from '@/components/marker-gender-field';
import { InfoIcon } from '@/components/nav-icons';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { formatMarkerGender, getMarkerGenderColor } from '@/utils/format';

interface MapLegendProps {
  // Misma posición vertical que "reubicarme" en nearby-markers-map.tsx
  // (Spacing.four + SEARCH_BUTTON_RESERVED_SPACE), pero a la izquierda —
  // el caller pasa el mismo número, aquí solo se usa para el botón y para
  // calcular dónde queda el panel encima.
  bottom: number;
}

const BUTTON_SIZE = 44;

// Botón "i" flotante (abajo a la izquierda, mismo diseño cerrado —
// colores fijos, no theme.* — que el resto de controles nativos sobre el
// mapa: BottomNavBar, "reubicarme", "Inicio de sesión") que despliega un
// panel pequeño con la leyenda de colores del mapa (género del marcador,
// ver getMarkerGenderColor/formatMarkerGender). Primer popover "ligero" de
// la app — el resto de contenido extra usa un Modal de bottom-sheet a
// pantalla completa, desproporcionado para 4 filas de texto.
export function MapLegend({ bottom }: MapLegendProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <Pressable
          style={styles.overlay}
          onPress={() => setOpen(false)}
          accessibilityLabel="Cerrar leyenda"
        />
      )}

      {open && (
        <View style={[styles.panel, { bottom: bottom + BUTTON_SIZE + Spacing.two }]}>
          <ThemedText type="smallBold" style={styles.title}>
            Colores del mapa
          </ThemedText>
          {GENDER_OPTIONS.map((gender) => (
            <View key={gender} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: getMarkerGenderColor(gender) }]} />
              <ThemedText type="small" style={styles.label}>
                {formatMarkerGender(gender)}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => setOpen((value) => !value)}
        style={[styles.button, { bottom }]}
        accessibilityRole="button"
        accessibilityLabel="Leyenda del mapa">
        <InfoIcon size={22} color="#000000" />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  button: {
    position: 'absolute',
    left: Spacing.three,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: Radius.pill,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
    zIndex: 2,
  },
  panel: {
    position: 'absolute',
    left: Spacing.three,
    backgroundColor: '#ffffff',
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
    zIndex: 2,
  },
  title: {
    color: '#000000',
    marginBottom: Spacing.half,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    color: '#000000',
  },
});
