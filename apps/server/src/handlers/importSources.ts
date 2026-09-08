import { ImportSourceService } from '../services/ImportSourceService'

const sources = new ImportSourceService()

export async function listImportSources(request: any, reply: any) {
  return reply.send({
    data: await sources.list(request.user.businessId, request.params.integrationId),
  })
}

export async function getImportSourceTabs(request: any, reply: any) {
  return reply.send({
    data: await sources.tabs(
      request.user.businessId,
      request.params.integrationId,
      request.query.spreadsheetId,
    ),
  })
}

export async function createImportSource(request: any, reply: any) {
  return reply.send({
    data: await sources.create(request.user.businessId, request.params.integrationId, request.body),
  })
}

export async function getImportSource(request: any, reply: any) {
  return reply.send({
    data: await sources.get(
      request.user.businessId,
      request.params.integrationId,
      request.params.sourceId,
    ),
  })
}

export async function previewImportSource(request: any, reply: any) {
  return reply.send({
    data: await sources.preview(
      request.user.businessId,
      request.params.integrationId,
      request.params.sourceId,
      request.body?.mapping,
    ),
  })
}

export async function confirmImportSourceMapping(request: any, reply: any) {
  return reply.send({
    data: await sources.confirm(
      request.user.businessId,
      request.params.integrationId,
      request.params.sourceId,
      request.body,
    ),
  })
}

export async function syncImportSource(request: any, reply: any) {
  return reply.send({
    data: await sources.sync(
      request.user.businessId,
      request.params.integrationId,
      request.params.sourceId,
    ),
  })
}

export async function listImportSourceRuns(request: any, reply: any) {
  return reply.send({
    data: await sources.history(
      request.user.businessId,
      request.params.integrationId,
      request.params.sourceId,
      request.query?.before,
    ),
  })
}
