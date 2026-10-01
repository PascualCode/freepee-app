const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerifyResponse {
  success: boolean;
}

// Sin TURNSTILE_SECRET_KEY configurada, se deja pasar (mismo patrón que
// BREVO_API_KEY en email.ts) — nunca debe llegar así a producción, ver
// CLAUDE.md → Pendiente / deuda técnica.
export async function verifyTurnstileToken(token: string | undefined, remoteIp?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.warn("[turnstile] TURNSTILE_SECRET_KEY no configurada — verificación de CAPTCHA omitida (solo desarrollo)");
    return true;
  }

  if (!token) return false;

  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body });
  if (!res.ok) return false;

  const data = (await res.json()) as TurnstileVerifyResponse;
  return data.success === true;
}
