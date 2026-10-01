import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { MarkerReviewForm } from '@/components/marker-review-form';
import { HeartIcon } from '@/components/nav-icons';
import { ReportModal } from '@/components/report-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { APP_NAME } from '@/constants/brand';
import { Radius, Spacing } from '@/constants/theme';
import { useActiveRoute } from '@/hooks/use-active-route';
import { useFavorites } from '@/hooks/use-favorites';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/lib/api/client';
import type { CreateReportInput, MarkerWithReviews, ReportReason } from '@/lib/api/client';
import { useSession } from '@/lib/auth/session';
import { formatMarkerGender, formatMarkerType, formatPrice, formatWheelchairAccess, getWheelchairAccessColor } from '@/utils/format';

// "Sitio cerrado" solo tiene sentido para un marcador, no para una reseña —
// ver ReportModal, reutilizado con distinta lista de motivos según el caso.
const MARKER_REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'SITIO_CERRADO', label: 'Sitio cerrado' },
  { value: 'INFORMACION_INCORRECTA', label: 'Información incorrecta' },
  { value: 'CONTENIDO_INAPROPIADO', label: 'Contenido inapropiado' },
  { value: 'OTRO', label: 'Otro' },
];

const REVIEW_REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'CONTENIDO_INAPROPIADO', label: 'Contenido inapropiado' },
  { value: 'INFORMACION_INCORRECTA', label: 'Información incorrecta' },
  { value: 'OTRO', label: 'Otro' },
];

