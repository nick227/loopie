import { AssetService } from '../services/AssetService'

const assetService = new AssetService()

export async function listAssets(
  request: { user: { businessId: string }; query: object },
  reply: { send: (body: unknown) => unknown },
) {
  const data = await assetService.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function createAsset(
  request: { user: { businessId: string }; body: Parameters<AssetService['create']>[1] },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  const asset = await assetService.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: asset })
}

export async function getAsset(
  request: { user: { businessId: string }; params: { assetId: string } },
  reply: { send: (body: unknown) => unknown },
) {
  const asset = await assetService.get(request.user.businessId, request.params.assetId)
  return reply.send({ data: asset })
}

export async function updateAsset(
  request: {
    user: { businessId: string }
    params: { assetId: string }
    body: Parameters<AssetService['update']>[2]
  },
  reply: { send: (body: unknown) => unknown },
) {
  const asset = await assetService.update(
    request.user.businessId,
    request.params.assetId,
    request.body,
  )
  return reply.send({ data: asset })
}

export async function deleteAsset(
  request: { user: { businessId: string }; params: { assetId: string } },
  reply: { send: (body: unknown) => unknown },
) {
  await assetService.delete(request.user.businessId, request.params.assetId)
  return reply.send({ data: null })
}
