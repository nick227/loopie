import { LeadService } from '../services/LeadService'

const leadService = new LeadService()

export async function listLeads(request: any, reply: any) {
  const data = await leadService.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function getLead(request: any, reply: any) {
  const lead = await leadService.get(request.user.businessId, request.params.leadId)
  return reply.send({ data: lead })
}

export async function updateLead(request: any, reply: any) {
  const lead = await leadService.update(request.user.businessId, request.params.leadId, request.body)
  return reply.send({ data: lead })
}
