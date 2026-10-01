import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AppTextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  // Activa el botón "Mostrar/Ocultar" y controla secureTextEntry por dentro
  // (no hace falta pasar secureTextEntry a la vez que isPassword).
  isPassword?: boolean;
};

export function AppTextField({ label, error, isPassword, secureTextEntry, ...rest }: AppTextFieldProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error ? theme.danger : isFocused ? theme.primary : theme.border;

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>

      <View style={[styles.inputRow, { borderColor, backgroundColor: theme.background }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={isPassword ? !revealed : secureTextEntry}
          onFocus={(event) => {
            setIsFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            rest.onBlur?.(event);
          }}
          {...rest}
        />

        {isPassword && (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            hitSlop={Spacing.two}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            <ThemedText type="small" themeColor="textSecondary">
              {revealed ? 'Ocultar' : 'Mostrar'}
            </ThemedText>
          </Pressable>
        )}
      </View>

      {error ? (
        <ThemedText type="small" themeColor="danger" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  label: {
    marginLeft: Spacing.half,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: Spacing.one,
  },
  error: {
    marginLeft: Spacing.half,
  },
});
