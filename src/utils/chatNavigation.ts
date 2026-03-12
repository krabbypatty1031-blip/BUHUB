import type { NavigationState, PartialState, Route } from '@react-navigation/native';
import type { ChatBackTarget, TabRouteName } from '../types/navigation';

type NavigationLike = {
  getParent?: () => { getState?: () => NavigationStateLike } | undefined;
  getState?: () => NavigationStateLike;
};

type NavigationStateLike = NavigationState | PartialState<NavigationState>;
type RouteStateLike = Route<string> & { state?: NavigationStateLike };

const TAB_NAMES: TabRouteName[] = ['ForumTab', 'FunctionsTab', 'MessagesTab', 'MeTab'];

function asTabName(value: unknown): TabRouteName | undefined {
  return TAB_NAMES.find((tab) => tab === value);
}

function asBackScreenName(value: unknown): ChatBackTarget['screen'] {
  return typeof value === 'string' ? (value as ChatBackTarget['screen']) : undefined;
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
  const currentRoute = stackState?.routes?.[stackState?.index ?? 0] as RouteStateLike | undefined;
  if (!currentRoute?.name) {
    return { tab } as ChatBackTarget;
  }

  const params =
    currentRoute.params && typeof currentRoute.params === 'object'
      ? (currentRoute.params as Record<string, unknown>)
      : undefined;

  return {
    tab,
    screen: asBackScreenName(currentRoute.name),
    ...(params ? { params } : {}),
  } as ChatBackTarget;
}
