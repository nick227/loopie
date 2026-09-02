import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Waves, Trash2 } from 'lucide-react'
import type { components } from '@project/sdk'
import {
  useCurrentUser,
  useRiverPost,
  useRiverComments,
  useCreateRiverComment,
  useDeleteRiverComment,
} from '@project/sdk'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { relativeTime } from '@/components/home/homeFormat'
import { useFlatPages } from '@/hooks/useFlatPages'
import { RiverFeedCard, CommentComposer } from '@/components/river/RiverFeedCard'

type RiverComment = components['schemas']['RiverComment']
type RiverCommentReply = components['schemas']['RiverCommentReply']

// The permalink/detail route — "View all comments" and MoreMenu's "View permalink" both land
// here now (see the "River comments" plan doc). The single post reuses RiverFeedCard (not a
// second post-rendering implementation); below it, the full one-level comment thread — every
// top-level comment with its replies, each top-level comment gets its own reply toggle, plus one
// page-level composer for a new top-level comment. Outside <AuthGuard/> in App.tsx, same as
// /river and /b/:slug — an anonymous visitor can read the thread, only a recognized viewer gets
// composer/reply/delete controls.
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

function CommentThreadRow({
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

export function RiverPostPage() {
  const { riverPostId } = useParams<{ riverPostId: string }>()
  const me = useCurrentUser()
  const viewerRecognized = !me.isLoading && Boolean(me.data?.data)
  const viewerBusinessId = me.data?.data?.businessId

  const postQuery = useRiverPost(riverPostId)
  const post = postQuery.data?.data?.post

  const commentsQuery = useRiverComments(riverPostId)
  const comments = useFlatPages(commentsQuery)
  const createComment = useCreateRiverComment()

  if (postQuery.isPending) {
    return (
      <div className="mx-auto max-w-[900px] space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  if (postQuery.isError || !post) {
    return (
      <div className="mx-auto max-w-[900px]">
        <EmptyState
          icon={Waves}
          title="Post not found"
          description="This post doesn't exist or was removed."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <RiverFeedCard item={post} viewerBusinessId={viewerBusinessId} />

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Comments
        </p>

        {viewerRecognized ? (
          <div className="mt-3">
            <CommentComposer
              pending={createComment.isPending}
              onSubmit={(body) => createComment.mutate({ riverPostId: post.id, body })}
            />
          </div>
        ) : null}

        {commentsQuery.isPending ? (
          <div className="mt-4 space-y-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : comments.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <div className="mt-4 space-y-5">
            {comments.map((comment) => (
              <CommentThreadRow
                key={comment.id}
                comment={comment}
                riverPostId={post.id}
                viewerBusinessId={viewerBusinessId}
                viewerRecognized={viewerRecognized}
              />
            ))}
          </div>
        )}

        {commentsQuery.hasNextPage ? (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={commentsQuery.isFetchingNextPage}
            onClick={() => commentsQuery.fetchNextPage()}
          >
            {commentsQuery.isFetchingNextPage ? 'Loading…' : 'Load more comments'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
