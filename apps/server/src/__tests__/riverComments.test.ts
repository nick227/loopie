// Regression coverage for "River comments" — one level of nesting only, latest-2 inline preview
// backed by the same list endpoint the full-thread permalink page uses, content-negotiated
// serveRiverPost. Real assertions, hand-written, against loopie_test.
import { describe, expect, it } from 'vitest'
import { buildTestApp, asAuth } from './helpers'

const app = buildTestApp()

async function registerBusiness(email: string, businessName: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password: 'password12', businessName },
  })
  expect(res.statusCode).toBe(201)
  const data = res.json().data
  return { businessId: data.businessId as string, userId: data.id as string }
}

async function createTextPost(userId: string, body: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/river/posts',
    headers: asAuth(userId),
    payload: { type: 'TEXT', body },
  })
  expect(res.statusCode).toBe(201)
  return res.json().data.id as string
}

async function createComment(
  userId: string,
  riverPostId: string,
  body: string,
  parentCommentId?: string,
) {
  const res = await app.inject({
    method: 'POST',
    url: `/river/posts/${riverPostId}/comments`,
    headers: asAuth(userId),
    payload: parentCommentId ? { body, parentCommentId } : { body },
  })
  return res
}

describe('River comments', () => {
  it('lists top-level comments newest-first, each with its own replies oldest-first', async () => {
    const author = await registerBusiness('comments-author@river.local', 'Author Co')
    const commenter = await registerBusiness('comments-commenter@river.local', 'Commenter Co')
    const postId = await createTextPost(author.userId, 'Comment on me.')

    const first = await createComment(commenter.userId, postId, 'First comment')
    expect(first.statusCode).toBe(201)
    const firstId = first.json().data.id as string

    const second = await createComment(commenter.userId, postId, 'Second comment')
    expect(second.statusCode).toBe(201)
    const secondId = second.json().data.id as string

    const reply1 = await createComment(author.userId, postId, 'First reply', firstId)
    expect(reply1.statusCode).toBe(201)
    const reply2 = await createComment(commenter.userId, postId, 'Second reply', firstId)
    expect(reply2.statusCode).toBe(201)

    const list = await app.inject({ method: 'GET', url: `/river/posts/${postId}/comments` })
    expect(list.statusCode).toBe(200)
    const body = list.json()
    expect(body.data).toHaveLength(2)
    // Newest top-level comment first.
    expect(body.data[0].id).toBe(secondId)
    expect(body.data[0].body).toBe('Second comment')
    expect(body.data[0].parentCommentId).toBeNull()
    expect(body.data[0].replies).toEqual([])

    expect(body.data[1].id).toBe(firstId)
    expect(body.data[1].replies).toHaveLength(2)
    // Oldest reply first within the thread.
    expect(body.data[1].replies[0].body).toBe('First reply')
    expect(body.data[1].replies[1].body).toBe('Second reply')
    expect(body.data[1].replies[0].parentCommentId).toBe(firstId)
    expect(body.data[1].replies[0].business.name).toBe('Author Co')
  })

  it('limit=2 returns just the latest two top-level comments, matching the inline preview contract', async () => {
    const author = await registerBusiness('comments-limit-author@river.local', 'Limit Author Co')
    const postId = await createTextPost(author.userId, 'Many comments incoming.')
    for (let i = 1; i <= 3; i++) {
      const res = await createComment(author.userId, postId, `Comment ${i}`)
      expect(res.statusCode).toBe(201)
    }

    const preview = await app.inject({
      method: 'GET',
      url: `/river/posts/${postId}/comments?limit=2`,
    })
    expect(preview.statusCode).toBe(200)
    const body = preview.json()
    expect(body.data).toHaveLength(2)
    expect(body.data[0].body).toBe('Comment 3')
    expect(body.data[1].body).toBe('Comment 2')
    expect(body.meta.nextCursor).toBeTruthy()
  })

  it('rejects replying to a reply — one level of nesting only', async () => {
    const author = await registerBusiness(
      'comments-nesting-author@river.local',
      'Nesting Author Co',
    )
    const postId = await createTextPost(author.userId, 'Nesting test.')
    const top = await createComment(author.userId, postId, 'Top level')
    const topId = top.json().data.id as string
    const reply = await createComment(author.userId, postId, 'A reply', topId)
    expect(reply.statusCode).toBe(201)
    const replyId = reply.json().data.id as string

    const replyToReply = await createComment(author.userId, postId, 'Reply to a reply', replyId)
    expect(replyToReply.statusCode).toBe(400)
  })

  it('is not owner-restricted — any authenticated business can comment on any post', async () => {
    const author = await registerBusiness('comments-open-author@river.local', 'Open Author Co')
    const stranger = await registerBusiness(
      'comments-open-stranger@river.local',
      'Open Stranger Co',
    )
    const postId = await createTextPost(author.userId, 'Anyone can comment.')

    const res = await createComment(stranger.userId, postId, 'A stranger comments.')
    expect(res.statusCode).toBe(201)
    expect(res.json().data.business.name).toBe('Open Stranger Co')
  })

  it('a reply pointing at a comment on another post 404s; commenting requires authentication', async () => {
    const author = await registerBusiness(
      'comments-crosspost-author@river.local',
      'Crosspost Author Co',
    )
    const postA = await createTextPost(author.userId, 'Post A')
    const postB = await createTextPost(author.userId, 'Post B')
    const commentOnA = await createComment(author.userId, postA, 'On post A')
    const commentOnAId = commentOnA.json().data.id as string

    const replyOnWrongPost = await createComment(
      author.userId,
      postB,
      'Reply on the wrong post',
      commentOnAId,
    )
    expect(replyOnWrongPost.statusCode).toBe(404)

    const anon = await app.inject({
      method: 'POST',
      url: `/river/posts/${postA}/comments`,
      payload: { body: 'Anonymous attempt' },
    })
    expect(anon.statusCode).toBe(401)
  })

  it('delete is own-comment-only, idempotent-safe on repeat calls, and 404s for another business', async () => {
    const author = await registerBusiness('comments-delete-author@river.local', 'Delete Author Co')
    const other = await registerBusiness('comments-delete-other@river.local', 'Delete Other Co')
    const postId = await createTextPost(author.userId, 'Delete test.')
    const comment = await createComment(author.userId, postId, 'Delete me')
    const commentId = comment.json().data.id as string

    const wrongOwner = await app.inject({
      method: 'DELETE',
      url: `/river/posts/${postId}/comments/${commentId}`,
      headers: asAuth(other.userId),
    })
    expect(wrongOwner.statusCode).toBe(404)

    const del1 = await app.inject({
      method: 'DELETE',
      url: `/river/posts/${postId}/comments/${commentId}`,
      headers: asAuth(author.userId),
    })
    expect(del1.statusCode).toBe(200)

    const del2 = await app.inject({
      method: 'DELETE',
      url: `/river/posts/${postId}/comments/${commentId}`,
      headers: asAuth(author.userId),
    })
    expect(del2.statusCode).toBe(200)

    const list = await app.inject({ method: 'GET', url: `/river/posts/${postId}/comments` })
    expect(list.json().data).toEqual([])
  })

  it('a deleted comment count is reflected in the feed item metrics, and serveRiverPost is content-negotiated the same way as the other River endpoints', async () => {
    const author = await registerBusiness(
      'comments-metrics-author@river.local',
      'Metrics Author Co',
    )
    const postId = await createTextPost(author.userId, 'Count me.')
    const c1 = await createComment(author.userId, postId, 'One')
    const commentId = c1.json().data.id as string
    await createComment(author.userId, postId, 'Two')

    const htmlRes = await app.inject({ method: 'GET', url: `/river/posts/${postId}` })
    expect(htmlRes.statusCode).toBe(200)
    expect(htmlRes.headers['content-type']).toContain('text/html')

    const jsonRes = await app.inject({
      method: 'GET',
      url: `/river/posts/${postId}`,
      headers: { accept: 'application/json' },
    })
    expect(jsonRes.statusCode).toBe(200)
    expect(jsonRes.json().data.post.metrics.comments).toBe(2)

    await app.inject({
      method: 'DELETE',
      url: `/river/posts/${postId}/comments/${commentId}`,
      headers: asAuth(author.userId),
    })

    const afterDelete = await app.inject({
      method: 'GET',
      url: `/river/posts/${postId}`,
      headers: { accept: 'application/json' },
    })
    expect(afterDelete.json().data.post.metrics.comments).toBe(1)
  })
})
