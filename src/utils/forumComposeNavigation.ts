import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { FunctionRefType } from '../types/navigation';

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
