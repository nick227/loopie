import { DashboardService } from '../services/DashboardService'

const dashboardService = new DashboardService()

export async function getHomeSummary(request: any, reply: any) {
  const data = await dashboardService.home(request.user.businessId)
  return reply.send({ data })
}

export async function getResultsSummary(request: any, reply: any) {
  const data = await dashboardService.results(request.user.businessId)
  return reply.send({ data })
}
