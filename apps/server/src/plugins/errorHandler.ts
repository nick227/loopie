import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'

export function mapErrorToReply(error: FastifyError, reply: FastifyReply, log: FastifyRequest['log']) {
  if (error.validation) {
    return reply.status(400).send({ error: 'Validation failed', details: error.validation })
  }
  if (error.statusCode) {
    return reply.status(error.statusCode).send({ error: error.message })
  }
  if (error.code === 'P2025') {
    return reply.status(404).send({ error: 'Not found' })
  }
  if (error.code === 'P2002') {
    return reply.status(409).send({ error: 'Already exists' })
  }
  log.error(error)
  return reply.status(500).send({ error: 'Internal server error' })
}
