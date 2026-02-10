import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { ShoppingBagIcon } from '../../components/common/icons';
import FunctionShareLayout from '../../components/common/FunctionShareLayout';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'SecondhandShare'>;

export default function SecondhandShareScreen({ navigation, route }: Props) {
  const { itemName, posterName, index } = route.params;

  return (
    <FunctionShareLayout
      navigation={navigation}
      icon={<ShoppingBagIcon size={40} color={colors.primary} />}
      titleKey="secondhandShareTitle"
      descKey="secondhandShareDesc"
      descParams={{ itemName }}
      functionType="secondhand"
      functionTitle={itemName}
      posterName={posterName}
      index={index}
    />
  );
}
