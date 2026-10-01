/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { createContext, useContext } from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Permite forzar un theme fijo (claro u oscuro) para un subárbol, ignorando
// el esquema de color del sistema. Usado por superficies de diseño fijo
// (p. ej. GlassCard o el panel de login/registro sobre fondo de foto): no
// tienen variante oscura propia, así que si el sistema está en modo oscuro
// y sus textos/inputs siguieran el theme dinámico, quedarían en colores
// oscuros sobre una superficie que sigue siendo clara — mal contraste. Ver
// CLAUDE.md → Notas técnicas.
export const ThemeOverrideContext = createContext<'light' | 'dark' | null>(null);

export function useTheme() {
  const scheme = useColorScheme();
  const override = useContext(ThemeOverrideContext);
  const theme = override ?? (scheme === 'unspecified' ? 'light' : scheme);

  return Colors[theme];
}
