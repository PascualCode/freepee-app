import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MarkerGender, MarkerType } from '@/lib/api/client';
import { formatMarkerGender, formatMarkerType, getMarkerGenderColor } from '@/utils/format';
import { EMPTY_SEARCH_FILTERS, hasActiveFilters, type MarkerSearchFilters } from '@/utils/marker-search-filters';

const DISTANCE_OPTIONS: { km: number | null; label: string }[] = [
  { km: null, label: 'Sin límite' },
  { km: 1, label: '1 km' },
  { km: 3, label: '3 km' },
  { km: 5, label: '5 km' },
  { km: 10, label: '10 km' },
  { km: 20, label: '20 km' },
];

const TYPE_OPTIONS: MarkerType[] = ['AIRE_LIBRE', 'PUBLICO', 'PRIVADO'];
const GENDER_OPTIONS: MarkerGender[] = ['MASCULINO', 'FEMENINO', 'MIXTO', 'PIPICAN'];
const RATING_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Sin mínimo' },
  { value: 3, label: '3+' },
  { value: 4, label: '4+' },
  { value: 5, label: '5' },
];

interface SearchFiltersPanelProps {
  filters: MarkerSearchFilters;
  onChange: (filters: MarkerSearchFilters) => void;
}

// Controles de "Ajustes" (ver BottomNavBar, que abre esto en un bottom
// sheet) — solo dejan configurado el filtro; la búsqueda en sí la dispara
// el botón "Buscar" del mapa (ver NearbyMarkersMap), que lee este mismo
// estado.
export function SearchFiltersPanel({ filters, onChange }: SearchFiltersPanelProps) {
  const theme = useTheme();

  function toggleType(type: MarkerType) {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onChange({ ...filters, types: next });
  }

  function toggleGender(gender: MarkerGender) {
    const next = filters.genders.includes(gender)
      ? filters.genders.filter((g) => g !== gender)
      : [...filters.genders, gender];
    onChange({ ...filters, genders: next });
  }

  return (
    <View style={styles.panel}>
      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Distancia
        </ThemedText>
        <View style={styles.pillRow}>
          {DISTANCE_OPTIONS.map((option) => {
            const selected = filters.radiusKm === option.km;
            return (
              <Pressable
                key={String(option.km)}
                onPress={() => onChange({ ...filters, radiusKm: option.km })}
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

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Tipo
        </ThemedText>
        <View style={styles.pillRow}>
          {TYPE_OPTIONS.map((type) => {
            const selected = filters.types.includes(type);
            return (
              <Pressable
                key={type}
                onPress={() => toggleType(type)}
                style={[
                  styles.pill,
                  { borderColor: theme.border },
                  selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
                accessibilityRole="button">
                <ThemedText type="small" style={selected ? { color: theme.onPrimary } : undefined}>
                  {formatMarkerType(type)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Género
        </ThemedText>
        <View style={styles.pillRow}>
          {GENDER_OPTIONS.map((gender) => {
            const color = getMarkerGenderColor(gender);
            const selected = filters.genders.includes(gender);
            return (
              <Pressable
                key={gender}
                onPress={() => toggleGender(gender)}
                style={[styles.pill, { borderColor: color }, selected && { backgroundColor: color }]}
                accessibilityRole="button">
                <ThemedText type="small" style={selected ? styles.selectedLabel : { color }}>
                  {formatMarkerGender(gender)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Comodidad mínima
        </ThemedText>
        <View style={styles.pillRow}>
          {RATING_OPTIONS.map((option) => {
            const selected = filters.minComodidad === option.value;
            return (
              <Pressable
                key={String(option.value)}
                onPress={() => onChange({ ...filters, minComodidad: option.value })}
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

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Higiene mínima
        </ThemedText>
        <View style={styles.pillRow}>
          {RATING_OPTIONS.map((option) => {
            const selected = filters.minHigiene === option.value;
            return (
              <Pressable
                key={String(option.value)}
                onPress={() => onChange({ ...filters, minHigiene: option.value })}
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

      {hasActiveFilters(filters) && (
        <Pressable onPress={() => onChange(EMPTY_SEARCH_FILTERS)} accessibilityRole="button">
          <ThemedText type="small" themeColor="primary">
            Limpiar filtros
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.three,
    paddingTop: Spacing.one,
  },
  field: {
    gap: Spacing.one,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pill: {
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  selectedLabel: {
    color: '#ffffff',
  },
});
