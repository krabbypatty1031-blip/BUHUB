import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { ChatBackTarget, ChatContactParams } from '../types/navigation';

type FunctionDetailNavigation = NavigationProp<ParamListBase> & {
  getParent?: () => NavigationProp<ParamListBase> | undefined;
  reset: (...args: any[]) => void;
};

type HandleFunctionDetailBackParams = {
  navigation: FunctionDetailNavigation;
  backToChat?: ChatContactParams;
  backTo?: ChatBackTarget;
};

export function handleFunctionDetailBack({
  navigation,
  backToChat,
  backTo,
}: HandleFunctionDetailBackParams) {
  const parentNavigation = navigation.getParent?.();

  if (backToChat) {
    parentNavigation?.navigate('MessagesTab', {
      screen: 'Chat',
      params: backToChat,
    });
    return;
  }

  if (backTo) {
    if (backTo.tab === 'FunctionsTab' && backTo.screen) {
      // Same tab — navigate within the stack directly
      navigation.navigate(backTo.screen as any, backTo.params);
    } else {
      // Different tab — reset FunctionsTab stack, then switch tab
      navigation.reset({
        index: 0,
        routes: [{ name: 'FunctionsHub' }],
      });
      parentNavigation?.navigate(backTo.tab, {
        ...(backTo.screen ? { screen: backTo.screen } : {}),
        ...(backTo.params ? { params: backTo.params } : {}),
      });
    }
    return;
  }

  navigation.goBack();
}
