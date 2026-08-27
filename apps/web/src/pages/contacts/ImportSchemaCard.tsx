import { IMPORT_CONTACT_FIELDS, SAMPLE_CSV, SAMPLE_JSON, type ImportFieldGroup } from '@project/sdk'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

const GROUP_LABEL: Record<ImportFieldGroup, string> = {
  identity: 'Identity — maps onto the person',
  consent: 'Consent — new people only',
  profile: 'Profile — stored on the import record',
}

const GROUPS: ImportFieldGroup[] = ['identity', 'consent', 'profile']

export function ImportSchemaCard() {
  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-medium">Import schema</p>
        <p className="text-xs text-muted-foreground">
          CSV needs a header row. JSON is an array of objects, or {'{ "contacts": [...] }'}. At
          least one of email, phone, or externalId is required per person. Matching is external id,
          then email, then phone — never name.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {GROUPS.map((group) => (
          <div key={group}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {GROUP_LABEL[group]}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="py-1 pr-3 font-medium">Field</th>
                    <th className="py-1 pr-3 font-medium">Also accepts</th>
                    <th className="py-1 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {IMPORT_CONTACT_FIELDS.filter((field) => field.group === group).map((field) => (
                    <tr key={field.key} className="border-t border-border/60 align-top">
                      <td className="py-1.5 pr-3 font-mono text-xs">{field.key}</td>
                      <td className="py-1.5 pr-3 font-mono text-xs text-muted-foreground">
                        {field.aliases.length ? field.aliases.join(', ') : '—'}
                      </td>
                      <td className="py-1.5 text-xs text-muted-foreground">{field.hint || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-3 pt-1">
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`}
            download="loopie-contacts.csv"
            className="text-xs underline underline-offset-4"
          >
            Sample CSV
          </a>
          <a
            href={`data:application/json;charset=utf-8,${encodeURIComponent(SAMPLE_JSON)}`}
            download="loopie-contacts.json"
            className="text-xs underline underline-offset-4"
          >
            Sample JSON
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
