import { db } from '@project/db'
import type { Prisma } from '@prisma/client'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'

const ACTOR_SELECT = { id: true, name: true, slug: true, logoUrl: true } as const

export type RiverCommentReplyDTO = {
  id: string
  riverPostId: string
  business: { id: string; name: string; slug: string | null; logoUrl: string | null }
  body: string
  parentCommentId: string
  createdAt: string
}

export type RiverCommentDTO = {
  id: string
  riverPostId: string
  business: { id: string; name: string; slug: string | null; logoUrl: string | null }
  body: string
  parentCommentId: null
  createdAt: string
  // One level only — a reply never carries its own `replies` field, matching the DB model and
  // the OpenAPI contract's RiverCommentReply schema (no self-reference). See the "River comments"
  // plan doc.
  replies: RiverCommentReplyDTO[]
}

const COMMENT_WITH_REPLIES_INCLUDE = {
  actor: { select: ACTOR_SELECT },
  replies: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    include: { actor: { select: ACTOR_SELECT } },
  },
} as const

type CommentRow = Prisma.RiverCommentGetPayload<{ include: typeof COMMENT_WITH_REPLIES_INCLUDE }>

function toCommentDTO(row: CommentRow): RiverCommentDTO {
  return {
    id: row.id,
    riverPostId: row.riverPostId,
    business: row.actor,
    body: row.body,
    parentCommentId: null,
    createdAt: row.createdAt.toISOString(),
    replies: row.replies.map((reply) => ({
      id: reply.id,
      riverPostId: reply.riverPostId,
      business: reply.actor,
      body: reply.body,
      parentCommentId: row.id,
      createdAt: reply.createdAt.toISOString(),
    })),
  }
}

// River comments — one level of nesting only (see the "River comments" plan doc). Same shape
// discipline as RiverFollowService: no engagement-event logging (the comment row itself is the
// record, same reasoning as RiverReaction), soft-delete only (RiverPost.delete's own precedent —
// a hard delete would orphan any replies pointing at this row).
export class RiverCommentService {
  // Top-level comments newest-first (mirrors RiverPostService#fetchPage's exact cursor
  // construction), each with its own replies oldest-first (reads as a conversation). Public — no
  // more auth than reading the feed itself requires.
  async list(riverPostId: string, opts: { cursor?: string; limit?: number } = {}) {
    const post = await db.riverPost.findFirst({ where: { id: riverPostId, deletedAt: null } })
    if (!post) throw { statusCode: 404, message: 'River post not found' }

    const limit = normalizeLimit(opts.limit, 50, 20)
    const cursor = decodeCursor(opts.cursor)
    const AND: Prisma.RiverCommentWhereInput[] = []
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }

    const rows = await db.riverComment.findMany({
      where: {
        riverPostId,
        parentCommentId: null,
        deletedAt: null,
        ...(AND.length ? { AND } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: COMMENT_WITH_REPLIES_INCLUDE,
    })

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    const last = page[page.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null

    return { data: page.map(toCommentDTO), meta: { hasMore, nextCursor } }
  }

  async create(
    riverPostId: string,
    actorBusinessId: string,
    data: { body: string; parentCommentId?: string },
  ): Promise<RiverCommentReplyDTO | RiverCommentDTO> {
    const post = await db.riverPost.findFirst({ where: { id: riverPostId, deletedAt: null } })
    if (!post) throw { statusCode: 404, message: 'River post not found' }

    if (data.parentCommentId) {
      const parent = await db.riverComment.findFirst({
        where: { id: data.parentCommentId, riverPostId, deletedAt: null },
      })
      if (!parent) throw { statusCode: 404, message: 'Comment not found' }
      if (parent.parentCommentId) {
        throw { statusCode: 400, message: 'Cannot reply to a reply — one level of nesting only' }
      }
    }

    const row = await db.riverComment.create({
      data: {
        riverPostId,
        actorBusinessId,
        body: data.body,
        parentCommentId: data.parentCommentId ?? null,
      },
      include: { actor: { select: ACTOR_SELECT } },
    })

    if (!row.parentCommentId) {
      return { ...toCommentDTO({ ...row, replies: [] }) }
    }
    return {
      id: row.id,
      riverPostId: row.riverPostId,
      business: row.actor,
      body: row.body,
      parentCommentId: row.parentCommentId,
      createdAt: row.createdAt.toISOString(),
    }
  }

  // Own comment only, same "404 for anyone else's" convention as RiverPostService#delete rather
  // than a 403 that would confirm the comment exists to someone who can't touch it.
  async delete(commentId: string, actorBusinessId: string) {
    const row = await db.riverComment.findFirst({ where: { id: commentId, actorBusinessId } })
    if (!row) throw { statusCode: 404, message: 'Comment not found' }
    await db.riverComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } })
  }
}
