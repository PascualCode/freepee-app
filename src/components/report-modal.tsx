import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextField } from '@/components/ui/app-text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import type { CreateReportInput, ReportReason } from '@/lib/api/client';

interface ReportReasonOption {
  value: ReportReason;
  label: string;
}

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  // Motivos ofrecidos — distintos para marcador (incluye "Sitio cerrado") y
  // reseña (no aplica) — ver marker/[id].tsx, único componente reutilizado
  // para los dos flujos.
  reasons: ReportReasonOption[];
  onSubmit: (input: CreateReportInput) => Promise<{ message: string }>;
}

// Bottom-sheet Modal, mismo patrón que el resto de la app (nearby-markers-map.tsx
// → sheet de Ajustes). Reutilizable entre "reportar marcador" y "reportar
// reseña" — solo cambian los motivos ofrecidos y el submit.
export function ReportModal({ visible, onClose, reasons, onSubmit }: ReportModalProps) {
  const theme = useTheme();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reinicia el formulario cada vez que se abre — evita arrastrar el motivo
  // o el error de una vez anterior si se reabre para otro marcador/reseña.
  useEffect(() => {
    if (visible) {
      setReason(null);
      setDetails('');
      setError(null);
      setSuccessMessage(null);
    }
  }, [visible]);

  async function handleSubmit() {
    if (!reason) {
      setError('Elige un motivo');
      return;
    }
    if (reason === 'OTRO' && details.trim().length === 0) {
      setError('Describe el motivo del reporte');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await onSubmit({ reason, details: details.trim() || undefined });
      setSuccessMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar el reporte');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title} numberOfLines={1}>
              Reportar
            </ThemedText>
            <Pressable onPress={onClose} accessibilityRole="button">
              <ThemedText type="linkPrimary">Cerrar</ThemedText>
            </Pressable>
          </View>

          {successMessage ? (
            <ThemedText style={styles.success}>{successMessage}</ThemedText>
          ) : (
            <>
              <View style={styles.pillRow}>
                {reasons.map((option) => {
                  const selected = option.value === reason;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setReason(option.value)}
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

              <AppTextField
                label={reason === 'OTRO' ? 'Cuéntanos qué pasa' : 'Detalles (opcional)'}
                value={details}
                onChangeText={setDetails}
                multiline
              />

              {error && (
                <ThemedText type="small" themeColor="danger">
                  {error}
                </ThemedText>
              )}

              <AppButton label="Enviar reporte" onPress={handleSubmit} loading={submitting} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  sheet: {
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    lineHeight: 26,
    marginRight: Spacing.two,
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
  success: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
