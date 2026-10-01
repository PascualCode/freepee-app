import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { MarkerGender } from '@/lib/api/client';
import { formatMarkerGender, getMarkerGenderColor } from '@/utils/format';

export const GENDER_OPTIONS: MarkerGender[] = ['MASCULINO', 'FEMENINO', 'MIXTO', 'PIPICAN'];

interface MarkerGenderFieldProps {
  value: MarkerGender | null;
  onChange: (gender: MarkerGender) => void;
}

// Selector de género (pastillas con el color propio de cada opción, ver
// getMarkerGenderColor) compartido entre CreateMarkerModal y
// EditMarkerModal — mismo patrón que MarkerTypePriceFields.
export function MarkerGenderField({ value, onChange }: MarkerGenderFieldProps) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={styles.fieldLabel}>
        Género
      </ThemedText>
      <View style={styles.pillRow}>
        {GENDER_OPTIONS.map((gender) => {
          const color = getMarkerGenderColor(gender);
          const selected = gender === value;
          return (
            <Pressable
              key={gender}
              onPress={() => onChange(gender)}
              style={[styles.pill, { borderColor: color }, selected && { backgroundColor: color }]}
              accessibilityRole="button">
              <View style={[styles.dot, { backgroundColor: selected ? '#ffffff' : color }]} />
              <ThemedText type="small" style={selected ? styles.selectedLabel : { color }}>
                {formatMarkerGender(gender)}
              </ThemedText>
            </Pressable>
          );
        })}
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
