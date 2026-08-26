import { db } from '@project/db'
import type { FormFieldType, Prisma } from '@prisma/client'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'

function toFormDTO(form: any) {
  return {
    id: form.id,
    businessId: form.businessId,
    name: form.name,
    submitLabel: form.submitLabel,
    successMessage: form.successMessage,
    fields: (form.fields ?? [])
      .slice()
      .sort((a: any, b: any) => a.order - b.order)
      .map((f: any) => ({
        id: f.id,
        label: f.label,
        fieldKey: f.fieldKey,
        type: f.type,
        required: f.required,
        options: f.options,
        order: f.order,
      })),
    createdAt: form.createdAt.toISOString(),
  }
}

const INCLUDE = { fields: true }

export class FormService {
  async list(businessId: string, opts: { cursor?: string; limit?: number }) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const forms = await db.form.findMany({
      where: { businessId, deletedAt: null, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: INCLUDE,
    })
    const hasMore = forms.length > limit
    const items = hasMore ? forms.slice(0, limit) : forms
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
    return { data: items.map(toFormDTO), meta: { hasMore, nextCursor } }
  }

  async create(businessId: string, data: any) {
    const form = await db.form.create({
      data: {
        businessId,
        name: data.name,
        submitLabel: data.submitLabel ?? 'Submit',
        successMessage: data.successMessage,
        fields: {
          create: data.fields.map((f: any, index: number) => ({
            label: f.label,
            fieldKey: f.fieldKey,
            type: f.type,
            required: f.required ?? false,
            options: f.options,
            order: f.order ?? index,
          })),
        },
      },
      include: INCLUDE,
    })
    return toFormDTO(form)
  }

  async get(businessId: string, formId: string) {
    const form = await db.form.findFirst({
      where: { id: formId, businessId, deletedAt: null },
      include: INCLUDE,
    })
    if (!form) throw { statusCode: 404, message: 'Form not found' }
    return toFormDTO(form)
  }

  // Fields are replaced wholesale on update — simpler than diffing, and safe to do freely because
  // a Form is a live, reusable entity shared across pages, not a per-publish snapshot: any
  // already-published page keeps rendering/validating against the field list frozen onto its
  // PublishedPageVersion at publish time (see LandingPageService.publish / lib/formSnapshot.ts),
  // so editing a Form here only affects pages published (or republished) after this call.
  async update(businessId: string, formId: string, data: any) {
    await this.get(businessId, formId)
    return db.$transaction(async (tx) => {
      if (data.fields !== undefined) {
        await tx.formField.deleteMany({ where: { formId } })
        await tx.formField.createMany({
          data: data.fields.map(
            (
              f: {
                label: string
                fieldKey: string
                type: FormFieldType
                required?: boolean
                options?: Prisma.InputJsonValue
                order?: number
              },
              index: number,
            ) => ({
              formId,
              label: f.label,
              fieldKey: f.fieldKey,
              type: f.type,
              required: f.required ?? false,
              options: f.options,
              order: f.order ?? index,
            }),
          ),
        })
      }
      const form = await tx.form.update({
        where: { id: formId },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.submitLabel !== undefined ? { submitLabel: data.submitLabel } : {}),
          ...(data.successMessage !== undefined ? { successMessage: data.successMessage } : {}),
        },
        include: INCLUDE,
      })
      return toFormDTO(form)
    })
  }

  async delete(businessId: string, formId: string) {
    await this.get(businessId, formId)
    await db.form.update({ where: { id: formId }, data: { deletedAt: new Date() } })
  }
}
