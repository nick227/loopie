import { GoogleSheetsService } from '../services/GoogleSheetsService'

const sheets = new GoogleSheetsService()

export async function getGoogleSheetsPickerToken(request: any, reply: any) {
  return reply.send({
    data: await sheets.pickerToken(request.user.businessId, request.params.integrationId),
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
