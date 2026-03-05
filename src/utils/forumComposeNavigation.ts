import type { NavigationProp, ParamListBase } from '@react-navigation/native';

type FunctionRefType = 'partner' | 'errand' | 'secondhand';

type NavigateToForumComposeSelectionParams = {
  navigation: NavigationProp<ParamListBase>;
  functionType: FunctionRefType;
  functionTitle: string;
  functionId: string;
};

export function navigateToForumComposeSelection({
  navigation,
  functionType,
  functionTitle,
  functionId,
}: NavigateToForumComposeSelectionParams) {
  navigation.getParent()?.navigate('ForumTab', {
    screen: 'Compose',
    params: {
      type: 'text',
      functionType,
      functionTitle,
      functionId,
    },
  });
}
