import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { FunctionRefType } from '../types/navigation';
import type { RatingCategory } from '../types';

type NavigateToForumComposeSelectionParams = {
  navigation: NavigationProp<ParamListBase>;
  functionType: FunctionRefType;
  functionTitle: string;
  functionId: string;
  ratingCategory?: RatingCategory;
};

export function navigateToForumComposeSelection({
  navigation,
  functionType,
  functionTitle,
  functionId,
  ratingCategory,
}: NavigateToForumComposeSelectionParams) {
  navigation.getParent()?.navigate('ForumTab', {
    screen: 'Compose',
    params: {
      type: 'text',
      functionType,
      functionTitle,
      functionId,
      ratingCategory,
    },
  });
}
