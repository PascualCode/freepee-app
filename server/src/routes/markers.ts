import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import type { MarkerGender, MarkerType, PriceType, WheelchairAccess } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { getWalkingDistances, getWalkingRoute } from "../lib/ors.js";

const MARKER_TYPES = ["AIRE_LIBRE", "PUBLICO", "PRIVADO"] as const;
const MARKER_GENDERS = ["MASCULINO", "FEMENINO", "MIXTO", "PIPICAN"] as const;
const WHEELCHAIR_ACCESS_VALUES = ["COMPLETA", "PARCIAL", "NINGUNA"] as const;
// El frontend solo ofrece un subconjunto según el objetivo (un marcador
// puede reportarse como "sitio cerrado", una reseña no) — el backend acepta
// cualquiera de los 4 para ambos endpoints, confía en el frontend (mismo
// criterio que otros campos poco críticos de seguridad).
const REPORT_REASONS = ["SITIO_CERRADO", "INFORMACION_INCORRECTA", "CONTENIDO_INAPROPIADO", "OTRO"] as const;

interface NearbyQuery {
  lat: number;
  lng: number;
  // Sin valor por defecto a propósito: ausente = sin límite de distancia
  // (ver el botón de búsqueda del mapa, que quiere "todo lo que exista,
  // ordenado por distancia, tope 10 resultados"). El fetch automático de
  // "cercanos" (radio 5km) pasa este valor explícito desde el frontend —
  // ver useNearbyMarkers.
  radius?: number;
  limit?: number;
  // Comma-separated (p. ej. "PUBLICO,PRIVADO") — más simple de tipar en el
  // schema de Fastify que un array de querystring, que varía de formato
  // entre clientes. Vacío/ausente = sin filtrar por ese campo.
  types?: string;
  genders?: string;
  minComodidad?: number;
  minHigiene?: number;
}

interface MarkerNearby {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  type: MarkerType;
  priceType: PriceType | null;
  amount: number | null;
  gender: MarkerGender;
  imageUrl: string | null;
  ownerId: string;
  createdAt: Date;
  distance_m: number;
}

interface CreateMarkerBody {
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  type: MarkerType;
  priceType?: PriceType | null;
  amount?: number | null;
  gender: MarkerGender;
  imageUrl?: string | null;
  openingHours?: string | null;
  wheelchairAccess?: WheelchairAccess | null;
}

interface MarkerIdParams {
  id: string;
}

interface UpdateMarkerBody {
  title?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  type?: MarkerType;
  priceType?: PriceType | null;
  amount?: number | null;
  gender?: MarkerGender;
  imageUrl?: string | null;
  openingHours?: string | null;
  wheelchairAccess?: WheelchairAccess | null;
}

// La imagen viaja como data URL base64 en el body JSON (no hay bucket de
// object storage configurado, ver CLAUDE.md → Notas técnicas). El límite es
// sobre la longitud del string ya codificado (~2.6MB de string ⇒ ~1.9MB de
// imagen real, suficiente para una foto de cabecera comprimida en el
// cliente) y queda por debajo del bodyLimit de Fastify (ver server/src/index.ts).
const MAX_IMAGE_LENGTH = 2_600_000;

function validateImage(imageUrl: string | null | undefined): string | null {
  if (imageUrl == null) return null;
  if (!imageUrl.startsWith("data:image/")) {
    return "imageUrl debe ser una data URL de imagen";
  }
  if (imageUrl.length > MAX_IMAGE_LENGTH) {
    return "La imagen es demasiado grande";
  }
  return null;
}

// Rolling 24h, no día natural — evita ambigüedad de zona horaria (servidor
// en UTC, usuarios en España) sin cambiar el efecto práctico para el caso de
// uso real ("no más de 3 al día"). No aplica a ADMIN.
const MARKER_DAILY_LIMIT = 3;

