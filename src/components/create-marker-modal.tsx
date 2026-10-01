import { useState } from 'react';
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
import type { SelectedLocation } from '@/lib/maps';

interface CreateMarkerModalProps {
  visible: boolean;
  // Ubicación elegida por el usuario tocando el mapa (ver
  // NearbyMarkersMap → modo de selección de ubicación), no la posición GPS
  // actual — este modal solo se abre desde ese flujo una vez confirmado un
  // punto, pero se comprueba igualmente por si acaso (ver handleSubmit).
  location: SelectedLocation | null;
  onClose: () => void;
  onCreated: (marker: Marker) => void;
}

export function CreateMarkerModal({ visible, location, onClose, onCreated }: CreateMarkerModalProps) {
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

  function reset() {
    setTitle('');
    setDescription('');
    setType('AIRE_LIBRE');
    setPriceType(null);
    setAmount('');
    setGender(null);
    setImageUrl(null);
    setOpeningHours('');
    setWheelchairAccess(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!location) {
      setError('Toca el mapa para marcar la ubicación exacta.');
      return;
    }
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
      const marker = await api.createMarker({
        title: title.trim(),
        description: description.trim() || undefined,
        latitude: location.latitude,
        longitude: location.longitude,
        type,
        priceType,
        amount: parsedAmount,
        gender,
        imageUrl,
        openingHours: openingHours.trim() || undefined,
        wheelchairAccess,
      });
      reset();
      onCreated(marker);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el marcador');
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
              <ThemedText type="subtitle">Nuevo marcador</ThemedText>
              <Pressable onPress={handleClose} accessibilityRole="button">
                <ThemedText type="linkPrimary">Cancelar</ThemedText>
              </Pressable>
            </View>

            {location ? (
              <ThemedText type="small" themeColor="textSecondary">
                Ubicación marcada: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </ThemedText>
            ) : (
              <ThemedText type="small" themeColor="danger">
                Toca el mapa para marcar la ubicación exacta antes de continuar.
              </ThemedText>
            )}

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

            <AppButton
              label="Crear marcador"
              onPress={handleSubmit}
              loading={submitting}
              disabled={!location}
            />
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
