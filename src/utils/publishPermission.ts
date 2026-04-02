import type { User } from '../types';

export const LIFE_HKBU_EMAIL_DOMAIN = '@life.hkbu.edu.hk';

/** Backend uses HKBU_EMAIL_REQUIRED; legacy code may still reference FOR_PUBLISH. */
export function isHkbuCommunityPermissionError(code: unknown): boolean {
  return code === 'HKBU_EMAIL_REQUIRED' || code === 'HKBU_EMAIL_REQUIRED_FOR_PUBLISH';
}

type PublishPermissionErrorLike = {
  errorCode?: string | null;
  code?: string | number | null;
};

export function isLifeHkbuEmail(email?: string | null): boolean {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return false;
  return normalizedEmail.endsWith(LIFE_HKBU_EMAIL_DOMAIN);
}

function isPrivilegedRole(role?: string | null): boolean {
  return role === 'ADMIN' || role === 'MODERATOR';
}

export function canPublishCommunityContent(user?: User | null): boolean {
  return Boolean(
    isPrivilegedRole(user?.role) ||
      user?.isHKBUVerified ||
      isLifeHkbuEmail(user?.hkbuEmail) ||
      isLifeHkbuEmail(user?.email)
  );
}

export function isPublishPermissionError(error?: PublishPermissionErrorLike | null): boolean {
  const code = error?.errorCode ?? error?.code;
  return isHkbuCommunityPermissionError(code);
}
