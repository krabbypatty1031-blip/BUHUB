import type { ChatBackTarget, TabRouteName } from '../types/navigation';

type NavigationLike = {
  getParent?: () => { getState?: () => any } | undefined;
  getState?: () => any;
};

const TAB_NAMES: TabRouteName[] = ['ForumTab', 'FunctionsTab', 'MessagesTab', 'MeTab'];

function asTabName(value: unknown): TabRouteName | undefined {
  return TAB_NAMES.find((tab) => tab === value);
}

export function buildChatBackTarget(
  navigation: NavigationLike,
  fallbackTab?: TabRouteName
): ChatBackTarget | undefined {
  const parentState = navigation.getParent?.()?.getState?.();
  const activeTab = asTabName(parentState?.routes?.[parentState?.index ?? 0]?.name);
  const tab = activeTab ?? fallbackTab;
  if (!tab) return undefined;

  const stackState = navigation.getState?.();
  const currentRoute = stackState?.routes?.[stackState?.index ?? 0];
  if (!currentRoute?.name) {
    return { tab };
  }

  const params =
    currentRoute.params && typeof currentRoute.params === 'object'
      ? (currentRoute.params as Record<string, unknown>)
      : undefined;

  return {
    tab,
    screen: String(currentRoute.name),
    ...(params ? { params } : {}),
  };
}
