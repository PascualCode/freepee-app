import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useFavorites } from '@/hooks/use-favorites';
import { ThemeOverrideContext, useTheme } from '@/hooks/use-theme';
import { formatMarkerType, formatPrice, getMarkerGenderColor } from '@/utils/format';

// Mismo scaffold que my-markers.tsx (paleta clara forzada, ✕ para volver,
// tarjeta por marcador) — ver el comentario de allí sobre por qué
// useTheme() vive en un componente hijo del Provider. Sin editar/eliminar
// (eso es cosa de "Mis marcadores"): la única acción aquí es "Quitar de
// favoritos", de un solo tap — reversible, no necesita confirmación en dos
// pasos como borrar un marcador de verdad.
export default function FavoritesScreen() {
  return (
    <ThemeOverrideContext.Provider value="light">
      <FavoritesContent />
    </ThemeOverrideContext.Provider>
  );
}

function FavoritesContent() {
  const theme = useTheme();
  const { favorites, loading, toggleFavorite } = useFavorites();

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            style={styles.backButton}>
            <ThemedText type="linkPrimary" style={styles.closeButtonText}>
              ✕
            </ThemedText>
          </Pressable>

          <ThemedText type="subtitle">Favoritos</ThemedText>

          {loading && <ThemedText themeColor="textSecondary">Cargando…</ThemedText>}
          {!loading && favorites.length === 0 && (
            <Card style={styles.emptyCard}>
              <ThemedText themeColor="textSecondary" style={styles.centerText}>
                Todavía no has guardado ningún marcador. Toca el corazón en el
                detalle de un marcador para guardarlo aquí.
              </ThemedText>
            </Card>
          )}

          {favorites.map((marker) => {
            const price = formatPrice(marker.priceType, marker.amount);
            return (
              <Card key={marker.id} style={styles.markerCard}>
                <Pressable onPress={() => router.push(`/marker/${marker.id}`)}>
                  <View style={styles.markerHeader}>
                    <ThemedText type="smallBold" style={styles.markerTitle} numberOfLines={2}>
                      {marker.title}
                    </ThemedText>
                    <View style={[styles.typeBadge, { backgroundColor: theme.primarySoft }]}>
                      <View style={[styles.genderDot, { backgroundColor: getMarkerGenderColor(marker.gender) }]} />
                      <ThemedText type="small" themeColor="primary">
                        {formatMarkerType(marker.type)}
                      </ThemedText>
                    </View>
                  </View>
                  {price && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {price}
                    </ThemedText>
                  )}
                </Pressable>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <Pressable
                  onPress={() => toggleFavorite(marker.id)}
                  style={[styles.actionButton, { borderColor: theme.danger }]}
                  accessibilityRole="button">
                  <ThemedText type="smallBold" themeColor="danger">
                    Quitar de favoritos
                  </ThemedText>
                </Pressable>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  backButton: {
    alignSelf: 'flex-start',
    // ~2mm más abajo, pedido explícitamente (160dp/pulgada → 1mm ≈ 6.3dp).
    marginTop: 12.6,
  },
  closeButtonText: {
    fontSize: 22,
    lineHeight: 26,
  },
  centerText: {
    textAlign: 'center',
  },
  emptyCard: {
    alignItems: 'center',
  },
  markerCard: {
    gap: Spacing.two,
  },
  markerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  markerTitle: {
    flex: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  genderDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  divider: {
    height: 1,
  },
  actionButton: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
