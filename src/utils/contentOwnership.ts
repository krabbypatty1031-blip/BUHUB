import type { User } from '../types';

function normalizeValue(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

export function isCurrentUserContentOwner(
  currentUser: User | null,
  options: {
    isOwnedByCurrentUser?: boolean;
    authorId?: string | null;
    userName?: string | null;
    displayName?: string | null;
    isAnonymous?: boolean;
  }
): boolean {
  if (!currentUser) return false;

  const { isOwnedByCurrentUser, authorId, userName, displayName, isAnonymous } = options;

  if (typeof isOwnedByCurrentUser === 'boolean') {
    return isOwnedByCurrentUser;
  }

  if (authorId && currentUser.id) {
    return authorId === currentUser.id;
  }

  const currentUserName = normalizeValue((currentUser as User & { userName?: string })?.userName);
  const targetUserName = normalizeValue(userName);
  if (currentUserName && targetUserName && currentUserName === targetUserName) {
    return true;
  }

  if (isAnonymous) {
    return false;
  }

  const currentName = normalizeValue(currentUser.name);
  const currentNickname = normalizeValue(currentUser.nickname);
  const targetDisplayName = normalizeValue(displayName);

  return Boolean(
    targetDisplayName &&
      (targetDisplayName === currentName || targetDisplayName === currentNickname)
  );
}
