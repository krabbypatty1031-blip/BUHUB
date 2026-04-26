type T = (key: string) => string;

interface FollowState {
  isFollowedByMe?: boolean;
  isMutuallyFollowing?: boolean;
}

export function getFollowLabel(state: FollowState, t: T): string {
  if (state.isMutuallyFollowing) return t('mutuallyFollowing');
  if (state.isFollowedByMe) return t('alreadyFollowed');
  return t('follow');
}