export default function MarkerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const theme = useTheme();
  const { setRoute } = useActiveRoute();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [marker, setMarker] = useState<MarkerWithReviews | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // "Cómo llegar" — pide ubicación + la ruta al backend, guarda el
  // resultado en useActiveRoute() y vuelve al mapa (que la dibuja, ver
  // NearbyMarkersMap). Sin sesión también funciona: es una acción de solo
  // lectura, mismo criterio que ver el mapa/marcador en sí.
  const [routeRequest, setRouteRequest] = useState<'idle' | 'loading' | 'error'>('idle');
  const [routeError, setRouteError] = useState<string | null>(null);
  // Reportar marcador o una reseña ajena — mismo ReportModal reutilizado,
  // `reportReviewId` distingue el caso (null = se está reportando el propio
  // marcador).
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReviewId, setReportReviewId] = useState<string | null>(null);
  // Reabrir el formulario para editar la reseña propia ya publicada — ver
  // el comentario de onCancel en MarkerReviewForm. Se resetea solo (queda
  // en false) cuando myReview desaparece por completo, no hace falta un
  // efecto: showReviewForm de más abajo ya cubre ese caso.
  const [isEditingReview, setIsEditingReview] = useState(false);
  // Confirmación de borrado en dos pasos, igual que en "Mis marcadores" —
  // sin Alert.alert, dentro de la propia card de la reseña.
  const [confirmingDeleteReview, setConfirmingDeleteReview] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);
  const [deleteReviewError, setDeleteReviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getMarkerById(id);
        if (!cancelled) setMarker(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudo cargar el marcador');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Tras guardar la reseña propia (MarkerReviewForm) — recarga el marcador
  // completo para que tanto la card de la reseña como el resto del listado
  // reflejen el cambio, sin gestionar el estado a mano.
  async function refreshMarker() {
    if (!id) return;
    try {
      const result = await api.getMarkerById(id);
      setMarker(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el marcador');
    }
  }

  async function handleGetRoute() {
    if (!marker) return;
    setRouteRequest('loading');
    setRouteError(null);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setRouteError('Necesitamos tu ubicación para calcular la ruta');
      setRouteRequest('error');
      return;
    }

    let position: Location.LocationObject;
    try {
      position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    } catch {
      setRouteError('No se pudo obtener tu ubicación');
      setRouteRequest('error');
      return;
    }

    try {
      const result = await api.getMarkerRoute({
        id: marker.id,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setRoute({
        markerId: marker.id,
        coordinates: result.coordinates,
        distanceM: result.distanceM,
        durationS: result.durationS,
      });
      setRouteRequest('idle');
      router.back();
    } catch (err) {
      setRouteError(err instanceof ApiError ? err.message : 'No se pudo calcular la ruta');
      setRouteRequest('error');
    }
  }

  // Deep link con el custom scheme de la app (pipiapp:// — identificador
  // técnico, desacoplado a propósito del nombre visible, ver
  // constants/brand.ts) — solo abre el marcador en un dispositivo que ya
  // tenga FreePee instalada (sin dominio web al que hacer fallback, app
  // mobile-only). Aceptable para el grupo cerrado actual, ver CLAUDE.md →
  // Pendiente / deuda técnica.
  async function handleShare() {
    if (!marker) return;
    try {
      await Share.share({
        message: `${marker.title} en ${APP_NAME}\n${formatMarkerType(marker.type)} · ${formatMarkerGender(marker.gender)}\npipiapp://marker/${marker.id}`,
      });
    } catch {
      // Cancelar el share no es un error a mostrar.
    }
  }

  async function handleDeleteReview() {
    if (!id) return;
    setDeleteReviewError(null);
    setDeletingReview(true);
    try {
      await api.deleteReview(id);
      setConfirmingDeleteReview(false);
      await refreshMarker();
    } catch (err) {
      // Igual que en "Mis marcadores": si falla, se queda en modo
      // confirmación con el error debajo, no se pierde el contexto.
      setDeleteReviewError(err instanceof ApiError ? err.message : 'No se pudo borrar la reseña');
    } finally {
      setDeletingReview(false);
    }
  }

  const price = marker ? formatPrice(marker.priceType, marker.amount) : null;
  // La reseña propia (a lo sumo una, ver @@unique([authorId, markerId]) en
  // el schema) siempre aparece primera en el listado de abajo, con
  // editar/borrar — nunca se muestra dos veces.
  const myReview = marker && user ? (marker.reviews.find((review) => review.author.id === user.id) ?? null) : null;
  const otherReviews = marker ? marker.reviews.filter((review) => review.id !== myReview?.id) : [];
  // El formulario de crear/editar solo se ve mientras no hay reseña propia
  // todavía, o mientras se está editando la ya publicada (ver "Editar" en
  // su card, más abajo) — pedido explícitamente así: una vez publicada, el
  // hueco de creación desaparece y la reseña vive en el listado.
  const showReviewForm = !myReview || isEditingReview;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Cerrar">
          <ThemedText type="linkPrimary" style={styles.closeButton}>
            ✕
          </ThemedText>
        </Pressable>

        {loading && <ThemedText themeColor="textSecondary">Cargando…</ThemedText>}
        {error && (
          <ThemedText themeColor="danger" style={styles.error}>
            {error}
          </ThemedText>
        )}

        {marker && (
          <>
            <Card style={styles.card}>
              {marker.imageUrl && <Image source={{ uri: marker.imageUrl }} style={styles.image} contentFit="cover" />}
              <View style={styles.titleRow}>
                <ThemedText type="subtitle" style={styles.titleText}>
                  {marker.title}
                </ThemedText>
                {user && (
                  <Pressable
                    onPress={() => toggleFavorite(marker.id)}
                    accessibilityRole="button"
                    accessibilityLabel={isFavorite(marker.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                    hitSlop={Spacing.two}>
                    <HeartIcon size={26} color={isFavorite(marker.id) ? theme.danger : theme.border} />
                  </Pressable>
                )}
              </View>
              <ThemedText themeColor="textSecondary">
                {formatMarkerType(marker.type)} · {formatMarkerGender(marker.gender)}
                {price ? ` · ${price}` : ''}
              </ThemedText>
              {marker.wheelchairAccess && (
                <ThemedText type="small" style={{ color: getWheelchairAccessColor(marker.wheelchairAccess) }}>
                  {formatWheelchairAccess(marker.wheelchairAccess)}
                </ThemedText>
              )}
              {marker.openingHours ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Horario: {marker.openingHours}
                </ThemedText>
              ) : null}
              {marker.description ? <ThemedText>{marker.description}</ThemedText> : null}
              <View style={styles.actionsRow}>
                <View style={styles.actionButtonFlex}>
                  <AppButton label="Cómo llegar" onPress={handleGetRoute} loading={routeRequest === 'loading'} />
                </View>
                <View style={styles.actionButtonFlex}>
                  <AppButton label="Compartir" variant="secondary" onPress={handleShare} />
                </View>
              </View>
              {routeRequest === 'error' && routeError && (
                <ThemedText type="small" themeColor="danger">
                  {routeError}
                </ThemedText>
              )}
              <Pressable
                onPress={() => {
                  setReportReviewId(null);
                  setReportModalVisible(true);
                }}
                accessibilityRole="button">
                <ThemedText type="small" themeColor="danger">
                  Reportar
                </ThemedText>
              </Pressable>
            </Card>

            {user ? (
              showReviewForm && (
                <MarkerReviewForm
                  markerId={marker.id}
                  existingReview={myReview}
                  onSaved={() => {
                    setIsEditingReview(false);
                    refreshMarker();
                  }}
                  onCancel={myReview ? () => setIsEditingReview(false) : undefined}
                />
              )
            ) : (
              <Card style={styles.card}>
                <ThemedText>Inicia sesión para dejar tu reseña.</ThemedText>
                <AppButton label="Iniciar sesión" onPress={() => router.push('/login')} />
              </Card>
            )}

            <ThemedText type="subtitle" style={styles.reviewsTitle}>
              Reseñas{marker.reviews.length > 0 ? ` (${marker.reviews.length})` : ''}
            </ThemedText>

            {marker.reviews.length === 0 && (
              <ThemedText themeColor="textSecondary">Todavía no hay reseñas para este marcador.</ThemedText>
            )}

            {myReview && !isEditingReview && (
              <Card style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewHeaderTitleRow}>
                    <ThemedText type="smallBold">{myReview.author.name}</ThemedText>
                    <View style={[styles.ownTag, { backgroundColor: theme.primarySoft }]}>
                      <ThemedText type="small" themeColor="primary">
                        Tú
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    Comodidad {myReview.comodidad}/5 · Higiene {myReview.higiene}/5
                  </ThemedText>
                </View>
                {myReview.text ? <ThemedText type="small">{myReview.text}</ThemedText> : null}

                {confirmingDeleteReview ? (
                  <View style={[styles.confirmBox, { backgroundColor: `${theme.danger}14`, borderColor: theme.danger }]}>
                    <ThemedText type="small" themeColor="danger" style={styles.confirmText}>
                      {deleteReviewError ?? '¿Borrar tu reseña? No se puede deshacer.'}
                    </ThemedText>
                    <View style={styles.reviewActionsRow}>
                      <Pressable
                        onPress={() => {
                          setDeleteReviewError(null);
                          setConfirmingDeleteReview(false);
                        }}
                        accessibilityRole="button">
                        <ThemedText type="smallBold">Cancelar</ThemedText>
                      </Pressable>
                      <Pressable onPress={handleDeleteReview} disabled={deletingReview} accessibilityRole="button">
                        <ThemedText type="smallBold" themeColor="danger">
                          {deletingReview ? 'Borrando…' : 'Sí, borrar'}
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.reviewActionsRow}>
                    <Pressable onPress={() => setIsEditingReview(true)} accessibilityRole="button">
                      <ThemedText type="smallBold" themeColor="primary">
                        Editar
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setDeleteReviewError(null);
                        setConfirmingDeleteReview(true);
                      }}
                      accessibilityRole="button">
                      <ThemedText type="smallBold" themeColor="danger">
                        Borrar
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
              </Card>
            )}

            {otherReviews.map((review) => (
              <Card key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <ThemedText type="smallBold">{review.author.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Comodidad {review.comodidad}/5 · Higiene {review.higiene}/5
                  </ThemedText>
                </View>
                {review.text ? <ThemedText type="small">{review.text}</ThemedText> : null}
                <Pressable
                  onPress={() => {
                    setReportReviewId(review.id);
                    setReportModalVisible(true);
                  }}
                  accessibilityRole="button">
                  <ThemedText type="small" themeColor="danger">
                    Reportar
                  </ThemedText>
                </Pressable>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      {marker && (
        <ReportModal
          visible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          reasons={reportReviewId ? REVIEW_REPORT_REASONS : MARKER_REPORT_REASONS}
          onSubmit={(input: CreateReportInput) =>
            reportReviewId ? api.reportReview(marker.id, reportReviewId, input) : api.reportMarker(marker.id, input)
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  error: {
    textAlign: 'center',
  },
  closeButton: {
    fontSize: 22,
    lineHeight: 26,
    // ~2mm más abajo, pedido explícitamente (160dp/pulgada → 1mm ≈ 6.3dp).
    marginTop: 12.6,
  },
  card: {
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  titleText: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButtonFlex: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: Radius.medium,
  },
  reviewsTitle: {
    marginTop: Spacing.two,
  },
  reviewCard: {
    gap: Spacing.one,
  },
  reviewHeader: {
    gap: Spacing.half,
  },
  reviewHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  ownTag: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  reviewActionsRow: {
    flexDirection: 'row',
    gap: Spacing.four,
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
