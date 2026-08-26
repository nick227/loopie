import { SaleService } from '../services/SaleService'

const saleService = new SaleService()

export async function listSales(request: any, reply: any) {
  const data = await saleService.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function createSale(request: any, reply: any) {
  const sale = await saleService.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: sale })
}

export async function getSale(request: any, reply: any) {
  const sale = await saleService.get(request.user.businessId, request.params.saleId)
  return reply.send({ data: sale })
}
