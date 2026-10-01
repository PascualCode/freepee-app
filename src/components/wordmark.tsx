import { ThemedText, type ThemedTextProps } from '@/components/themed-text';

interface WordmarkProps {
  type?: ThemedTextProps['type'];
  style?: ThemedTextProps['style'];
}

// Único sitio donde vive el split de color del wordmark ("Free" en el color
// de texto normal, "Pee" en primary) — antes duplicado en (welcome) y
// AuthSplitLayout como "pipi"+"App". Si el nombre vuelve a cambiar, solo
// hay que tocar aquí (y APP_NAME en constants/brand.ts).
export function Wordmark({ type = 'subtitle', style }: WordmarkProps) {
  return (
    <ThemedText type={type} style={style}>
      Free
      <ThemedText type={type} themeColor="primary">
        Pee
      </ThemedText>
    </ThemedText>
  );
}
