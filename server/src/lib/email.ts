// Envío de email transaccional vía la API REST de Brevo (sin SDK aparte —
// es una única llamada POST, no vale la pena la dependencia extra). Ver
// CLAUDE.md → Notas técnicas para el porqué de elegir Brevo (nivel gratuito
// más generoso, sin facturación) frente a otras alternativas.
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface SendEmailInput {
  to: { email: string; name: string };
  subject: string;
  htmlContent: string;
}

async function sendEmail({ to, subject, htmlContent }: SendEmailInput): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME ?? "FreePee";

  // Sin BREVO_API_KEY configurada (desarrollo local sin cuenta de Brevo
  // todavía, o el propio CI): en vez de fallar el registro/reenvío entero,
  // se deja constancia en el log del servidor del contenido que se habría
  // enviado — permite seguir probando el flujo de verificación de punta a
  // punta sin depender de una cuenta real. Nunca debe pasar esto en
  // producción (ver Pendiente / deuda técnica en CLAUDE.md).
  if (!apiKey || !senderEmail) {
    logEmailFallback(to, subject, htmlContent);
    return;
  }

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [to],
      subject,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo respondió ${res.status} al enviar el email: ${body}`);
  }
}

function logEmailFallback(to: SendEmailInput["to"], subject: string, htmlContent: string): void {
  console.warn(
    `\n[email] BREVO_API_KEY/BREVO_SENDER_EMAIL no configurados — email NO enviado de verdad.\n` +
      `[email] Para: ${to.name} <${to.email}>\n` +
      `[email] Asunto: ${subject}\n` +
      `[email] Contenido:\n${htmlContent}\n`
  );
}

export function buildVerificationEmailHtml(name: string, verificationUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Hola, ${name}</h2>
      <p>Confirma tu email para poder crear marcadores y dejar reseñas en FreePee:</p>
      <p>
        <a href="${verificationUrl}" style="display: inline-block; background: #F7B500; color: #000; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold;">
          Verificar mi email
        </a>
      </p>
      <p>Si no has creado una cuenta en FreePee, ignora este correo.</p>
      <p style="color: #888; font-size: 12px;">Este enlace caduca en 24 horas.</p>
    </div>
  `;
}

export async function sendVerificationEmail(to: { email: string; name: string }, token: string): Promise<void> {
  // Deep link con el custom scheme de la app (`scheme: "pipiapp"` en
  // app.json), no una URL web — no hay build web al que apuntar (ver
  // CLAUDE.md → Resueltos/descartados, se suprimió la rama web). Expo
  // Router registra el deep linking de todas las rutas automáticamente a
  // partir de ese scheme, sin config de linking aparte. Requiere que la
  // app ya esté instalada en el dispositivo que abre el correo — asumible
  // aquí porque el registro (que dispara este email) solo puede hacerse
  // desde dentro de la propia app.
  const verificationUrl = `pipiapp://verify-email?token=${encodeURIComponent(token)}`;

  await sendEmail({
    to,
    subject: "Verifica tu email en FreePee",
    htmlContent: buildVerificationEmailHtml(to.name, verificationUrl),
  });
}
