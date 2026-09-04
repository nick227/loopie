import { useParams } from 'react-router-dom'
import { Waves } from 'lucide-react'
import { useCurrentUser, useRiverPost, useRiverComments, useCreateRiverComment } from '@project/sdk'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { useFlatPages } from '@/hooks/useFlatPages'
import { RiverFeedCard, CommentComposer } from '@/components/river/RiverFeedCard'
import { CommentThreadRow } from '@/components/river/CommentThread'

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
