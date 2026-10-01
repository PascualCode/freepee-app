/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    // Paleta principal (amarillo) — reutilizar estos tokens en toda la app,
    // nunca un valor hexadecimal suelto en una pantalla.
    primary: '#F7B500', // amarillo vivo — botones/acciones primarias
    primarySoft: '#FFF6DA', // amarillo pastel — fondos y estados secundarios
    onPrimary: '#241C00', // texto/iconos sobre `primary` (el amarillo vivo no da contraste suficiente con blanco)
    border: '#E4E4E7',
    danger: '#D92D20',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    primary: '#FFC629',
    primarySoft: '#3A2C00',
    onPrimary: '#1A1300',
    border: '#33353A',
    danger: '#F97066',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;

// Escala de esquinas redondeadas — usar siempre uno de estos valores en
// inputs, botones y tarjetas en vez de un número suelto, para que el look
// "suave" se mantenga consistente en toda la app.
export const Radius = {
  small: 10,
  medium: 16,
  large: 24,
  pill: 999,
} as const;
