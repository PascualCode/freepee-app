import "dotenv/config";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { authPlugin } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { markersRoutes } from "./routes/markers.js";
import { usersRoutes } from "./routes/users.js";

async function main() {
  // bodyLimit por defecto de Fastify es 1MB — insuficiente para el body de
  // crear/editar un marcador con imagen (data URL base64, ver
  // server/src/routes/markers.ts → MAX_IMAGE_LENGTH). 4MB da margen de
  // sobra sobre ese límite sin abrir la puerta a payloads arbitrariamente
  // grandes.
  // trustProxy: desplegado detrás del proxy de Railway — sin esto,
  // request.ip resuelve a la IP interna del proxy en vez de la del cliente
  // real, y tanto @fastify/rate-limit como verifyTurnstileToken(token, ip)
  // dependen de esa IP para distinguir usuarios.
  const app = Fastify({ logger: true, bodyLimit: 4 * 1024 * 1024, trustProxy: true });

  // Sin @fastify/cors a propósito: CORS es una restricción exclusiva del
  // navegador, y desde que se suprimió la rama web el único cliente es la
  // app nativa (fetch() nativo no está sujeto a CORS). Llegó a hacer falta
  // durante la fase con web (ver CLAUDE.md → Notas técnicas/histórico).
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  await app.register(authPlugin);
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(markersRoutes, { prefix: "/markers" });
  await app.register(usersRoutes, { prefix: "/users" });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
