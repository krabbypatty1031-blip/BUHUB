import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import FunctionShareLayout from '../../components/common/FunctionShareLayout';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ErrandShare'>;

export default function ErrandShareScreen({ navigation, route }: Props) {
  const { taskName, posterName, functionId } = route.params;

  return (
    <FunctionShareLayout
      navigation={navigation}
      titleKey="errandShareTitle"
      descKey="errandShareDesc"
      descParams={{ taskName }}
      functionType="errand"
      functionTitle={taskName}
      posterName={posterName}
      functionId={functionId}
    />
  );
}
