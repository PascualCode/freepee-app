import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { ThemeOverrideContext, useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/lib/api/client';
import type { MarkerStats } from '@/lib/api/client';
import { useSession } from '@/lib/auth/session';

type ResendState = 'idle' | 'sending' | 'sent' | 'error';

// Solo lectura y a modo de resumen, a propósito (pedido explícitamente
// así) — no hay edición de perfil todavía, ni campos que no existan de
// verdad en el modelo de datos (sin "género"/"país"/"idioma" inventados
// solo por parecerse a una referencia visual).
function StatTile({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.statTile, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={[styles.statAccent, { backgroundColor: theme.primary }]} />
      <ThemedText type="title" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

// Página propia de superficie clara (banner + tarjetas blancas con borde)
// sin variante oscura — forzada a la paleta clara igual que
// GlassCard/AuthSplitLayout (ver CLAUDE.md → Notas técnicas). El
// `useTheme()` real vive en `ProfileContent`, un componente HIJO de este
// `Provider` — llamarlo aquí mismo, en el componente que crea el
// `Provider`, leería el contexto de fuera (el del sistema), no el que
// este mismo componente está a punto de establecer para sus hijos.
export default function ProfileScreen() {
  return (
    <ThemeOverrideContext.Provider value="light">
      <ProfileContent />
    </ThemeOverrideContext.Provider>
  );
}

function ProfileContent() {
  const theme = useTheme();
  const { user, logout } = useSession();
  const [stats, setStats] = useState<MarkerStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resendState, setResendState] = useState<ResendState>('idle');
  const [resendError, setResendError] = useState<string | null>(null);
  // Confirmación en dos pasos, mismo patrón que "Eliminar" en
  // my-markers.tsx (sin Alert.alert).
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    setDeleteAccountError(null);
    setDeletingAccount(true);
    try {
      await api.deleteAccount();
      await logout();
    } catch (err) {
      setDeleteAccountError(err instanceof ApiError ? err.message : 'No se pudo eliminar la cuenta');
      setDeletingAccount(false);
    }
  }

  async function handleResendVerification() {
    setResendState('sending');
    setResendError(null);
    try {
      await api.resendVerification();
      setResendState('sent');
    } catch (err) {
      setResendError(err instanceof ApiError ? err.message : 'No se pudo reenviar el correo');
      setResendState('error');
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await api.getMyStats();
        if (!cancelled) setStats(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las estadísticas');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = user?.name ?? user?.username ?? 'Tu cuenta';
  const initial = displayName.charAt(0).toUpperCase();

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

          <View style={[styles.banner, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}>
            <View style={[styles.bannerAccent, { backgroundColor: theme.primary }]} />
          </View>

          <Card style={styles.profileCard}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <ThemedText type="subtitle" style={{ color: theme.onPrimary }}>
                {initial}
              </ThemedText>
            </View>
            <View style={styles.profileInfo}>
              <ThemedText type="subtitle" numberOfLines={1}>
                {displayName}
              </ThemedText>
              {user?.username && (
                <ThemedText themeColor="textSecondary" numberOfLines={1}>
                  @{user.username}
                </ThemedText>
              )}
              {user?.email && (
                <ThemedText themeColor="textSecondary" numberOfLines={1}>
                  {user.email}
                </ThemedText>
              )}
            </View>
          </Card>

          {user && !user.emailVerified && (
            <Card style={styles.verificationCard}>
              <ThemedText type="smallBold">Email sin verificar</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Verifica tu email para poder crear marcadores y dejar reseñas.
              </ThemedText>
              {resendState === 'sent' ? (
                <ThemedText type="small" themeColor="primary">
                  Correo reenviado — revisa tu bandeja de entrada.
                </ThemedText>
              ) : (
                <AppButton
                  label="Reenviar email de verificación"
                  variant="secondary"
                  onPress={handleResendVerification}
                  loading={resendState === 'sending'}
                />
              )}
              {resendError && (
                <ThemedText type="small" themeColor="danger">
                  {resendError}
                </ThemedText>
              )}
            </Card>
          )}

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Resumen
          </ThemedText>

          {loading && <ThemedText themeColor="textSecondary">Cargando…</ThemedText>}
          {error && (
            <ThemedText themeColor="danger" style={styles.centerText}>
              {error}
            </ThemedText>
          )}

          {stats && (
            <View style={styles.statsGrid}>
              <StatTile label="Marcadores creados" value={String(stats.markerCount)} />
              <StatTile label="Reseñas recibidas" value={String(stats.reviewCount)} />
              <StatTile
                label="Comodidad media"
                value={stats.avgComodidad != null ? stats.avgComodidad.toFixed(1) : '—'}
              />
              <StatTile label="Higiene media" value={stats.avgHigiene != null ? stats.avgHigiene.toFixed(1) : '—'} />
            </View>
          )}

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Favoritos
          </ThemedText>

          <Card>
            <Pressable
              onPress={() => router.push('/favorites')}
              style={[styles.actionButton, { borderColor: theme.border }]}
              accessibilityRole="button">
              <ThemedText type="smallBold">Ver mis marcadores guardados</ThemedText>
            </Pressable>
          </Card>

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Cuenta
          </ThemedText>

          <Card>
            <Pressable
              onPress={logout}
              style={[styles.actionButton, { borderColor: theme.border }]}
              accessibilityRole="button">
              <ThemedText type="smallBold">Cerrar sesión</ThemedText>
            </Pressable>
          </Card>

          <Card style={styles.dangerCard}>
            {confirmingDelete ? (
              <View style={[styles.confirmBox, { backgroundColor: `${theme.danger}14`, borderColor: theme.danger }]}>
                <ThemedText type="small" themeColor="danger" style={styles.centerText}>
                  {deleteAccountError ??
                    'Esto elimina tu cuenta de forma permanente (perfil, email y contraseña). Tus marcadores y reseñas se conservan, mostrando "Usuario eliminado" como autor. No se puede deshacer.'}
                </ThemedText>
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => {
                      setDeleteAccountError(null);
                      setConfirmingDelete(false);
                    }}
                    disabled={deletingAccount}
                    style={[styles.actionButton, { borderColor: theme.border }]}
                    accessibilityRole="button">
                    <ThemedText type="smallBold">Cancelar</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={handleDeleteAccount}
                    disabled={deletingAccount}
                    style={[styles.actionButton, { borderColor: theme.danger }, deletingAccount && styles.actionDisabled]}
                    accessibilityRole="button">
                    <ThemedText type="smallBold" themeColor="danger">
                      {deletingAccount ? 'Eliminando…' : 'Sí, eliminar mi cuenta'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setConfirmingDelete(true)}
                style={[styles.actionButton, { borderColor: theme.danger }]}
                accessibilityRole="button">
                <ThemedText type="smallBold" themeColor="danger">
                  Eliminar cuenta
                </ThemedText>
              </Pressable>
            )}
          </Card>
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
  banner: {
    height: 96,
    borderRadius: Radius.large,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bannerAccent: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: Radius.pill,
    opacity: 0.35,
    right: -60,
    top: -110,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: -Spacing.six,
    marginHorizontal: Spacing.three,
  },
  verificationCard: {
    gap: Spacing.two,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  sectionTitle: {
    marginTop: Spacing.two,
  },
  centerText: {
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  statTile: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: Radius.medium,
    borderWidth: 1,
    padding: Spacing.three,
    paddingTop: Spacing.four,
    gap: Spacing.half,
    overflow: 'hidden',
  },
  statAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  statValue: {
    fontSize: 28,
    lineHeight: 32,
  },
  dangerCard: {
    gap: Spacing.two,
  },
  confirmBox: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
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
});