// Buffer de candidatos para /nearby cuando hay distancia real (ORS): se
// piden más filas que las que se van a devolver, ordenadas por línea recta
// (barato, PostGIS), porque el orden por distancia real a pie no es
// necesariamente un prefijo del orden por línea recta — sin buffer, un
// marcador algo más lejos en línea recta pero con una ruta a pie más corta
// (por calles) se quedaría fuera antes de tener ocasión de compararse.
// Tope 100 porque el esquema de `limit` ya no admite más.
const ROUTE_CANDIDATE_BUFFER = 30;

interface RouteQuery {
  lat: number;
  lng: number;
}

interface CreateReviewBody {
  comodidad: number;
  higiene: number;
  text?: string;
}

interface CreateReportBody {
  reason: (typeof REPORT_REASONS)[number];
  details?: string;
}

// Reglas de negocio de precios por tipo de marcador:
// - AIRE_LIBRE: sin priceType ni amount.
// - PUBLICO: priceType nulo, o PRECIO con amount.
// - PRIVADO: priceType obligatorio; amount solo si priceType es PRECIO.
function validatePricing(
  type: MarkerType,
  priceType: PriceType | null | undefined,
  amount: number | null | undefined
): string | null {
  const hasPriceType = priceType != null;
  const hasAmount = amount != null;

  switch (type) {
    case "AIRE_LIBRE":
      if (hasPriceType || hasAmount) {
        return "Un marcador AIRE_LIBRE no puede tener priceType ni amount";
      }
      return null;

    case "PUBLICO":
      if (!hasPriceType) {
        return hasAmount ? "amount no puede informarse sin priceType" : null;
      }
      if (priceType !== "PRECIO") {
        return "Un marcador PUBLICO solo admite priceType nulo o PRECIO";
      }
      return hasAmount ? null : "amount es obligatorio cuando priceType es PRECIO";

    case "PRIVADO":
      if (!hasPriceType) {
        return "priceType es obligatorio para marcadores PRIVADO";
      }
      if (priceType === "PRECIO") {
        return hasAmount ? null : "amount es obligatorio cuando priceType es PRECIO";
      }
      return hasAmount ? "amount solo aplica cuando priceType es PRECIO" : null;
  }
}

