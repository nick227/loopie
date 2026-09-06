import { useState, useRef, useEffect } from 'react'
import { Button } from './Button'
import { Download, Upload, ChevronDown } from 'lucide-react'

export interface ExportImportActionsProps {
  onImportCsv?: () => void
  onImportGoogleSheets?: () => void
  onExportCsv?: () => void
  onExportGoogleSheets?: () => void
}

export function ExportImportActions({
  onImportCsv,
  onImportGoogleSheets,
  onExportCsv,
  onExportGoogleSheets,
}: ExportImportActionsProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)} className="gap-2">
        Data Actions <ChevronDown size={14} />
      </Button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-card border shadow-lg focus:outline-none">
          <div className="py-1">
            {onImportCsv && (
              <button
                onClick={() => {
                  setOpen(false)
                  onImportCsv()
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Upload size={14} /> Import CSV
              </button>
            )}
            {onImportGoogleSheets && (
              <button
                onClick={() => {
                  setOpen(false)
                  onImportGoogleSheets()
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Upload size={14} /> Import Google Sheets
              </button>
            )}
            {onExportCsv && (
              <button
                onClick={() => {
                  setOpen(false)
                  onExportCsv()
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Download size={14} /> Export CSV
              </button>
            )}
            {onExportGoogleSheets && (
              <button
                onClick={() => {
                  setOpen(false)
                  onExportGoogleSheets()
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Download size={14} /> Export Google Sheets
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
