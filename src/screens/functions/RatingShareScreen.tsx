import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import FunctionShareLayout from '../../components/common/FunctionShareLayout';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'RatingShare'>;

export default function RatingShareScreen({ navigation, route }: Props) {
  const { itemName, posterName, functionId, ratingCategory } = route.params;

  return (
    <FunctionShareLayout
      navigation={navigation}
      titleKey="ratingShareTitle"
      descKey="ratingShareDesc"
      descParams={{ itemName }}
      functionType="rating"
      functionTitle={itemName}
      posterName={posterName}
      functionId={functionId}
      ratingCategory={ratingCategory}
      allowForumShare={false}
    />
  );
}
