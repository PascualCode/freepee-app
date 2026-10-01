import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";

export const authPlugin: FastifyPluginAsync = fp(async (app) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no está definido");
  }

  await app.register(jwt, {
    secret,
    sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" },
  });

  app.decorate("authenticate", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "No autorizado" });
    }

    // isActive se comprueba en cada petición (no solo en login) para que una
    // baja de cuenta corte el acceso de inmediato, aunque el usuario tenga
    // un JWT todavía válido emitido antes de darse de baja.
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { isActive: true },
    });

    if (!user?.isActive) {
      return reply.code(401).send({ error: "No autorizado" });
    }

    request.userId = request.user.userId;
  });
});
