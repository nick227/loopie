import { useCurrentUser, useRiverComments, useCreateRiverComment } from '@project/sdk'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { CommentComposer } from '@/components/river/RiverFeedCard'
import { CommentThreadRow } from '@/components/river/CommentThread'
import { useFlatPages } from '@/hooks/useFlatPages'

export function CommentSheet({
  riverPostId,
  onClose,
}: {
  riverPostId: string
  onClose: () => void
}) {
  const me = useCurrentUser()
  const viewerRecognized = !me.isLoading && Boolean(me.data?.data)
  const viewerBusinessId = me.data?.data?.businessId

  const commentsQuery = useRiverComments(riverPostId)
  const comments = useFlatPages(commentsQuery)
  const createComment = useCreateRiverComment()

  return (
    <Modal title="Comments" onClose={onClose} size="full">
      <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-5">
        {viewerRecognized ? (
          <div className="mb-4">
            <CommentComposer
              pending={createComment.isPending}
              onSubmit={(body) => createComment.mutate({ riverPostId, body })}
            />
          </div>
        ) : null}

        {commentsQuery.isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet — be the first.</p>
        ) : (
          <div className="space-y-5">
            {comments.map((comment) => (
              <CommentThreadRow
                key={comment.id}
                comment={comment}
                riverPostId={riverPostId}
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
    </Modal>
  )
}
