import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Límite en caracteres del string de la data URL — mismo valor que
// MAX_IMAGE_LENGTH en server/src/routes/markers.ts, así el aviso aparece
// aquí mismo en vez de esperar a un 400 del backend tras subir.
const MAX_DATA_URL_LENGTH = 2_600_000;

interface MarkerImageFieldProps {
  // Data URL (o, al editar, la que ya trajera el marcador) mostrada como
  // vista previa — `null` sin imagen elegida.
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

// Selector de imagen de cabecera compartido entre CreateMarkerModal y
// EditMarkerModal. Se guarda como data URL base64 en el propio marcador
// (no hay bucket de object storage configurado, ver CLAUDE.md → Notas
// técnicas) — expo-image-picker con base64:true resuelve esto sin
// necesitar un endpoint de subida aparte.
export function MarkerImageField({ value, onChange }: MarkerImageFieldProps) {
  const theme = useTheme();
  const [pickError, setPickError] = useState<string | null>(null);

  async function pickImage() {
    setPickError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickError('Necesitamos permiso para acceder a tus imágenes.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.base64) {
      setPickError('No se pudo leer la imagen seleccionada.');
      return;
    }

    const dataUrl = `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
    if (dataUrl.length > MAX_DATA_URL_LENGTH) {
      setPickError('La imagen pesa demasiado — prueba con otra.');
      return;
    }

    onChange(dataUrl);
  }

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={styles.fieldLabel}>
        Imagen (opcional)
      </ThemedText>

      {value ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: value }} style={styles.preview} contentFit="cover" />
          <Pressable
            onPress={() => onChange(null)}
            style={[styles.removeButton, { backgroundColor: theme.danger }]}
            accessibilityRole="button">
            <ThemedText type="small" style={styles.removeLabel}>
              Quitar
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={pickImage} style={[styles.pickButton, { borderColor: theme.border }]} accessibilityRole="button">
          <ThemedText type="small" themeColor="textSecondary">
            Toca para elegir una foto del sitio
          </ThemedText>
        </Pressable>
      )}

      {pickError && (
        <ThemedText type="small" themeColor="danger">
          {pickError}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  fieldLabel: {
    marginLeft: Spacing.half,
  },
  pickButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  previewWrap: {
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: 140,
    borderRadius: Radius.medium,
  },
  removeButton: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  removeLabel: {
    color: '#ffffff',
  },
});
