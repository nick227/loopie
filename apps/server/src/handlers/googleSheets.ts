import { GoogleSheetsService } from '../services/GoogleSheetsService'

const sheets = new GoogleSheetsService()

export async function getGoogleSheetsPickerToken(request: any, reply: any) {
  return reply.send({
    data: await sheets.pickerToken(request.user.businessId, request.params.integrationId),
  })
}

export async function selectGoogleSheetsSpreadsheet(request: any, reply: any) {
  return reply.send({
    data: await sheets.selectSpreadsheet(
      request.user.businessId,
      request.params.integrationId,
      request.body,
    ),
  })
}

export async function listGoogleSheetsTabs(request: any, reply: any) {
  return reply.send({
    data: await sheets.listTabs(request.user.businessId, request.params.integrationId),
  })
}

export async function selectGoogleSheetsTab(request: any, reply: any) {
  return reply.send({
    data: await sheets.selectTab(
      request.user.businessId,
      request.params.integrationId,
      request.body,
    ),
  })
}

export async function previewGoogleSheetsImport(request: any, reply: any) {
  return reply.send({
    data: await sheets.preview(
      request.user.businessId,
      request.params.integrationId,
      request.body?.mapping,
    ),
  })
}

export async function confirmGoogleSheetsMapping(request: any, reply: any) {
  return reply.send({
    data: await sheets.confirmMapping(
      request.user.businessId,
      request.params.integrationId,
      request.body,
    ),
  })
}

export async function exportContactsToGoogleSheets(request: any, reply: any) {
  return reply.send({
    data: await sheets.exportContacts(
      request.user.businessId,
      request.params.integrationId,
      request.body ?? {},
    ),
  })
}
