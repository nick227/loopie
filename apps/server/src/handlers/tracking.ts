import { TrackingRuntimeService } from '../services/TrackingRuntimeService'

const tracking = new TrackingRuntimeService()

export async function getLoopieSession(request: any, reply: any) {
  if (!request.query.businessId) throw { statusCode: 400, message: 'businessId is required' }
  const data = await tracking.ensureSession(request.query)
  return reply.header('Cache-Control', 'no-store').send({ data })
}

export async function trackLoopieEvent(request: any, reply: any) {
  await tracking.track(request.body)
  return reply.status(204).send()
}
