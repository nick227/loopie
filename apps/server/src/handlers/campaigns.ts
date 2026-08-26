import { CampaignService } from '../services/CampaignService'
import { DeploymentService } from '../services/DeploymentService'
import { listCampaignLeadOutcomes } from '../services/campaignLeads'

const campaignService = new CampaignService()
const deploymentService = new DeploymentService()

export async function listCampaigns(request: any, reply: any) {
  const data = await campaignService.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function createCampaign(request: any, reply: any) {
  const campaign = await campaignService.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: campaign })
}

export async function getCampaign(request: any, reply: any) {
  const campaign = await campaignService.get(request.user.businessId, request.params.campaignId)
  return reply.send({ data: campaign })
}

export async function updateCampaign(request: any, reply: any) {
  const campaign = await campaignService.update(request.user.businessId, request.params.campaignId, request.body)
  return reply.send({ data: campaign })
}

export async function pauseCampaign(request: any, reply: any) {
  const campaign = await campaignService.pause(request.user.businessId, request.params.campaignId)
  return reply.send({ data: campaign })
}

export async function resumeCampaign(request: any, reply: any) {
  const campaign = await campaignService.resume(request.user.businessId, request.params.campaignId)
  return reply.send({ data: campaign })
}

export async function endCampaign(request: any, reply: any) {
  const campaign = await campaignService.end(request.user.businessId, request.params.campaignId)
  return reply.send({ data: campaign })
}

export async function duplicateCampaign(request: any, reply: any) {
  const campaign = await campaignService.duplicate(request.user.businessId, request.params.campaignId)
  return reply.status(201).send({ data: campaign })
}

export async function getCampaignPerformance(request: any, reply: any) {
  const data = await campaignService.performance(request.user.businessId, request.params.campaignId)
  return reply.send({ data })
}

export async function listDeployments(request: any, reply: any) {
  const data = await deploymentService.list(request.user.businessId, request.params.campaignId, request.query)
  return reply.send(data)
}

export async function createDeployment(request: any, reply: any) {
  const deployment = await deploymentService.create(request.user.businessId, request.params.campaignId, request.body)
  return reply.status(201).send({ data: deployment })
}

export async function getDeployment(request: any, reply: any) {
  const deployment = await deploymentService.get(request.user.businessId, request.params.deploymentId)
  return reply.send({ data: deployment })
}

export async function updateDeployment(request: any, reply: any) {
  const deployment = await deploymentService.update(request.user.businessId, request.params.deploymentId, request.body)
  return reply.send({ data: deployment })
}

export async function authorizeCampaignBudget(request: any, reply: any) {
  const auth = await campaignService.authorizeBudget(request.user.businessId, request.params.campaignId, request.body)
  return reply.status(201).send({ data: auth })
}

export async function getCampaignFunding(request: any, reply: any) {
  const data = await campaignService.funding(request.user.businessId, request.params.campaignId)
  return reply.send({ data })
}

export async function listCampaignLeads(request: any, reply: any) {
  const data = await listCampaignLeadOutcomes(request.user.businessId, request.params.campaignId, request.query)
  return reply.send(data)
}
