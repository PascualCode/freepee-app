import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EditMarkerModal } from '@/components/edit-marker-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { ThemeOverrideContext, useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/lib/api/client';
import type { Marker } from '@/lib/api/client';
import { formatMarkerType, formatPrice, getMarkerGenderColor } from '@/utils/format';

// Forzado a la paleta clara igual que profile.tsx — ver el comentario ahí
// (y CLAUDE.md → Notas técnicas) sobre por qué `useTheme()` tiene que
// vivir en un componente HIJO de este `Provider` (`MyMarkersContent`), no
// en el propio componente que lo crea.
export default function MyMarkersScreen() {
  return (
    <ThemeOverrideContext.Provider value="light">
      <MyMarkersContent />
    </ThemeOverrideContext.Provider>
  );
}

function MyMarkersContent() {
  const theme = useTheme();
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingMarker, setEditingMarker] = useState<Marker | null>(null);
  // Confirmación de borrado en dos pasos, dentro de la propia tarjeta (sin
  // depender de Alert.alert, para un patrón visual consistente con el resto
  // de la app). Solo una fila a la vez.
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await api.getMyMarkers();
      setMarkers(result);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'No se pudieron cargar tus marcadores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    setDeleteError(null);
    setDeletingId(id);
    try {
      await api.deleteMarker(id);
      setMarkers((prev) => prev.filter((marker) => marker.id !== id));
      setConfirmingDeleteId(null);
    } catch (err) {
      // Deliberadamente NO se limpia confirmingDeleteId aquí: si falla, la
      // fila se queda en modo confirmación con el error debajo, en vez de
      // volver a los botones normales y perder el contexto de qué pasó.
      setDeleteError(err instanceof ApiError ? err.message : 'No se pudo eliminar el marcador');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
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

            <ThemedText type="subtitle">Mis marcadores</ThemedText>

            {loading && <ThemedText themeColor="textSecondary">Cargando…</ThemedText>}
            {loadError && (
              <ThemedText themeColor="danger" style={styles.centerText}>
                {loadError}
              </ThemedText>
            )}
            {!loading && !loadError && markers.length === 0 && (
              <Card style={styles.emptyCard}>
                <ThemedText themeColor="textSecondary" style={styles.centerText}>
                  Todavía no has creado ningún marcador.
                </ThemedText>
              </Card>
            )}

            {markers.map((marker) => {
              const price = formatPrice(marker.priceType, marker.amount);
              const isConfirming = confirmingDeleteId === marker.id;
              const isDeleting = deletingId === marker.id;

              return (
                <Card key={marker.id} style={styles.markerCard}>
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

                  {marker.description ? <ThemedText type="small">{marker.description}</ThemedText> : null}

                  <View style={[styles.divider, { backgroundColor: theme.border }]} />

                  {isConfirming ? (
                    <View
                      style={[
                        styles.confirmBox,
                        { backgroundColor: `${theme.danger}14`, borderColor: theme.danger },
                      ]}>
                      <ThemedText type="small" themeColor="danger" style={styles.confirmText}>
                        {deleteError ?? '¿Eliminar este marcador? No se puede deshacer.'}
                      </ThemedText>
                      <View style={styles.actionsRow}>
                        <Pressable
                          onPress={() => {
                            setDeleteError(null);
                            setConfirmingDeleteId(null);
                          }}
                          style={[styles.actionButton, { borderColor: theme.border }]}
                          accessibilityRole="button">
                          <ThemedText type="smallBold">Cancelar</ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={() => handleDelete(marker.id)}
                          disabled={isDeleting}
                          style={[styles.actionButton, { borderColor: theme.danger }, isDeleting && styles.actionDisabled]}
                          accessibilityRole="button">
                          <ThemedText type="smallBold" themeColor="danger">
                            {isDeleting ? 'Eliminando…' : 'Sí, eliminar'}
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.actionsRow}>
                      <Pressable
                        onPress={() => setEditingMarker(marker)}
                        style={[styles.actionButton, { borderColor: theme.primary }]}
                        accessibilityRole="button">
                        <ThemedText type="smallBold" themeColor="primary">
                          Editar
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setDeleteError(null);
                          setConfirmingDeleteId(marker.id);
                        }}
                        style={[styles.actionButton, { borderColor: theme.danger }]}
                        accessibilityRole="button">
                        <ThemedText type="smallBold" themeColor="danger">
                          Eliminar
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        </ScrollView>
      </ThemedView>

      <EditMarkerModal
        visible={editingMarker != null}
        marker={editingMarker}
        onClose={() => setEditingMarker(null)}
        onUpdated={(updated) => {
          setMarkers((prev) => prev.map((marker) => (marker.id === updated.id ? updated : marker)));
          setEditingMarker(null);
        }}
      />
    </>
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
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  confirmBox: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  confirmText: {
    textAlign: 'center',
  },
});
