import type { Prisma, FormFieldType } from '@prisma/client'

// Frozen shape stored on PublishedPageVersion.formSnapshot — everything a hosted page needs to
// render its form and validate a submission without touching the live, mutable Form/FormField
// rows. See "Landing-Page Capture Immutability" in CLAUDE.md.
export type FormSnapshot = {
  id: string
  submitLabel: string
  successMessage: string | null
  fields: {
    label: string
    fieldKey: string
    type: FormFieldType
    required: boolean
    options: unknown
    order: number
  }[]
}

// Whether the pinned Form is still live (not soft-deleted). Deliberately checked against the
// *live* Form row even for a page that has a frozen formSnapshot — freezing the field structure
// protects a published page from unrelated Form edits, but deleting a Form is a distinct,
// deliberate "stop collecting through this" action that must take effect immediately everywhere
// it's used, published pages included (see publicAuth.test.ts's "does not collect on a
// soft-deleted form").
export async function isFormLive(
  db: Prisma.TransactionClient,
  formId: string | null,
): Promise<boolean> {
  if (!formId) return false
  const form = await db.form.findFirst({
    where: { id: formId, deletedAt: null },
    select: { id: true },
  })
  return !!form
}

// Reads the *live* Form + FormField rows for the given id and freezes them into a FormSnapshot.
// Called at publish time (to create the frozen copy) and as a fallback when consuming a
// PublishedPageVersion that predates this field (formSnapshot is null) — in that legacy case
// only, this intentionally reflects however the Form looks right now, since no earlier snapshot
// exists to fall back to.
export async function snapshotForm(
  db: Prisma.TransactionClient,
  formId: string | null,
): Promise<FormSnapshot | null> {
  if (!formId) return null
  const form = await db.form.findFirst({
    where: { id: formId, deletedAt: null },
    include: { fields: { orderBy: { order: 'asc' } } },
  })
  if (!form) return null
  return {
    id: form.id,
    submitLabel: form.submitLabel,
    successMessage: form.successMessage,
    fields: form.fields.map((field) => ({
      label: field.label,
      fieldKey: field.fieldKey,
      type: field.type,
      required: field.required,
      options: field.options,
      order: field.order,
    })),
  }
}
