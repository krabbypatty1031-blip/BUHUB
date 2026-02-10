import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { UsersIcon } from '../../components/common/icons';
import FunctionShareLayout from '../../components/common/FunctionShareLayout';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'PartnerShare'>;

export default function PartnerShareScreen({ navigation, route }: Props) {
  const { activityName, posterName, index } = route.params;

  return (
    <FunctionShareLayout
      navigation={navigation}
      icon={<UsersIcon size={40} color={colors.primary} />}
      titleKey="partnerShareTitle"
      descKey="partnerShareDesc"
      descParams={{ activityName }}
      functionType="partner"
      functionTitle={activityName}
      posterName={posterName}
      index={index}
    />
  );
}
