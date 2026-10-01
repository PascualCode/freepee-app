import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppTextField } from '@/components/ui/app-text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MarkerType, PriceType } from '@/lib/api/client';

export const TYPE_OPTIONS: { value: MarkerType; label: string }[] = [
  { value: 'AIRE_LIBRE', label: 'Aire libre' },
  { value: 'PUBLICO', label: 'Público' },
  { value: 'PRIVADO', label: 'Privado' },
];

// Espejo de validatePricing en server/src/routes/markers.ts — qué opciones
// de precio tiene sentido ofrecer según el tipo, para no dejar elegir una
// combinación que el backend fuera a rechazar de todos modos. Compartido
// entre CreateMarkerModal y EditMarkerModal para que ambos formularios no
// puedan divergir de este espejo con el tiempo.
export const PRICE_OPTIONS_BY_TYPE: Record<MarkerType, { value: PriceType | null; label: string }[]> = {
  AIRE_LIBRE: [],
  PUBLICO: [
    { value: null, label: 'Gratis' },
    { value: 'PRECIO', label: 'De pago' },
  ],
  PRIVADO: [
    { value: 'GRATIS', label: 'Gratis' },
    { value: 'CONSUMICION', label: 'Con consumición' },
    { value: 'PRECIO', label: 'De pago' },
  ],
};

export function initialPriceType(type: MarkerType): PriceType | null {
  return PRICE_OPTIONS_BY_TYPE[type][0]?.value ?? null;
}

interface MarkerTypePriceFieldsProps {
  type: MarkerType;
  priceType: PriceType | null;
  amount: string;
  onTypeChange: (type: MarkerType) => void;
  onPriceTypeChange: (priceType: PriceType | null) => void;
  onAmountChange: (amount: string) => void;
}

// Selector de tipo + precio (pastillas) usado tanto al crear como al editar
// un marcador — misma UI, misma validación espejo, un solo sitio que
// mantener.
export function MarkerTypePriceFields({
  type,
  priceType,
  amount,
  onTypeChange,
  onPriceTypeChange,
  onAmountChange,
}: MarkerTypePriceFieldsProps) {
  const theme = useTheme();
  const priceOptions = PRICE_OPTIONS_BY_TYPE[type];

  function handleTypeChange(next: MarkerType) {
    onTypeChange(next);
    onPriceTypeChange(initialPriceType(next));
    onAmountChange('');
  }

  return (
    <>
      <View style={styles.field}>
        <ThemedText type="smallBold" style={styles.fieldLabel}>
          Tipo
        </ThemedText>
        <View style={styles.pillRow}>
          {TYPE_OPTIONS.map((option) => {
            const selected = option.value === type;
            return (
              <Pressable
                key={option.value}
                onPress={() => handleTypeChange(option.value)}
                style={[
                  styles.pill,
                  { borderColor: theme.border },
                  selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
                accessibilityRole="button">
                <ThemedText type="small" style={selected ? { color: theme.onPrimary } : undefined}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {priceOptions.length > 0 && (
        <View style={styles.field}>
          <ThemedText type="smallBold" style={styles.fieldLabel}>
            Precio
          </ThemedText>
          <View style={styles.pillRow}>
            {priceOptions.map((option) => {
              const selected = option.value === priceType;
              return (
                <Pressable
                  key={String(option.value)}
                  onPress={() => {
                    onPriceTypeChange(option.value);
                    if (option.value !== 'PRECIO') onAmountChange('');
                  }}
                  style={[
                    styles.pill,
                    { borderColor: theme.border },
                    selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  accessibilityRole="button">
                  <ThemedText type="small" style={selected ? { color: theme.onPrimary } : undefined}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {priceType === 'PRECIO' && (
        <AppTextField
          label="Precio (€)"
          value={amount}
          onChangeText={onAmountChange}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
      )}
    </>
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
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
