export function validateAdRunCreateInput(input: {
  platform: string
  budget?: number
  startDate?: string
  endDate?: string
  placement?: string
  destinationLandingPageId?: string
}) {
  if (!['META', 'GOOGLE', 'TIKTOK', 'LOOPIE'].includes(input.platform)) {
    throw { statusCode: 400, message: `Unsupported platform: ${input.platform}` }
  }
  if (input.platform === 'LOOPIE' && !input.destinationLandingPageId) {
    throw { statusCode: 400, message: 'A page is required' }
  }
  if (input.budget !== undefined && (!Number.isFinite(input.budget) || input.budget < 0)) {
    throw { statusCode: 400, message: 'budget cannot be negative' }
  }
  if (input.platform !== 'LOOPIE' && input.budget === 0) {
    throw { statusCode: 400, message: 'budget must be a positive number' }
  }
  if (input.startDate && Number.isNaN(new Date(input.startDate).getTime())) {
    throw { statusCode: 400, message: 'startDate is not a valid date' }
  }
  if (input.endDate && Number.isNaN(new Date(input.endDate).getTime())) {
    throw { statusCode: 400, message: 'endDate is not a valid date' }
  }
  if (input.startDate && input.endDate && new Date(input.endDate) <= new Date(input.startDate)) {
    throw { statusCode: 400, message: 'endDate must be after startDate' }
  }
}
