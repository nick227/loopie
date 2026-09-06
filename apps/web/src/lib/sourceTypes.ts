// Shared with ContactSales, which held its own identical copy before this file existed.
export const SOURCE_TYPE_LABEL: Record<
  'MESSAGE' | 'DEPLOYMENT' | 'AD_RUN' | 'AD_UNIT' | 'MANUAL' | 'IMPORT',
  string
> = {
  MESSAGE: 'Message',
  DEPLOYMENT: 'Ad campaign',
  AD_RUN: 'Ad',
  AD_UNIT: 'LOOPIE ad',
  MANUAL: 'Manual',
  IMPORT: 'Imported',
}
