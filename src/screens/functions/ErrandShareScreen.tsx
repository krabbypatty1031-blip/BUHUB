import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { PackageIcon } from '../../components/common/icons';
import FunctionShareLayout from '../../components/common/FunctionShareLayout';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ErrandShare'>;

export default function ErrandShareScreen({ navigation, route }: Props) {
  const { taskName, posterName, index } = route.params;

  return (
    <FunctionShareLayout
      navigation={navigation}
      icon={<PackageIcon size={40} color={colors.primary} />}
      titleKey="errandShareTitle"
      descKey="errandShareDesc"
      descParams={{ taskName }}
      functionType="errand"
      functionTitle={taskName}
      posterName={posterName}
      index={index}
    />
  );
}
