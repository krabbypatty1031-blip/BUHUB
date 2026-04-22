import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from './types';

import FunctionsHubScreen from '../screens/functions/FunctionsHubScreen';
import PartnerListScreen from '../screens/functions/PartnerListScreen';
import PartnerDetailScreen from '../screens/functions/PartnerDetailScreen';
import ComposePartnerScreen from '../screens/functions/ComposePartnerScreen';
import PartnerShareScreen from '../screens/functions/PartnerShareScreen';
import ErrandListScreen from '../screens/functions/ErrandListScreen';
import ErrandDetailScreen from '../screens/functions/ErrandDetailScreen';
import ComposeErrandScreen from '../screens/functions/ComposeErrandScreen';
import ErrandShareScreen from '../screens/functions/ErrandShareScreen';
import SecondhandListScreen from '../screens/functions/SecondhandListScreen';
import SecondhandCartScreen from '../screens/functions/SecondhandCartScreen';
import SecondhandDetailScreen from '../screens/functions/SecondhandDetailScreen';
import ComposeSecondhandScreen from '../screens/functions/ComposeSecondhandScreen';
import RatingListScreen from '../screens/functions/RatingListScreen';
import RatingDetailScreen from '../screens/functions/RatingDetailScreen';
import RatingShareScreen from '../screens/functions/RatingShareScreen';
import RatingFormScreen from '../screens/functions/RatingFormScreen';
import SecondhandShareScreen from '../screens/functions/SecondhandShareScreen';
import FacilityBookingScreen from '../screens/functions/FacilityBookingScreen';
import LibraryDetailScreen from '../screens/functions/LibraryDetailScreen';
import UserProfileScreen from '../screens/me/UserProfileScreen';
import AIScheduleUploadScreen from '../screens/functions/AIScheduleUploadScreen';
import AIScheduleViewScreen from '../screens/functions/AIScheduleViewScreen';
import FeedbackListScreen from '../screens/functions/FeedbackListScreen';
import FeedbackSubmitScreen from '../screens/functions/FeedbackSubmitScreen';
import FeedbackDetailScreen from '../screens/functions/FeedbackDetailScreen';
import LockerSFSCScreen from '../screens/functions/LockerSFSCScreen';

const Stack = createNativeStackNavigator<FunctionsStackParamList>();

export default function FunctionsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: false,
      }}
    >
      <Stack.Screen name="FunctionsHub" component={FunctionsHubScreen} />
      <Stack.Screen name="PartnerList" component={PartnerListScreen} />
      <Stack.Screen name="PartnerDetail" component={PartnerDetailScreen} />
      <Stack.Screen name="ComposePartner" component={ComposePartnerScreen} />
      <Stack.Screen name="PartnerShare" component={PartnerShareScreen} />
      <Stack.Screen name="ErrandList" component={ErrandListScreen} />
      <Stack.Screen name="ErrandDetail" component={ErrandDetailScreen} />
      <Stack.Screen name="ComposeErrand" component={ComposeErrandScreen} />
      <Stack.Screen name="ErrandShare" component={ErrandShareScreen} />
      <Stack.Screen name="SecondhandList" component={SecondhandListScreen} />
      <Stack.Screen name="SecondhandCart" component={SecondhandCartScreen} />
      <Stack.Screen name="SecondhandDetail" component={SecondhandDetailScreen} />
      <Stack.Screen name="ComposeSecondhand" component={ComposeSecondhandScreen} />
      <Stack.Screen name="SecondhandShare" component={SecondhandShareScreen} />
      <Stack.Screen name="RatingList" component={RatingListScreen} />
      <Stack.Screen name="RatingDetail" component={RatingDetailScreen} />
      <Stack.Screen name="RatingShare" component={RatingShareScreen} />
      <Stack.Screen name="RatingForm" component={RatingFormScreen} />
      <Stack.Screen name="FacilityBooking" component={FacilityBookingScreen} />
      <Stack.Screen name="LibraryDetail" component={LibraryDetailScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="AIScheduleUpload" component={AIScheduleUploadScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AIScheduleView" component={AIScheduleViewScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FeedbackList" component={FeedbackListScreen} />
      <Stack.Screen name="FeedbackSubmit" component={FeedbackSubmitScreen} />
      <Stack.Screen name="FeedbackDetail" component={FeedbackDetailScreen} />
      <Stack.Screen name="LockerSFSC" component={LockerSFSCScreen} />
    </Stack.Navigator>
  );
}
