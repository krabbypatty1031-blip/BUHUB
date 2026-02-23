import type { ForumPost } from '../types';

/** Get voted option index from myVote (API) or votedPolls (optimistic). */
export function getVotedOptionIndex(
  post: ForumPost,
  votedPolls: Map<string, number>
): number | undefined {
  const optId = post.myVote?.optionId;
  if (optId) {
    const idx = post.pollOptions?.findIndex((o) => o.id === optId) ?? -1;
    if (idx >= 0) return idx;
  }
  return votedPolls.get(post.id);
}
