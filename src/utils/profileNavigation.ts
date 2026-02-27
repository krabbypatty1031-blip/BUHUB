import { CommonActions } from '@react-navigation/native';
import type { User } from '../types';
import { showTabBar } from '../hooks/TabBarAnimationContext';

type NavigationLike = {
  dispatch?: (action: any) => void;
  navigate: (...args: any[]) => void;
};

type AvatarNavigationParams = {
  navigation: NavigationLike;
  currentUser: User | null | undefined;
  userName?: string | null;
  displayName?: string | null;
  isAnonymous?: boolean;
};

function normalizeHandle(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

function getCurrentUserHandles(currentUser: User | null | undefined): Set<string> {
  const handles = new Set<string>();
  const currentUserName = normalizeHandle((currentUser as (User & { userName?: string }) | null | undefined)?.userName);
  const currentName = normalizeHandle(currentUser?.name);
  const currentNickname = normalizeHandle(currentUser?.nickname);
  if (currentUserName) handles.add(currentUserName);
  if (currentName) handles.add(currentName);
  if (currentNickname) handles.add(currentNickname);
  return handles;
}

export function handleAvatarPressNavigation({
  navigation,
  currentUser,
  userName,
  displayName,
  isAnonymous = false,
}: AvatarNavigationParams): void {
  if (isAnonymous) return;
  showTabBar();

  const handles = getCurrentUserHandles(currentUser);
  const targetUserName = normalizeHandle(userName);
  const targetDisplayName = normalizeHandle(displayName);
  const isSelf = Boolean(
    handles.size > 0
      && (
        (targetUserName && handles.has(targetUserName))
        || (targetDisplayName && handles.has(targetDisplayName))
      )
  );

  if (isSelf) {
    navigation.dispatch?.(CommonActions.navigate({ name: 'MeTab' }));
    return;
  }

  const profileUserName = (userName ?? '').trim() || (displayName ?? '').trim();
  if (!profileUserName) return;
  navigation.navigate('UserProfile', { userName: profileUserName });
}
