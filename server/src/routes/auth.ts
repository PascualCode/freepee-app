import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { sendVerificationEmail } from "../lib/email.js";
import { verifyTurnstileToken } from "../lib/turnstile.js";
import { isDisposableEmail } from "../lib/disposable-email.js";

const PASSWORD_MIN_LENGTH = 8;
const BCRYPT_ROUNDS = 10;

// Hash válido pero sin contraseña real asociada — se usa cuando el email no
// existe, para que bcrypt.compare tarde lo mismo que con un email real y no
// se pueda distinguir por tiempo de respuesta cuál de los dos falló.
const DUMMY_HASH = bcrypt.hashSync("timing-safety-dummy-password", BCRYPT_ROUNDS);

const VERIFICATION_TOKEN_TTL_HOURS = 24;

function generateVerificationToken(): { token: string; expiresAt: Date } {
  return {
    token: randomBytes(32).toString("hex"),
    expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000),
  };
}

interface RegisterBody {
  email: string;
  password: string;
  name: string;
  username: string;
  turnstileToken?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface VerifyEmailBody {
  token: string;
}

const USERNAME_PATTERN = "^[a-zA-Z0-9_.]+$";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: RegisterBody }>(
    "/register",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "15 minutes" },
      },
      schema: {
        body: {
          type: "object",
          required: ["email", "password", "name", "username"],
          // additionalProperties: false evita que un campo como "role" colado
          // en el body llegue siquiera al handler — el rol se asigna solo en
          // el servidor (@default(USER) en el schema), nunca desde el cliente.
          additionalProperties: false,
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: PASSWORD_MIN_LENGTH },
            name: { type: "string", minLength: 1 },
            username: { type: "string", minLength: 3, maxLength: 24, pattern: USERNAME_PATTERN },
            turnstileToken: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password, name, username, turnstileToken } = request.body;

      const captchaValid = await verifyTurnstileToken(turnstileToken, request.ip);
      if (!captchaValid) {
        return reply.code(400).send({ error: "La verificación de seguridad no es válida. Inténtalo de nuevo." });
      }

      if (isDisposableEmail(email)) {
        return reply
          .code(400)
          .send({ error: "No se admiten direcciones de email temporales o desechables. Usa un email personal o corporativo real." });
      }

      // Dos comprobaciones de unicidad separadas (no un OR en una sola
      // consulta) para poder devolver un mensaje específico de cuál de los
      // dos campos ya está en uso.
      const [existingEmail, existingUsername] = await Promise.all([
        prisma.user.findUnique({ where: { email } }),
        prisma.user.findUnique({ where: { username } }),
      ]);
      if (existingEmail) {
        return reply.code(409).send({ error: "El email ya está registrado" });
      }
      if (existingUsername) {
        return reply.code(409).send({ error: "El nombre de usuario ya está en uso" });
      }

      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const { token, expiresAt } = generateVerificationToken();

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          username,
          verificationToken: token,
          verificationTokenExpiresAt: expiresAt,
        },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          createdAt: true,
          emailVerified: true,
        },
      });

      // No se deja que un fallo al enviar el correo tumbe el registro — la
      // cuenta ya existe de verdad, y el usuario siempre puede pedir un
      // reenvío más tarde (POST /auth/resend-verification) si esto falla.
      try {
        await sendVerificationEmail({ email: user.email, name: user.name }, token);
      } catch (err) {
        app.log.error(err, "No se pudo enviar el email de verificación en el registro");
      }

      return reply.code(201).send(user);
    }
  );

  app.post<{ Body: LoginBody }>(
    "/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await prisma.user.findUnique({ where: { email } });

      const passwordMatches = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

      // Una cuenta dada de baja (isActive: false) recibe el mismo 401 genérico
      // que una contraseña incorrecta — no se revela que el email existió.
      if (!user || !passwordMatches || !user.isActive) {
        return reply.code(401).send({ error: "Credenciales inválidas" });
      }

      const token = await app.jwt.sign({ userId: user.id });

      return reply.send({ token });
    }
  );

  // "whoami" — perfil completo a partir del JWT. Antes no existía (ver
  // CLAUDE.md → Pendiente): sin esto, el cliente solo podía saber el
  // nombre/email justo después de un registro, nunca tras un login normal
  // ni al recuperar un token guardado al arrancar. Se usa tanto al
  // arrancar la app como después de login/registro (ver lib/auth/session.tsx)
  // — así el cliente nunca tiene que decodificar el JWT él mismo para nada
  // más que esto ya lo resuelve de verdad contra la base de datos.
  app.get(
    "/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          createdAt: true,
          emailVerified: true,
        },
      });

      if (!user) {
        return reply.code(401).send({ error: "No autorizado" });
      }

      return user;
    }
  );

  // Público a propósito (sin app.authenticate) — el propio token, aleatorio
  // de 32 bytes y con expiración, es la credencial: verificar el email no
  // exige que el dispositivo que abre el enlace sea el mismo que inició el
  // registro.
  app.post<{ Body: VerifyEmailBody }>(
    "/verify-email",
    {
      schema: {
        body: {
          type: "object",
          required: ["token"],
          additionalProperties: false,
          properties: { token: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const { token } = request.body;

      const user = await prisma.user.findUnique({ where: { verificationToken: token } });

      if (!user || !user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
        return reply.code(400).send({ error: "El enlace de verificación no es válido o ha caducado" });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, verificationToken: null, verificationTokenExpiresAt: null },
      });

      return reply.code(204).send();
    }
  );

  // Protegido: hace falta saber a quién reenviar, y un usuario sin
  // verificar sigue pudiendo iniciar sesión con normalidad (ver CLAUDE.md
  // — solo se gatea crear marcadores/reseñas, nunca el login), así que
  // siempre hay una sesión disponible desde la que pedir el reenvío.
  app.post(
    "/resend-verification",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = await prisma.user.findUnique({ where: { id: request.userId } });

      if (!user) {
        return reply.code(401).send({ error: "No autorizado" });
      }
      if (user.emailVerified) {
        return reply.code(400).send({ error: "Este email ya está verificado" });
      }

      const { token, expiresAt } = generateVerificationToken();
      await prisma.user.update({
        where: { id: user.id },
        data: { verificationToken: token, verificationTokenExpiresAt: expiresAt },
      });

      await sendVerificationEmail({ email: user.email, name: user.name }, token);

      return reply.code(204).send();
    }
  );
};
