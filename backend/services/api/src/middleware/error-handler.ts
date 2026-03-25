import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export function errorHandler(
  error: FastifyError,
  _req: FastifyRequest,
  reply: FastifyReply,
): void {
  const statusCode = error.statusCode ?? 500;
  const code = error.code ?? 'INTERNAL_ERROR';

  reply.status(statusCode).send({
    error: error.message,
    code,
    statusCode,
  });
}
