import "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string };
    user: { userId: string };
  }
}

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