export const markersRoutes: FastifyPluginAsync = async (app) => {
  // Todos los marcadores, sin límite de radio — el mapa los pinta siempre
  // todos; el radio de 5km solo se aplica al desplegable de "cercanos"
  // (GET /nearby, más abajo), que son cosas distintas: uno es "qué existe
  // en el mapa", el otro es "qué tengo cerca ahora mismo".
  app.get("/", async () => {
    return prisma.marker.findMany({ orderBy: { createdAt: "desc" } });
  });

  // Marcadores del usuario autenticado — para "Mis marcadores". Va antes
  // de /:id en el archivo por claridad, aunque no hace falta por orden:
  // find-my-way (el router de Fastify) prioriza siempre rutas estáticas
  // ("/mine") sobre paramétricas ("/:id") en la misma posición, sin
  // importar el orden de registro — mismo motivo por el que "/nearby" ya
  // convivía sin problema con "/:id".
  app.get(
    "/mine",
    { preHandler: [app.authenticate] },
    async (request) => {
      return prisma.marker.findMany({
        where: { ownerId: request.userId },
        orderBy: { createdAt: "desc" },
      });
    }
  );

  app.get<{ Querystring: NearbyQuery }>(
    "/nearby",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["lat", "lng"],
          properties: {
            lat: { type: "number", minimum: -90, maximum: 90 },
            lng: { type: "number", minimum: -180, maximum: 180 },
            // Sin default: un radius ausente significa "sin límite de
            // distancia" (ver botón de búsqueda del mapa) — el frontend
            // pasa 5000 explícito para el fetch automático de "cercanos".
            radius: { type: "number", minimum: 1, maximum: 200000 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            types: { type: "string" },
            genders: { type: "string" },
            minComodidad: { type: "integer", minimum: 1, maximum: 5 },
            minHigiene: { type: "integer", minimum: 1, maximum: 5 },
          },
        },
      },
    },
    async (request) => {
      const { lat, lng, radius, limit = 20, types, genders, minComodidad, minHigiene } = request.query;

      const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
      const conditions: Prisma.Sql[] = [];

      if (radius != null) {
        conditions.push(Prisma.sql`ST_DWithin(location, ${point}, ${radius})`);
      }

      // Listas separadas por comas, validadas contra los valores reales del
      // enum antes de usarlas — nunca se interpolan directo en el SQL
      // (Prisma.join las pasa como parámetros separados, no como texto).
      const typeList = types?.split(",").filter((t): t is MarkerType => (MARKER_TYPES as readonly string[]).includes(t)) ?? [];
      if (typeList.length > 0) {
        conditions.push(Prisma.sql`type IN (${Prisma.join(typeList)})`);
      }

      const genderList = genders?.split(",").filter((g): g is MarkerGender => (MARKER_GENDERS as readonly string[]).includes(g)) ?? [];
      if (genderList.length > 0) {
        conditions.push(Prisma.sql`gender IN (${Prisma.join(genderList)})`);
      }

      // "Puntuación mínima": solo marcadores con al menos una reseña cuyo
      // promedio alcance el mínimo pedido — un marcador sin reseñas nunca
      // cumple un mínimo explícito (no hay forma de confirmar que lo
      // alcanza), a diferencia de cuando no se pide ningún mínimo.
      if (minComodidad != null) {
        conditions.push(
          Prisma.sql`EXISTS (SELECT 1 FROM "Review" r WHERE r."markerId" = "Marker".id GROUP BY r."markerId" HAVING AVG(r.comodidad) >= ${minComodidad})`
        );
      }
      if (minHigiene != null) {
        conditions.push(
          Prisma.sql`EXISTS (SELECT 1 FROM "Review" r WHERE r."markerId" = "Marker".id GROUP BY r."markerId" HAVING AVG(r.higiene) >= ${minHigiene})`
        );
      }

      const whereClause = conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;

      // Sin ORS_API_KEY, comportamiento idéntico al de siempre: LIMIT
      // directo al valor pedido, orden por línea recta. Con ella, se piden
      // más candidatos (ROUTE_CANDIDATE_BUFFER) para reordenar por distancia
      // real a pie antes de recortar al `limit` final — ver getWalkingDistances.
      const useRealDistance = process.env.ORS_API_KEY != null;
      const fetchLimit = useRealDistance ? Math.min(limit + ROUTE_CANDIDATE_BUFFER, 100) : limit;

      const candidates = await prisma.$queryRaw<MarkerNearby[]>(Prisma.sql`
        SELECT
          id, title, description, latitude, longitude, type, "priceType", amount, gender, "imageUrl", "ownerId", "createdAt",
          ST_Distance(location, ${point}) AS distance_m
        FROM "Marker"
        ${whereClause}
        ORDER BY distance_m ASC
        LIMIT ${fetchLimit};
      `);

      if (!useRealDistance || candidates.length === 0) {
        return candidates.slice(0, limit);
      }

      const realDistances = await getWalkingDistances(
        { lat, lng },
        candidates.map((c) => ({ lat: c.latitude, lng: c.longitude }))
      );
      if (!realDistances) {
        // ORS falló entero — mismo resultado que sin key configurada.
        return candidates.slice(0, limit);
      }

      const enriched = candidates.map((candidate, i) => ({
        ...candidate,
        // Sin ruta a pie encontrada para ESTE candidato concreto (p. ej.
        // desconectado de la red peatonal): se queda con la línea recta ya
        // calculada, en vez de descartarlo.
        distance_m: realDistances[i]?.distanceM ?? candidate.distance_m,
      }));
      enriched.sort((a, b) => a.distance_m - b.distance_m);
      return enriched.slice(0, limit);
    }
  );

  // Ruta a pie desde la posición del usuario hasta un marcador concreto —
  // para "Cómo llegar" (ver marker/[id].tsx). Público, como GET /:id (el
  // detalle del marcador ya lo es). A diferencia de /nearby, aquí no hay
  // fallback razonable si ORS no está disponible: no existe una "línea recta
  // dibujada" que tenga sentido como ruta a pie, así que se devuelve 503
  // explícito en vez de degradar silenciosamente.
  app.get<{ Params: MarkerIdParams; Querystring: RouteQuery }>(
    "/:id/route",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 hour" },
      },
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1 } },
        },
        querystring: {
          type: "object",
          required: ["lat", "lng"],
          properties: {
            lat: { type: "number", minimum: -90, maximum: 90 },
            lng: { type: "number", minimum: -180, maximum: 180 },
          },
        },
      },
    },
    async (request, reply) => {
      const marker = await prisma.marker.findUnique({
        where: { id: request.params.id },
        select: { latitude: true, longitude: true },
      });
      if (!marker) {
        return reply.code(404).send({ error: "Marcador no encontrado" });
      }

      const { lat, lng } = request.query;
      const route = await getWalkingRoute({ lat, lng }, { lat: marker.latitude, lng: marker.longitude });
      if (!route) {
        return reply.code(503).send({ error: "No se pudo calcular la ruta en este momento" });
      }

      return {
        distanceM: route.distanceM,
        durationS: route.durationS,
        coordinates: route.coordinates,
      };
    }
  );

  app.post<{ Body: CreateMarkerBody }>(
    "/",
    {
      preHandler: [app.authenticate],
      config: {
        rateLimit: { max: 10, timeWindow: "1 hour" },
      },
      schema: {
        body: {
          type: "object",
          required: ["title", "latitude", "longitude", "type", "gender"],
          properties: {
            title: { type: "string", minLength: 1 },
            description: { type: "string" },
            latitude: { type: "number", minimum: -90, maximum: 90 },
            longitude: { type: "number", minimum: -180, maximum: 180 },
            type: { type: "string", enum: ["AIRE_LIBRE", "PUBLICO", "PRIVADO"] },
            priceType: { type: ["string", "null"], enum: ["GRATIS", "CONSUMICION", "PRECIO", null] },
            amount: { type: ["number", "null"], minimum: 0 },
            gender: { type: "string", enum: ["MASCULINO", "FEMENINO", "MIXTO", "PIPICAN"] },
            imageUrl: { type: ["string", "null"] },
            openingHours: { type: ["string", "null"], maxLength: 200 },
            wheelchairAccess: { type: ["string", "null"], enum: [...WHEELCHAIR_ACCESS_VALUES, null] },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: "No autorizado" });
      }

      // Igual que isActive en app.authenticate: se consulta en BD en el
      // momento de la petición (nunca desde el JWT), para que verificar el
      // email surta efecto de inmediato en la siguiente petición, sin
      // esperar a un nuevo login. Solo gatea crear contenido nuevo (aquí y
      // en POST /markers/:id/reviews) — nunca el login en sí, ver CLAUDE.md.
      const requester = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { emailVerified: true, role: true },
      });
      if (!requester?.emailVerified) {
        return reply.code(403).send({ error: "Verifica tu email antes de crear marcadores" });
      }

      if (requester.role !== "ADMIN") {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentCount = await prisma.marker.count({
          where: { ownerId: request.userId, createdAt: { gte: since } },
        });
        if (recentCount >= MARKER_DAILY_LIMIT) {
          return reply
            .code(429)
            .send({ error: `Has alcanzado el límite de ${MARKER_DAILY_LIMIT} marcadores nuevos por día` });
        }
      }

      const { title, description, latitude, longitude, type, priceType, amount, gender, imageUrl, openingHours, wheelchairAccess } =
        request.body;

      const validationError = validatePricing(type, priceType, amount);
      if (validationError) {
        return reply.code(400).send({ error: validationError });
      }

      const imageError = validateImage(imageUrl);
      if (imageError) {
        return reply.code(400).send({ error: imageError });
      }

      const marker = await prisma.marker.create({
        data: {
          title,
          description,
          latitude,
          longitude,
          type,
          priceType: priceType ?? null,
          amount: amount ?? null,
          gender,
          imageUrl: imageUrl ?? null,
          openingHours: openingHours ?? null,
          wheelchairAccess: wheelchairAccess ?? null,
          ownerId: request.userId,
        },
      });

      return reply.code(201).send(marker);
    }
  );

  app.get<{ Params: MarkerIdParams }>(
    "/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const marker = await prisma.marker.findUnique({
        where: { id: request.params.id },
        include: {
          reviews: {
            select: {
              id: true,
              comodidad: true,
              higiene: true,
              text: true,
              createdAt: true,
              updatedAt: true,
              author: { select: { id: true, name: true, isActive: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!marker) {
        return reply.code(404).send({ error: "Marcador no encontrado" });
      }

      return {
        ...marker,
        reviews: marker.reviews.map(({ author, ...review }) => ({
          ...review,
          author: { id: author.id, name: author.isActive ? author.name : "Usuario eliminado" },
        })),
      };
    }
  );

  // Guardar/quitar un marcador de favoritos — lista personal, nunca visible
  // para otros usuarios. Sin rate limit, mismo criterio que PUT/DELETE de
  // contenido propio: no es creación de contenido que vean otros (a
  // diferencia de POST /markers o POST /:id/reviews).
  app.post<{ Params: MarkerIdParams }>(
    "/:id/favorite",
    {
      preHandler: [app.authenticate],
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: "No autorizado" });
      }

      const markerId = request.params.id;
      const marker = await prisma.marker.findUnique({ where: { id: markerId }, select: { id: true } });
      if (!marker) {
        return reply.code(404).send({ error: "Marcador no encontrado" });
      }

      // Idempotente: si ya estaba en favoritos, no hace falta duplicar ni
      // fallar — @@unique([userId, markerId]) ya lo impediría a nivel de
      // BD, pero comprobarlo antes evita depender de capturar ese error.
      const existing = await prisma.favorite.findUnique({
        where: { userId_markerId: { userId: request.userId, markerId } },
      });
      if (existing) {
        return reply.code(200).send({ favorited: true });
      }

      await prisma.favorite.create({ data: { userId: request.userId, markerId } });
      return reply.code(201).send({ favorited: true });
    }
  );

  app.delete<{ Params: MarkerIdParams }>(
    "/:id/favorite",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: "No autorizado" });
      }

      try {
        await prisma.favorite.delete({
          where: { userId_markerId: { userId: request.userId, markerId: request.params.id } },
        });
      } catch {
        // Prisma lanza P2025 si no existe — mismo patrón que DELETE /:id/reviews.
        return reply.code(404).send({ error: "Ese marcador no está en tus favoritos" });
      }

      return reply.code(204).send();
    }
  );

  app.put<{ Params: MarkerIdParams; Body: UpdateMarkerBody }>(
    "/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1 } },
        },
        body: {
          type: "object",
          // ownerId no aparece en las properties permitidas: aunque venga en
          // el body, additionalProperties:false + removeAdditional de
          // Fastify lo descarta antes de que llegue al handler.
          additionalProperties: false,
          properties: {
            title: { type: "string", minLength: 1 },
            description: { type: "string" },
            latitude: { type: "number", minimum: -90, maximum: 90 },
            longitude: { type: "number", minimum: -180, maximum: 180 },
            type: { type: "string", enum: ["AIRE_LIBRE", "PUBLICO", "PRIVADO"] },
            priceType: { type: ["string", "null"], enum: ["GRATIS", "CONSUMICION", "PRECIO", null] },
            amount: { type: ["number", "null"], minimum: 0 },
            gender: { type: "string", enum: ["MASCULINO", "FEMENINO", "MIXTO", "PIPICAN"] },
            imageUrl: { type: ["string", "null"] },
            openingHours: { type: ["string", "null"], maxLength: 200 },
            wheelchairAccess: { type: ["string", "null"], enum: [...WHEELCHAIR_ACCESS_VALUES, null] },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: "No autorizado" });
      }

      const markerId = request.params.id;

      const existing = await prisma.marker.findUnique({
        where: { id: markerId },
        select: { ownerId: true, type: true, priceType: true, amount: true },
      });

      if (!existing) {
        return reply.code(404).send({ error: "Marcador no encontrado" });
      }

      // A diferencia del DELETE, aquí un ADMIN no puede editar contenido
      // ajeno — solo el propietario puede modificar su marcador. Un ADMIN
      // que quiera moderarlo solo puede borrarlo (DELETE /markers/:id).
      if (existing.ownerId !== request.userId) {
        return reply.code(403).send({ error: "Solo el propietario puede editar este marcador" });
      }

      const body = request.body;
      const hasField = (key: keyof UpdateMarkerBody) =>
        Object.prototype.hasOwnProperty.call(body, key);

      // Edición parcial: los campos no enviados conservan su valor en BD.
      // La regla cruzada type/priceType/amount se valida sobre el estado
      // resultante (lo enviado + lo ya existente), nunca sobre el body solo.
      const effectiveType = hasField("type") ? body.type! : existing.type;
      const effectivePriceType = hasField("priceType") ? (body.priceType ?? null) : existing.priceType;
      const effectiveAmount = hasField("amount") ? (body.amount ?? null) : existing.amount;

      const validationError = validatePricing(effectiveType, effectivePriceType, effectiveAmount);
      if (validationError) {
        return reply.code(400).send({ error: validationError });
      }

      if (hasField("imageUrl")) {
        const imageError = validateImage(body.imageUrl);
        if (imageError) {
          return reply.code(400).send({ error: imageError });
        }
      }

      const data: {
        title?: string;
        description?: string;
        latitude?: number;
        longitude?: number;
        type?: MarkerType;
        priceType?: PriceType | null;
        amount?: number | null;
        gender?: MarkerGender;
        imageUrl?: string | null;
        openingHours?: string | null;
        wheelchairAccess?: WheelchairAccess | null;
      } = {};
      if (hasField("title")) data.title = body.title;
      if (hasField("description")) data.description = body.description;
      if (hasField("latitude")) data.latitude = body.latitude;
      if (hasField("longitude")) data.longitude = body.longitude;
      if (hasField("type")) data.type = body.type;
      if (hasField("priceType")) data.priceType = body.priceType ?? null;
      if (hasField("amount")) data.amount = body.amount ?? null;
      if (hasField("gender")) data.gender = body.gender;
      if (hasField("imageUrl")) data.imageUrl = body.imageUrl ?? null;
      if (hasField("openingHours")) data.openingHours = body.openingHours ?? null;
      if (hasField("wheelchairAccess")) data.wheelchairAccess = body.wheelchairAccess ?? null;

      const marker = await prisma.marker.update({
        where: { id: markerId },
        data,
      });

      return reply.code(200).send(marker);
    }
  );

  app.post<{ Params: MarkerIdParams; Body: CreateReviewBody }>(
    "/:id/reviews",
    {
      preHandler: [app.authenticate],
      config: {
        rateLimit: { max: 20, timeWindow: "1 hour" },
      },
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1 } },
        },
        body: {
          type: "object",
          required: ["comodidad", "higiene"],
          additionalProperties: false,
          properties: {
            comodidad: { type: "integer", minimum: 1, maximum: 5 },
            higiene: { type: "integer", minimum: 1, maximum: 5 },
            text: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: "No autorizado" });
      }

      // Mismo gate que POST /markers — ver el comentario de allí.
      const requester = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { emailVerified: true },
      });
      if (!requester?.emailVerified) {
        return reply.code(403).send({ error: "Verifica tu email antes de publicar una reseña" });
      }

      const markerId = request.params.id;
      const authorId = request.userId;
      const { comodidad, higiene, text } = request.body;

      const marker = await prisma.marker.findUnique({ where: { id: markerId }, select: { id: true } });
      if (!marker) {
        return reply.code(404).send({ error: "Marcador no encontrado" });
      }

      const review = await prisma.review.upsert({
        where: { authorId_markerId: { authorId, markerId } },
        update: { comodidad, higiene, text: text ?? null },
        create: { comodidad, higiene, text: text ?? null, authorId, markerId },
      });

      // createdAt === updatedAt solo en el momento de la creación (@updatedAt
      // solo se toca en el `update`) — evita una consulta extra solo para
      // decidir el código de estado.
      const wasCreated = review.createdAt.getTime() === review.updatedAt.getTime();

      return reply.code(wasCreated ? 201 : 200).send(review);
    }
  );

  // Borra la reseña propia del usuario autenticado en ese marcador —
  // identificada por authorId (del JWT) + markerId, no hay id de reseña en
  // la URL (mismo patrón que el POST de arriba, que es un upsert por la
  // misma clave compuesta). Solo para la reseña propia — para borrar la de
  // otro (moderación de un reporte) ver el endpoint siguiente, que sí
  // admite un ADMIN.
  app.delete<{ Params: MarkerIdParams }>(
    "/:id/reviews",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: "No autorizado" });
      }

      try {
        await prisma.review.delete({
          where: { authorId_markerId: { authorId: request.userId, markerId: request.params.id } },
        });
      } catch {
        // Prisma lanza P2025 si no existe esa reseña — no hace falta
        // distinguir el código exacto, cualquier fallo aquí significa que
        // no había nada que borrar.
        return reply.code(404).send({ error: "No tienes ninguna reseña en este marcador" });
      }

      return reply.code(204).send();
    }
  );

  // Borra la reseña de CUALQUIER usuario — propietario de la reseña o
  // ADMIN (rol consultado en BD en el momento de la petición, nunca desde
  // el JWT, mismo patrón que DELETE /markers/:id). A diferencia del
  // endpoint de arriba, necesita el id de la reseña en la URL porque un
  // ADMIN no tiene una clave compuesta propia (authorId_markerId) con la
  // que identificarla — es el único camino para moderar una reseña
  // reportada (ver POST /:markerId/reviews/:reviewId/report más abajo)
  // sin tocar la base de datos a mano en Prisma Studio.
  app.delete<{ Params: { markerId: string; reviewId: string } }>(
    "/:markerId/reviews/:reviewId",
    {
      preHandler: [app.authenticate],
      schema: {
        params: {
          type: "object",
          required: ["markerId", "reviewId"],
          properties: {
            markerId: { type: "string", minLength: 1 },
            reviewId: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: "No autorizado" });
      }

      const { markerId, reviewId } = request.params;
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
        select: { id: true, markerId: true, authorId: true },
      });
      if (!review || review.markerId !== markerId) {
        return reply.code(404).send({ error: "Reseña no encontrada" });
      }

      if (review.authorId !== request.userId) {
        const requester = await prisma.user.findUnique({
          where: { id: request.userId },
          select: { role: true },
        });
        if (requester?.role !== "ADMIN") {
          return reply.code(403).send({ error: "No tienes permiso para borrar esta reseña" });
        }
      }

      await prisma.review.delete({ where: { id: reviewId } });
      return reply.code(204).send();
    }
  );

  // Reportar una reseña ajena — moderación humana vía Prisma Studio, sin
  // endpoint de administración (ver CLAUDE.md → Notas técnicas → Seguridad
  // del campo role). Si el mismo usuario ya tiene un reporte PENDIENTE
  // sobre esta misma reseña, no se duplica — responde 200 igualmente, sin
  // hacer falta un índice único nuevo en BD para esto.
  app.post<{ Params: { markerId: string; reviewId: string }; Body: CreateReportBody }>(
    "/:markerId/reviews/:reviewId/report",
    {
      preHandler: [app.authenticate],
      config: {
        rateLimit: { max: 10, timeWindow: "1 hour" },
      },
      schema: {
        params: {
          type: "object",
          required: ["markerId", "reviewId"],
          properties: {
            markerId: { type: "string", minLength: 1 },
            reviewId: { type: "string", minLength: 1 },
          },
        },
        body: {
          type: "object",
          required: ["reason"],
          additionalProperties: false,
          properties: {
            reason: { type: "string", enum: REPORT_REASONS },
            details: { type: "string", maxLength: 1000 },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: "No autorizado" });
      }

      const { markerId, reviewId } = request.params;
      const { reason, details } = request.body;

      if (reason === "OTRO" && !details) {
        return reply.code(400).send({ error: "Describe el motivo del reporte" });
      }

      const review = await prisma.review.findUnique({
        where: { id: reviewId },
        select: { id: true, markerId: true },
      });
      if (!review || review.markerId !== markerId) {
        return reply.code(404).send({ error: "Reseña no encontrada" });
      }

      const existing = await prisma.report.findFirst({
        where: { reviewId, reporterId: request.userId, status: "PENDIENTE" },
      });
      if (existing) {
        return reply.code(200).send({ message: "Ya has reportado esta reseña, gracias" });
      }

      await prisma.report.create({
        data: { reason, details: details ?? null, reviewId, reporterId: request.userId },
      });

      return reply.code(201).send({ message: "Gracias, hemos recibido tu reporte" });
    }
  );

  // Reportar un marcador — mismo patrón que el de reseñas de arriba
  // (moderación humana vía Prisma Studio, dedupe por reporte PENDIENTE).
  app.post<{ Params: MarkerIdParams; Body: CreateReportBody }>(
    "/:id/report",
    {
      preHandler: [app.authenticate],
      config: {
        rateLimit: { max: 10, timeWindow: "1 hour" },
      },
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1 } },
        },
        body: {
          type: "object",
          required: ["reason"],
          additionalProperties: false,
          properties: {
            reason: { type: "string", enum: REPORT_REASONS },
            details: { type: "string", maxLength: 1000 },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: "No autorizado" });
      }

      const markerId = request.params.id;
      const { reason, details } = request.body;

      if (reason === "OTRO" && !details) {
        return reply.code(400).send({ error: "Describe el motivo del reporte" });
      }

      const marker = await prisma.marker.findUnique({ where: { id: markerId }, select: { id: true } });
      if (!marker) {
        return reply.code(404).send({ error: "Marcador no encontrado" });
      }

      const existing = await prisma.report.findFirst({
        where: { markerId, reporterId: request.userId, status: "PENDIENTE" },
      });
      if (existing) {
        return reply.code(200).send({ message: "Ya has reportado este marcador, gracias" });
      }

      await prisma.report.create({
        data: { reason, details: details ?? null, markerId, reporterId: request.userId },
      });

      return reply.code(201).send({ message: "Gracias, hemos recibido tu reporte" });
    }
  );

  app.delete<{ Params: MarkerIdParams }>(
    "/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: "No autorizado" });
      }

      const marker = await prisma.marker.findUnique({
        where: { id: request.params.id },
        select: { id: true, ownerId: true },
      });

      if (!marker) {
        return reply.code(404).send({ error: "Marcador no encontrado" });
      }

      const isOwner = marker.ownerId === request.userId;

      if (!isOwner) {
        // El rol se consulta siempre en la base de datos — el JWT solo lleva
        // userId, nunca el rol, para que una revocación/degradación de
        // permisos surta efecto de inmediato sin esperar a que expire el token.
        const requester = await prisma.user.findUnique({
          where: { id: request.userId },
          select: { role: true },
        });

        if (requester?.role !== "ADMIN") {
          return reply.code(403).send({ error: "No tienes permiso para borrar este marcador" });
        }
      }

      await prisma.marker.delete({ where: { id: marker.id } });

      return reply.code(204).send();
    }
  );
};
