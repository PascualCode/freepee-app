import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AuthSplitLayout } from '@/components/auth-split-layout';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextField } from '@/components/ui/app-text-field';
import { useAppEntry } from '@/hooks/use-app-entry';
import { useSession } from '@/lib/auth/session';
import { isValidEmail } from '@/utils/validation';

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginScreen() {
  const { login } = useSession();
  const { enterApp } = useAppEntry();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = 'Introduce tu email';
    else if (!isValidEmail(email)) errors.email = 'Formato de email no válido';
    if (!password) errors.password = 'Introduce tu contraseña';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    setFormError(null);
    if (!validate() || submitting) return;

    setSubmitting(true);
    try {
      // El backend ya devuelve un 401 genérico ("Credenciales inválidas")
      // tanto si el email no existe como si la contraseña es incorrecta —
      // mostramos ese mensaje tal cual, sin intentar adivinar cuál de los
      // dos fue. Si login() funciona, useSession().user deja de ser null y
      // el guard en el layout raíz saca de aquí solo, sin navegar a mano.
      await login({ email: email.trim(), password });
      // Llegar aquí (no por (welcome)) ya cuenta como "entrada" — sin esto,
      // hasEntered seguiría en false y el guard mandaría de vuelta a
      // (welcome) en vez de a (tabs) tras un login válido.
      enterApp();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo iniciar sesión');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout imageSide="right">
      <ThemedText type="subtitle">Bienvenido</ThemedText>
      <ThemedText themeColor="textSecondary">Inicia sesión para continuar</ThemedText>

      <AppTextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        placeholder="tu@email.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />

      <AppTextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        placeholder="••••••••"
        isPassword
        autoComplete="current-password"
        textContentType="password"
      />

      {formError ? (
        <ThemedText themeColor="danger" style={styles.centerText}>
          {formError}
        </ThemedText>
      ) : null}

      <AppButton label="Iniciar sesión" onPress={handleSubmit} loading={submitting} />

      <ThemedText style={styles.centerText}>
        ¿No tienes cuenta?{' '}
        <Link href="/register">
          <ThemedText type="linkPrimary">Regístrate</ThemedText>
        </Link>
      </ThemedText>
    </AuthSplitLayout>
  );
}

const styles = StyleSheet.create({
  centerText: {
    textAlign: 'center',
  },
});
