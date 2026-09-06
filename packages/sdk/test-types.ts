import { getApiClient } from './src/client'
const client = getApiClient()
type T = ReturnType<typeof client.GET<'/admin/house-ads'>>
