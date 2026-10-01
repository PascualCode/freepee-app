import { Pressable, StyleSheet, View } from 'react-native';

import { BookmarkIcon, PersonIcon, SearchIcon, SlidersIcon } from '@/components/nav-icons';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';

interface BottomNavBarProps {
  bottom: number;
  isAuthenticated: boolean;
  onMyMarkers: () => void;
  onProfile: () => void;
  // Siempre visible (incluso sin sesión, en /map) — pedido explícitamente
  // así: el botón debe verse como affordance de la función aunque no se
  // pueda usar todavía. `canAdd` (sesión + email verificado) decide el
  // estado gris/amarillo; `onAdd` solo se llama cuando canAdd es true.
  onAdd: () => void;
  canAdd: boolean;
  canSearch: boolean;
  onSearch: () => void;
  onSettings: () => void;
}

// Colores fijos del mockup cerrado con el usuario (ver CLAUDE.md → Estado
// del proyecto → BottomNavBar) — NO usa useTheme(): es una superficie de
// diseño cerrado, igual que GlassCard/AuthSplitLayout/Perfil, que tampoco
// siguen el theme del sistema. Sin esto, en modo oscuro la barra se pinta
// en negro (theme.background) en vez del blanco del diseño aprobado.
const BAR_BACKGROUND = '#ffffff';
const ICON_COLOR = '#000000';
const ADD_BACKGROUND = '#F7B500';
const ADD_ICON_COLOR = '#241C00';
// Gris "soft" para el círculo de añadir cuando no se puede usar todavía
// (sin sesión, o con sesión pero email sin verificar) — mismo tono que
// `theme.border` en la paleta clara, para no introducir un gris suelto.
const ADD_BACKGROUND_DISABLED = '#E4E4E7';
const ADD_ICON_COLOR_DISABLED = '#9A9AA2';

// Píldora flotante única que sustituye al antiguo sidebar (☰) + FAB + botón
// "Buscar" sueltos — diseño cerrado con el usuario, ver CLAUDE.md → Estado
// del proyecto → "BottomNavBar".
export function BottomNavBar({
  bottom,
  isAuthenticated,
  onMyMarkers,
  onProfile,
  onAdd,
  canAdd,
  canSearch,
  onSearch,
  onSettings,
}: BottomNavBarProps) {
  return (
    <View style={[styles.bar, { bottom, backgroundColor: BAR_BACKGROUND }]}>
      <Pressable
        onPress={onMyMarkers}
        disabled={!isAuthenticated}
        style={[styles.iconButton, !isAuthenticated && styles.iconButtonDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Mis marcadores">
        <BookmarkIcon color={ICON_COLOR} />
      </Pressable>

      <Pressable
        onPress={onProfile}
        disabled={!isAuthenticated}
        style={[styles.iconButton, !isAuthenticated && styles.iconButtonDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Perfil">
        <PersonIcon color={ICON_COLOR} />
      </Pressable>

      <Pressable
        onPress={onAdd}
        disabled={!canAdd}
        style={[styles.addButton, { backgroundColor: canAdd ? ADD_BACKGROUND : ADD_BACKGROUND_DISABLED }]}
        accessibilityRole="button"
        accessibilityLabel="Crear marcador">
        <ThemedText
          type="title"
          style={[styles.addIcon, { color: canAdd ? ADD_ICON_COLOR : ADD_ICON_COLOR_DISABLED }]}>
          +
        </ThemedText>
      </Pressable>

      <Pressable
        onPress={onSearch}
        disabled={!canSearch}
        style={[styles.iconButton, !canSearch && styles.iconButtonDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Buscar">
        <SearchIcon color={ICON_COLOR} />
      </Pressable>

      <Pressable onPress={onSettings} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Ajustes">
        <SlidersIcon color={ICON_COLOR} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    height: 64,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.18), 0px 2px 6px rgba(0, 0, 0, 0.08)',
    zIndex: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.35,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.25)',
  },
  addIcon: {
    fontSize: 28,
    lineHeight: 30,
  },
});
