import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { RatingField } from '@/components/rating-field';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextField } from '@/components/ui/app-text-field';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { api, ApiError } from '@/lib/api/client';
import type { Review } from '@/lib/api/client';

const DEFAULT_RATING = 5;

interface MarkerReviewFormProps {
  markerId: string;
  // Reseña ya existente del usuario en este marcador (a lo sumo una, ver
  // @@unique([authorId, markerId]) en el schema) — si la hay, el formulario
  // arranca prellenado con sus valores y el envío la actualiza (mismo
  // endpoint upsert, POST /markers/:id/reviews, ver CLAUDE.md).
  existingReview: Review | null;
  onSaved: () => void;
  // Presente solo al reabrir el formulario para editar una reseña ya
  // publicada (desde su card en el listado, ver marker/[id].tsx) — permite
  // volver a esa card sin guardar. Ausente al crear la primera reseña, que
  // no tiene una card a la que volver.
  onCancel?: () => void;
}

export function MarkerReviewForm({ markerId, existingReview, onSaved, onCancel }: MarkerReviewFormProps) {
  const [comodidad, setComodidad] = useState(existingReview?.comodidad ?? DEFAULT_RATING);
  const [higiene, setHigiene] = useState(existingReview?.higiene ?? DEFAULT_RATING);
  const [text, setText] = useState(existingReview?.text ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si la reseña propia llega (o cambia) después del montaje inicial —
  // p. ej. tras recargar el marcador una vez guardado — sincroniza el
  // formulario con ese valor real en vez de dejarlo con el que ya tenía.
  useEffect(() => {
    setComodidad(existingReview?.comodidad ?? DEFAULT_RATING);
    setHigiene(existingReview?.higiene ?? DEFAULT_RATING);
    setText(existingReview?.text ?? '');
  }, [existingReview]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.createOrUpdateReview(markerId, {
        comodidad,
        higiene,
        text: text.trim() ? text.trim() : undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la reseña');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card style={styles.card}>
      <ThemedText type="subtitle">{existingReview ? 'Tu reseña' : 'Deja tu reseña'}</ThemedText>
      <RatingField label="Comodidad" value={comodidad} onChange={setComodidad} />
      <RatingField label="Higiene" value={higiene} onChange={setHigiene} />
      <AppTextField
        label="Comentario (opcional)"
        value={text}
        onChangeText={setText}
        placeholder="Cuenta tu experiencia..."
        multiline
      />
      {error ? (
        <ThemedText themeColor="danger" type="small">
          {error}
        </ThemedText>
      ) : null}
      <AppButton
        label={existingReview ? 'Actualizar reseña' : 'Publicar reseña'}
        onPress={handleSubmit}
        loading={submitting}
      />
      {onCancel && (
        <Pressable onPress={onCancel} disabled={submitting} accessibilityRole="button" style={styles.cancelButton}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Cancelar
          </ThemedText>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  cancelButton: {
    alignItems: 'center',
  },
});
