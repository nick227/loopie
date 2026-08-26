import { AssetService } from '../services/AssetService'

const assetService = new AssetService()

export async function listAssets(request: any, reply: any) {
  const data = await assetService.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function createAsset(request: any, reply: any) {
  const asset = await assetService.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: asset })
}

export async function getAsset(request: any, reply: any) {
  const asset = await assetService.get(request.user.businessId, request.params.assetId)
  return reply.send({ data: asset })
}

export async function deleteAsset(request: any, reply: any) {
  await assetService.delete(request.user.businessId, request.params.assetId)
  return reply.send({ data: null })
}
