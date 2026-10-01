import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";

const BCRYPT_ROUNDS = 10;

export const usersRoutes: FastifyPluginAsync = async (app) => {
  // Resumen para la pantalla de Perfil: cuántos marcadores ha creado y qué
  // opinan de ellos — no reseñas que ESTE usuario haya escrito, sino las
  // que otros han dejado en SUS marcadores (marker.ownerId, no
  // review.authorId). _avg da null si no hay ninguna reseña todavía, el
  // frontend lo trata como "sin datos" en vez de 0.
  app.get(
    "/me/stats",
    { preHandler: [app.authenticate] },
    async (request) => {
      const [markerCount, reviewAgg] = await Promise.all([
        prisma.marker.count({ where: { ownerId: request.userId } }),
        prisma.review.aggregate({
          where: { marker: { ownerId: request.userId } },
          _count: { _all: true },
          _avg: { comodidad: true, higiene: true },
        }),
      ]);

      return {
        markerCount,
        reviewCount: reviewAgg._count._all,
        avgComodidad: reviewAgg._avg.comodidad,
        avgHigiene: reviewAgg._avg.higiene,
      };
    }
  );

  // Lista de marcadores guardados por el usuario — para la pantalla
  // Favoritos. Ordenados por fecha en que se guardaron (más reciente
  // primero), no por fecha de creación del propio marcador.
  app.get(
    "/me/favorites",
    { preHandler: [app.authenticate] },
    async (request) => {
      const favorites = await prisma.favorite.findMany({
        where: { userId: request.userId },
        orderBy: { createdAt: "desc" },
        include: { marker: true },
      });
      return favorites.map((favorite) => favorite.marker);
    }
  );

  app.delete(
    "/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: "No autorizado" });
      }

      // Password sustituido por un hash de bytes aleatorios: no coincide con
      // ninguna contraseña real, invalidando el login sin dejar el campo vacío.
      const invalidatedPassword = await bcrypt.hash(
        crypto.randomBytes(32).toString("hex"),
        BCRYPT_ROUNDS
      );

      await prisma.user.update({
        where: { id: request.userId },
        data: {
          isActive: false,
          deletedAt: new Date(),
          email: `deleted-${request.userId}@pipiapp.local`,
          // `username` también tiene restricción de unicidad — sin liberarlo
          // aquí, una cuenta borrada seguiría "ocupando" ese nombre para
          // siempre, bloqueando que su propio dueño (o cualquier otro) lo
          // reuse en un registro nuevo. Se pone a null, no un valor
          // generado — mismo estado que ya tienen las cuentas legadas
          // anteriores a que este campo existiera (`username String?`).
          username: null,
          password: invalidatedPassword,
        },
      });

      return reply.code(204).send();
    }
  );
};
