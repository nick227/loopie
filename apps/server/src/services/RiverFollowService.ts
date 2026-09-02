import { db } from '@project/db'

// A plain directed edge between businesses (see RiverFollow in schema.prisma) — not tied to any
// post. Same idempotent-toggle discipline as RiverPostService's react/unreact.
export class RiverFollowService {
  async follow(followerBusinessId: string, followedBusinessId: string) {
    if (followerBusinessId === followedBusinessId) {
      throw { statusCode: 400, message: 'A business cannot follow itself' }
    }
    const followed = await db.business.findUnique({ where: { id: followedBusinessId } })
    if (!followed) throw { statusCode: 404, message: 'Business not found' }

    await db.riverFollow.upsert({
      where: {
        followerBusinessId_followedBusinessId: { followerBusinessId, followedBusinessId },
      },
      create: { followerBusinessId, followedBusinessId },
      update: {},
    })
  }

  async unfollow(followerBusinessId: string, followedBusinessId: string) {
    await db.riverFollow.deleteMany({ where: { followerBusinessId, followedBusinessId } })
  }

  // Slice 4 — the profile hero's follower count, kept visually secondary per the plan doc.
  async followerCount(businessId: string): Promise<number> {
    return db.riverFollow.count({ where: { followedBusinessId: businessId } })
  }

  // Slice 4 — the profile hero's own Follow/Following state (renderCard's viewerFollowsBusiness
  // is per-post-business already; this is the same fact, needed once more directly for the hero
  // itself rather than via a post row).
  async isFollowing(followerBusinessId: string, followedBusinessId: string): Promise<boolean> {
    const row = await db.riverFollow.findUnique({
      where: { followerBusinessId_followedBusinessId: { followerBusinessId, followedBusinessId } },
    })
    return row !== null
  }
}
