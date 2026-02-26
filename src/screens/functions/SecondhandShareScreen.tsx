import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import FunctionShareLayout from '../../components/common/FunctionShareLayout';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'SecondhandShare'>;

export default function SecondhandShareScreen({ navigation, route }: Props) {
  const { itemName, posterName, functionId } = route.params;

  return (
    <FunctionShareLayout
      navigation={navigation}
      titleKey="secondhandShareTitle"
      descKey="secondhandShareDesc"
      descParams={{ itemName }}
      functionType="secondhand"
      functionTitle={itemName}
      posterName={posterName}
      functionId={functionId}
    />
  );
}
