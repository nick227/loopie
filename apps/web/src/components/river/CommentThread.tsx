import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { components } from '@project/sdk'
import { useCreateRiverComment, useDeleteRiverComment } from '@project/sdk'
import { Avatar } from '@/components/ui/Avatar'
import { relativeTime } from '@/components/home/homeFormat'
import { CommentComposer } from '@/components/river/RiverFeedCard'

type RiverComment = components['schemas']['RiverComment']
type RiverCommentReply = components['schemas']['RiverCommentReply']

function ReplyRow({ reply }: { reply: RiverCommentReply }) {
  return (
    <div className="flex items-start gap-2.5">
      <Avatar src={reply.business.logoUrl} name={reply.business.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">
          <span className="font-semibold text-foreground">{reply.business.name}</span>{' '}
          <span className="text-foreground">{reply.body}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{relativeTime(reply.createdAt)}</p>
      </div>
    </div>
  )
}

export function CommentThreadRow({
  comment,
  riverPostId,
  viewerBusinessId,
  viewerRecognized,
}: {
  comment: RiverComment
  riverPostId: string
  viewerBusinessId?: string
  viewerRecognized: boolean
}) {
  const [replyOpen, setReplyOpen] = useState(false)
  const createComment = useCreateRiverComment()
  const deleteComment = useDeleteRiverComment()
  const isOwnComment = viewerBusinessId === comment.business.id

  return (
    <div className="flex items-start gap-2.5">
      <Avatar src={comment.business.logoUrl} name={comment.business.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">
          <span className="font-semibold text-foreground">{comment.business.name}</span>{' '}
          <span className="text-foreground">{comment.body}</span>
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{relativeTime(comment.createdAt)}</span>
          {viewerRecognized ? (
            <button
              type="button"
              onClick={() => setReplyOpen((v) => !v)}
              className="font-medium transition-colors hover:text-foreground"
            >
              Reply
            </button>
          ) : null}
          {isOwnComment ? (
            <button
              type="button"
              disabled={deleteComment.isPending}
              onClick={() => deleteComment.mutate({ riverPostId, commentId: comment.id })}
              className="flex items-center gap-1 font-medium transition-colors hover:text-destructive"
            >
              <Trash2 size={12} /> Delete
            </button>
          ) : null}
        </div>

        {replyOpen ? (
          <div className="mt-2">
            <CommentComposer
              pending={createComment.isPending}
              onSubmit={(body) => {
                createComment.mutate(
                  { riverPostId, body, parentCommentId: comment.id },
                  { onSuccess: () => setReplyOpen(false) },
                )
              }}
            />
          </div>
        ) : null}

        {comment.replies.length ? (
          <div className="mt-3 space-y-3 border-l border-border pl-3">
            {comment.replies.map((reply) => (
              <ReplyRow key={reply.id} reply={reply} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
