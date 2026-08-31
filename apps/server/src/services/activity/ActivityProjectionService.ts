import { db } from '@project/db'

export class ActivityProjectionService {
  /**
   * Centralized dispatcher for all Activity projections.
   * Dynamically loads the specific projector based on `sourceRecordType` to prevent circular dependencies.
   * If a projection fails, it fails open (does not throw) but records an ActivityProjectionFailure row.
   */
  static async project(
    businessId: string,
    sourceRecordType: string,
    sourceRecordId: string,
    action: string,
    ...args: any[]
  ) {
    try {
      switch (sourceRecordType) {
        case 'AdRun': {
          const { AdRunProjector } = await import('./AdRunProjector')
          if (action === 'project') {
            await AdRunProjector.project(args[0], args[1])
          }
          break
        }
        case 'AutomationLog': {
          const { AutomationProjector } = await import('./AutomationProjector')
          if (action === 'project') {
            await AutomationProjector.project(args[0], args[1])
          }
          break
        }
        case 'Sale': {
          const { SaleProjector } = await import('./SaleProjector')
          if (action === 'project') {
            await SaleProjector.project(args[0], args[1])
          }
          break
        }
        case 'Lead': {
          const { LeadProjector } = await import('./LeadProjector')
          if (action === 'projectStatusChange') {
            await LeadProjector.projectStatusChange(args[0], args[1], args[2])
          } else if (action === 'projectCreated') {
            await LeadProjector.project(args[0], args[1])
          }
          break
        }
        case 'LandingPage': {
          const { PageProjector } = await import('./PageProjector')
          if (action === 'project') {
            await PageProjector.project(args[0])
          }
          break
        }
        case 'Interaction': {
          const { FormSubmissionProjector } = await import('./FormSubmissionProjector')
          if (action === 'project') {
            await FormSubmissionProjector.project(args[0], args[1], args[2])
          }
          break
        }
        default:
          throw new Error(`Unknown sourceRecordType for projection: ${sourceRecordType}`)
      }
    } catch (err: any) {
      console.error(`Failed to project ${sourceRecordType} ${sourceRecordId}`, err)
      try {
        await db.activityProjectionFailure.create({
          data: {
            businessId,
            sourceRecordType,
            sourceRecordId,
            error: err?.message || String(err),
          },
        })
      } catch (logErr) {
        // Absolute last resort fail-open
        console.error('Failed to durably log ActivityProjectionFailure', logErr)
      }
    }
  }
}
