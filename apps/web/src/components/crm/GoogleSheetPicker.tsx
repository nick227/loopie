import { useCallback, useState } from 'react'
import { useGoogleSheetsPickerToken } from '@project/sdk'
import { Button } from '@/components/ui/Button'

// Minimal shape of the pieces of the Google Picker/gapi JS APIs this file actually calls — real
// types live in @types/google.picker, not worth pulling in for one file. Both PickerBuilder and
// DocsView are chainable builders; only the methods this file actually calls are named.
interface GooglePickerChainable {
  addView(view: GooglePickerChainable): GooglePickerChainable
  setMode(mode: unknown): GooglePickerChainable
  setOAuthToken(token: string): GooglePickerChainable
  setCallback(
    callback: (result: { action: string; docs?: { id: string; name: string }[] }) => void,
  ): GooglePickerChainable
  setDeveloperKey(key: string): GooglePickerChainable
  setAppId(id: string): GooglePickerChainable
  build(): GooglePickerChainable
  setVisible(visible: boolean): GooglePickerChainable
}

declare global {
  interface Window {
    gapi?: { load: (api: string, opts: { callback: () => void }) => void }
    google?: {
      picker: {
        PickerBuilder: new () => GooglePickerChainable
        DocsView: new (viewId: unknown) => GooglePickerChainable
        ViewId: { SPREADSHEETS: unknown }
        DocsViewMode: { LIST: unknown }
        Action: { PICKED: string }
      }
    }
  }
}

let gapiLoadPromise: Promise<void> | null = null

function loadGapiScript(): Promise<void> {
  if (window.gapi?.load) return Promise.resolve()
  if (gapiLoadPromise) return gapiLoadPromise
  gapiLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://apis.google.com/js/api.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google API script'))
    document.head.appendChild(script)
  })
  return gapiLoadPromise
}

function loadPickerLibrary(): Promise<void> {
  return loadGapiScript().then(
    () => new Promise((resolve) => window.gapi!.load('picker', { callback: resolve })),
  )
}

// Public, browser-restricted (by HTTP referrer in Google Cloud Console) — not a secret, unlike the
// OAuth client secret, which never leaves the server.
const API_KEY = import.meta.env.VITE_GOOGLE_PICKER_API_KEY as string | undefined
const APP_ID = import.meta.env.VITE_GOOGLE_PICKER_APP_ID as string | undefined

export function GoogleSheetPicker({
  integrationId,
  onPicked,
}: {
  integrationId: string
  onPicked: (file: { id: string; name: string }) => void
}) {
  const pickerToken = useGoogleSheetsPickerToken()
  const [opening, setOpening] = useState(false)
  const configured = Boolean(API_KEY)

  const open = useCallback(async () => {
    setOpening(true)
    try {
      const result = await pickerToken.mutateAsync(integrationId)
      await loadPickerLibrary()
      const picker = window.google!.picker
      const view = new picker.DocsView(picker.ViewId.SPREADSHEETS).setMode(picker.DocsViewMode.LIST)
      const builder = new picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(result.data!.accessToken)
        .setCallback((pickerResult: { action: string; docs?: { id: string; name: string }[] }) => {
          if (pickerResult.action === picker.Action.PICKED && pickerResult.docs?.[0]) {
            const doc = pickerResult.docs[0]
            onPicked({ id: doc.id, name: doc.name })
          }
        })
      if (API_KEY) builder.setDeveloperKey(API_KEY)
      if (APP_ID) builder.setAppId(APP_ID)
      builder.build().setVisible(true)
    } finally {
      setOpening(false)
    }
  }, [integrationId, onPicked, pickerToken])

  return (
    <div className="space-y-1">
      <Button type="button" onClick={open} disabled={!configured || opening}>
        {opening ? 'Opening Google Drive…' : 'Choose a spreadsheet'}
      </Button>
      {!configured ? (
        <p className="text-xs text-muted-foreground">
          Set VITE_GOOGLE_PICKER_API_KEY to enable the file picker.
        </p>
      ) : null}
    </div>
  )
}
