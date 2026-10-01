import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AppButtonVariant = 'primary' | 'secondary';

export type AppButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: AppButtonVariant;
  loading?: boolean;
};

// Botón base reutilizable en toda la app — esquinas redondeadas y colores
// siempre desde el tema, nunca hardcodeados en la pantalla que lo usa.
export function AppButton({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  ...rest
}: AppButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const backgroundColor = variant === 'primary' ? theme.primary : theme.primarySoft;
  const textColor = variant === 'primary' ? theme.onPrimary : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText type="smallBold" style={[styles.label, { color: textColor }]}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.medium,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    textAlign: 'center',
  },
});
