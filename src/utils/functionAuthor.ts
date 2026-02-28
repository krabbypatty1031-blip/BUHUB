import type { User } from '../types';

function normalizeValue(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function isCurrentUserFunctionAuthor(
  currentUser: User | null,
  authorId?: string | null,
  authorName?: string | null
): boolean {
  if (!currentUser) return false;

  if (authorId && currentUser.id) {
    return authorId === currentUser.id;
  }

  const currentName = normalizeValue(currentUser.name);
  const currentNickname = normalizeValue(currentUser.nickname);
  const publisherName = normalizeValue(authorName);

  return publisherName.length > 0 && (publisherName === currentName || publisherName === currentNickname);
}
