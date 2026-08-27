// Per-platform validation for the declarative "create and provision" AdRun command, run *before*
// any local row is created and *before* any connector is ever called — see CLAUDE.md's Media/
// Advertisement/AdRun migration audit ("Per-platform validation before connector call").
export function validateAdRunCreateInput(input: {
  platform: string
  budget?: number
  startDate?: string
  endDate?: string
  placement?: string
}) {
  if (input.platform === 'LOOPIE') {
    throw { statusCode: 409, message: 'LOOPIE inventory is created as AdUnits, not AdRuns' }
  }
  if (!['META', 'GOOGLE', 'TIKTOK'].includes(input.platform)) {
    throw { statusCode: 400, message: `Unsupported platform: ${input.platform}` }
  }
  if (input.budget !== undefined && (!Number.isFinite(input.budget) || input.budget <= 0)) {
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
