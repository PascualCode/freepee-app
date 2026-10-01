import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

interface RatingFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

// Selector de puntuación 1-5 (pastillas), mismo patrón visual que las
// pastillas de tipo/precio en marker-type-price-fields.tsx — reutilizado
// para comodidad e higiene, los dos únicos ejes de valoración de la app
// (nunca un "score" combinado inventado, ver CLAUDE.md).
export function RatingField({ label, value, onChange }: RatingFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={styles.fieldLabel}>
        {label}
      </ThemedText>
      <View style={styles.pillRow}>
        {RATING_VALUES.map((n) => {
          const selected = n === value;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={[
                styles.pill,
                { borderColor: theme.border },
                selected && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}>
              <ThemedText type="small" style={selected ? { color: theme.onPrimary } : undefined}>
                {n}
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
    gap: Spacing.two,
  },
  pill: {
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
