import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { AuthSplitLayout } from '@/components/auth-split-layout';
import { ThemedText } from '@/components/themed-text';
import { TurnstileWidget } from '@/components/turnstile-widget';
import { AppButton } from '@/components/ui/app-button';
import { AppTextField } from '@/components/ui/app-text-field';
import { useAppEntry } from '@/hooks/use-app-entry';
import { useSession } from '@/lib/auth/session';
import { isValidEmail, isValidUsername } from '@/utils/validation';

const PASSWORD_MIN_LENGTH = 8;

// Ausente en desarrollo sin cuenta de Cloudflare configurada (ver .env de la
// raíz del repo) — sin ella no se muestra el widget ni se manda token, y el
// backend omite la verificación igual (ver server/src/lib/turnstile.ts).
const TURNSTILE_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;

interface FieldErrors {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen() {
  const { register } = useSession();
  const { enterApp } = useAppEntry();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // Cambiar la key remonta el widget entero — un token de Turnstile es de un
  // solo uso, así que tras un registro fallido hace falta un reto nuevo.
  const [captchaKey, setCaptchaKey] = useState(0);
  const handleCaptchaExpire = useCallback(() => setTurnstileToken(null), []);

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Introduce tu nombre';
    if (!username.trim()) errors.username = 'Introduce un nombre de usuario';
    else if (!isValidUsername(username)) {
      errors.username = 'Entre 3 y 24 caracteres: letras, números, "_" o "."';
    }
    if (!email.trim()) errors.email = 'Introduce tu email';
    else if (!isValidEmail(email)) errors.email = 'Formato de email no válido';
    if (!password) errors.password = 'Introduce una contraseña';
    else if (password.length < PASSWORD_MIN_LENGTH) {
      errors.password = `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`;
    }
    if (!confirmPassword) errors.confirmPassword = 'Repite la contraseña';
    else if (confirmPassword !== password) errors.confirmPassword = 'Las contraseñas no coinciden';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    setFormError(null);
    if (!validate() || submitting) return;
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setFormError('Completa la verificación de seguridad');
      return;
    }

    setSubmitting(true);
    try {
      // register() ya encadena un login con las mismas credenciales (el
      // backend no autentica en el registro) — al terminar, useSession().user
      // deja de ser null y el guard del layout raíz nos saca de aquí directo
      // a la app, sin pasar por una pantalla intermedia de "ya puedes entrar".
      await register({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        turnstileToken: turnstileToken ?? undefined,
      });
      // Mismo motivo que en login.tsx: cuenta como "entrada" aunque no se
      // haya pasado por (welcome).
      enterApp();
    } catch (error) {
      // El backend distingue "email ya registrado" de "nombre de usuario ya
      // en uso" con mensajes específicos (ver server/src/routes/auth.ts) —
      // se muestran tal cual, sin reinterpretarlos aquí.
      setFormError(error instanceof Error ? error.message : 'No se pudo completar el registro');
      setTurnstileToken(null);
      setCaptchaKey((key) => key + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout imageSide="left">
      <ThemedText type="subtitle">Crea tu cuenta</ThemedText>
      <ThemedText themeColor="textSecondary">Empieza a usar la app en un momento</ThemedText>

      <AppTextField
        label="Nombre"
        value={name}
        onChangeText={setName}
        error={fieldErrors.name}
        placeholder="Tu nombre"
        autoComplete="name"
        textContentType="name"
      />

      <AppTextField
        label="Nombre de usuario"
        value={username}
        onChangeText={setUsername}
        error={fieldErrors.username}
        placeholder="tu_usuario"
        autoCapitalize="none"
        autoComplete="username"
        textContentType="username"
      />

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
        placeholder={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres`}
        isPassword
        autoComplete="new-password"
        textContentType="newPassword"
      />

      <AppTextField
        label="Repite la contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={fieldErrors.confirmPassword}
        placeholder="Vuelve a escribirla"
        isPassword
        autoComplete="new-password"
        textContentType="newPassword"
      />

      {TURNSTILE_SITE_KEY ? (
        <TurnstileWidget
          key={captchaKey}
          siteKey={TURNSTILE_SITE_KEY}
          onVerify={setTurnstileToken}
          onExpire={handleCaptchaExpire}
        />
      ) : null}

      {formError ? (
        <ThemedText themeColor="danger" style={styles.centerText}>
          {formError}
        </ThemedText>
      ) : null}

      <AppButton label="Registrarme" onPress={handleSubmit} loading={submitting} />

      <ThemedText style={styles.centerText}>
        ¿Ya tienes cuenta?{' '}
        <Link href="/login">
          <ThemedText type="linkPrimary">Inicia sesión</ThemedText>
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
