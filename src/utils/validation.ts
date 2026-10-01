const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

// Espejo de USERNAME_PATTERN + minLength/maxLength en
// server/src/routes/auth.ts — validar aquí solo evita un viaje al backend
// para un error obvio, la validación real (incluida la unicidad) sigue
// siendo siempre la del servidor.
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 24;

export function isValidUsername(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length >= USERNAME_MIN_LENGTH &&
    trimmed.length <= USERNAME_MAX_LENGTH &&
    USERNAME_PATTERN.test(trimmed)
  );
}
