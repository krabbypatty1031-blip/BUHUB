import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import FunctionShareLayout from '../../components/common/FunctionShareLayout';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'PartnerShare'>;

export default function PartnerShareScreen({ navigation, route }: Props) {
  const { activityName, posterName, functionId } = route.params;

  return (
    <FunctionShareLayout
      navigation={navigation}
      titleKey="partnerShareTitle"
      descKey="partnerShareDesc"
      descParams={{ activityName }}
      functionType="partner"
      functionTitle={activityName}
      posterName={posterName}
      functionId={functionId}
    />
  );
}
