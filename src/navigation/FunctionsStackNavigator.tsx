import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from './types';

import FunctionsHubScreen from '../screens/functions/FunctionsHubScreen';
import PartnerListScreen from '../screens/functions/PartnerListScreen';
import PartnerDetailScreen from '../screens/functions/PartnerDetailScreen';
import ComposePartnerScreen from '../screens/functions/ComposePartnerScreen';
import ErrandListScreen from '../screens/functions/ErrandListScreen';
import ErrandDetailScreen from '../screens/functions/ErrandDetailScreen';
import ComposeErrandScreen from '../screens/functions/ComposeErrandScreen';
import SecondhandListScreen from '../screens/functions/SecondhandListScreen';
import SecondhandDetailScreen from '../screens/functions/SecondhandDetailScreen';
import ComposeSecondhandScreen from '../screens/functions/ComposeSecondhandScreen';
import RatingListScreen from '../screens/functions/RatingListScreen';
import RatingDetailScreen from '../screens/functions/RatingDetailScreen';
import RatingFormScreen from '../screens/functions/RatingFormScreen';
import MyPostsScreen from '../screens/functions/MyPostsScreen';

const Stack = createNativeStackNavigator<FunctionsStackParamList>();

export default function FunctionsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FunctionsHub" component={FunctionsHubScreen} />
      <Stack.Screen name="PartnerList" component={PartnerListScreen} />
      <Stack.Screen name="PartnerDetail" component={PartnerDetailScreen} />
      <Stack.Screen name="ComposePartner" component={ComposePartnerScreen} />
      <Stack.Screen name="ErrandList" component={ErrandListScreen} />
      <Stack.Screen name="ErrandDetail" component={ErrandDetailScreen} />
      <Stack.Screen name="ComposeErrand" component={ComposeErrandScreen} />
      <Stack.Screen name="SecondhandList" component={SecondhandListScreen} />
      <Stack.Screen name="SecondhandDetail" component={SecondhandDetailScreen} />
      <Stack.Screen name="ComposeSecondhand" component={ComposeSecondhandScreen} />
      <Stack.Screen name="RatingList" component={RatingListScreen} />
      <Stack.Screen name="RatingDetail" component={RatingDetailScreen} />
      <Stack.Screen name="RatingForm" component={RatingFormScreen} />
      <Stack.Screen name="MyPosts" component={MyPostsScreen} />
    </Stack.Navigator>
  );
}
