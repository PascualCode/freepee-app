import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { WheelchairAccess } from '@/lib/api/client';
import { formatWheelchairAccess, getWheelchairAccessColor } from '@/utils/format';

const WHEELCHAIR_OPTIONS: WheelchairAccess[] = ['COMPLETA', 'PARCIAL', 'NINGUNA'];

interface MarkerWheelchairFieldProps {
  value: WheelchairAccess | null;
  onChange: (value: WheelchairAccess | null) => void;
}

// Calcado de MarkerGenderField (mismo pillRow + punto de color), con una
// diferencia: aquí SÍ hace falta una pill "Sin especificar" que ponga el
// valor a `null` — a diferencia de género (obligatorio, siempre hay uno
// elegido), este campo es opcional de verdad, así que hace falta una forma
// de volver a "sin dato" al editar un marcador que ya tenía un valor.
export function MarkerWheelchairField({ value, onChange }: MarkerWheelchairFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={styles.fieldLabel}>
        Accesibilidad en silla de ruedas
      </ThemedText>
      <View style={styles.pillRow}>
        {WHEELCHAIR_OPTIONS.map((option) => {
          const color = getWheelchairAccessColor(option);
          const selected = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[styles.pill, { borderColor: color }, selected && { backgroundColor: color }]}
              accessibilityRole="button">
              <View style={[styles.dot, { backgroundColor: selected ? '#ffffff' : color }]} />
              <ThemedText type="small" style={selected ? styles.selectedLabel : { color }}>
                {formatWheelchairAccess(option)}
              </ThemedText>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => onChange(null)}
          style={[styles.pill, { borderColor: theme.border }, value === null && { backgroundColor: theme.border }]}
          accessibilityRole="button">
          <ThemedText type="small" themeColor={value === null ? undefined : 'textSecondary'}>
            Sin especificar
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  fieldLabel: {
    marginLeft: Spacing.half,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  selectedLabel: {
    color: '#ffffff',
  },
});
