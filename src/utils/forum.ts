import type { ForumPost } from '../types';

/** Get voted option index from myVote (API) or votedPolls (optimistic). */
export function getVotedOptionIndex(
  post: ForumPost,
  votedPolls: Record<string, number>
): number | undefined {
  // Prefer myVote from API/cache
  const optId = post.myVote?.optionId;
  if (optId) {
    const idx = post.pollOptions?.findIndex((o) => o.id === optId) ?? -1;
    if (idx >= 0) return idx;
  }
  // Fallback to votedPolls store (optimistic update before cache sync)
  const storeIndex = votedPolls[post.id];
  return typeof storeIndex === 'number' ? storeIndex : undefined;
}
