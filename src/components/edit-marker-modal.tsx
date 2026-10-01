import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MarkerGenderField } from '@/components/marker-gender-field';
import { MarkerImageField } from '@/components/marker-image-field';
import { MarkerTypePriceFields } from '@/components/marker-type-price-fields';
import { MarkerWheelchairField } from '@/components/marker-wheelchair-field';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextField } from '@/components/ui/app-text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/lib/api/client';
import type { Marker, MarkerGender, MarkerType, PriceType, WheelchairAccess } from '@/lib/api/client';

interface EditMarkerModalProps {
  visible: boolean;
  // El marcador a editar — solo se lee al abrir (ver el useEffect de abajo)
  // para rellenar el formulario; a diferencia de CreateMarkerModal, no hay
  // paso de ubicación: se edita el contenido, no dónde está.
  marker: Marker | null;
  onClose: () => void;
  onUpdated: (marker: Marker) => void;
}

export function EditMarkerModal({ visible, marker, onClose, onUpdated }: EditMarkerModalProps) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<MarkerType>('AIRE_LIBRE');
  const [priceType, setPriceType] = useState<PriceType | null>(null);
  const [amount, setAmount] = useState('');
  const [gender, setGender] = useState<MarkerGender | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [openingHours, setOpeningHours] = useState('');
  const [wheelchairAccess, setWheelchairAccess] = useState<WheelchairAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Rellenar el formulario cada vez que se abre para un marcador distinto
  // — `marker` puede cambiar (el usuario pulsa "Editar" en otra fila) sin
  // que el modal llegue a desmontarse entre medias.
  useEffect(() => {
    if (!marker) return;
    setTitle(marker.title);
    setDescription(marker.description ?? '');
    setType(marker.type);
    setPriceType(marker.priceType);
    setAmount(marker.amount != null ? String(marker.amount) : '');
    setGender(marker.gender);
    setImageUrl(marker.imageUrl);
    setOpeningHours(marker.openingHours ?? '');
    setWheelchairAccess(marker.wheelchairAccess);
    setError(null);
  }, [marker]);

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    if (!marker) return;
    if (!title.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    if (!gender) {
      setError('Selecciona un género para el marcador.');
      return;
    }
    const parsedAmount = priceType === 'PRECIO' ? Number(amount.replace(',', '.')) : undefined;
    if (priceType === 'PRECIO' && (!amount || Number.isNaN(parsedAmount) || parsedAmount! <= 0)) {
      setError('Indica un precio válido.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const updated = await api.updateMarker(marker.id, {
        title: title.trim(),
        description: description.trim(),
        type,
        priceType,
        amount: parsedAmount ?? null,
        gender,
        imageUrl,
        openingHours: openingHours.trim() || null,
        wheelchairAccess,
      });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el marcador');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <ThemedText type="subtitle">Editar marcador</ThemedText>
              <Pressable onPress={handleClose} accessibilityRole="button">
                <ThemedText type="linkPrimary">Cancelar</ThemedText>
              </Pressable>
            </View>

            <AppTextField label="Título" value={title} onChangeText={setTitle} placeholder="Nombre del sitio" />
            <AppTextField
              label="Descripción (opcional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Alguna nota útil"
              multiline
            />

            <MarkerTypePriceFields
              type={type}
              priceType={priceType}
              amount={amount}
              onTypeChange={setType}
              onPriceTypeChange={setPriceType}
              onAmountChange={setAmount}
            />

            <MarkerGenderField value={gender} onChange={setGender} />

            <AppTextField
              label="Horario de apertura (opcional)"
              value={openingHours}
              onChangeText={setOpeningHours}
              placeholder="Ej. L-V 8:00-22:00"
            />

            <MarkerWheelchairField value={wheelchairAccess} onChange={setWheelchairAccess} />

            <MarkerImageField value={imageUrl} onChange={setImageUrl} />

            {error && (
              <ThemedText type="small" themeColor="danger">
                {error}
              </ThemedText>
            )}

            <AppButton label="Guardar cambios" onPress={handleSubmit} loading={submitting} />
          </ScrollView>
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
    maxHeight: '85%',
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
