import type { NavigatorScreenParams } from '@react-navigation/native';
import { PartnerCategory } from './partner';
import { ErrandCategory } from './errand';
import { SecondhandCategory } from './secondhand';
import { RatingCategory } from './rating';

// Auth Stack
export type AuthStackParamList = {
  Language: undefined;
  EmailInput: undefined;
  VerifyCode: { email: string };
  ProfileSetup: undefined;
};

// Forum Stack
export type ForumStackParamList = {
  ForumHome: undefined;
  PostDetail: { postId: string; commentId?: string };
  Compose: { type?: 'text' | 'image' | 'poll'; quotePostId?: string; functionType?: string; functionTitle?: string; functionIndex?: number };
  Search: undefined;
  CircleDetail: { tag: string };
  UserProfile: { userName: string };
};

// Functions Stack
export type FunctionsStackParamList = {
  FunctionsHub: undefined;
  PartnerList: { category?: PartnerCategory };
  PartnerDetail: { index: number };
  ComposePartner: { category?: string } | undefined;
  PartnerShare: { activityName: string; posterName: string; index: number };
  ErrandList: { category?: ErrandCategory };
  ErrandDetail: { index: number };
  ComposeErrand: { category?: ErrandCategory } | undefined;
  ErrandShare: { taskName: string; posterName: string; index: number };
  SecondhandList: { category?: SecondhandCategory };
  SecondhandDetail: { index: number };
  ComposeSecondhand: { category?: SecondhandCategory } | undefined;
  SecondhandShare: { itemName: string; posterName: string; index: number };
  RatingList: { category?: RatingCategory };
  RatingDetail: { category: RatingCategory; index: number };
  RatingForm: { category: RatingCategory; index: number };
  RatingShare: { category: RatingCategory; itemName: string };
  MyPosts: undefined;
  FacilityBooking: undefined;
  LibraryDetail: undefined;
};

// Messages Stack
export type MessagesStackParamList = {
  MessagesList: undefined;
  Chat: { contactName: string; contactAvatar: string; forwardedType?: string; forwardedTitle?: string; forwardedPosterName?: string; forwardedIndex?: number; forwardedPostId?: string; forwardedMessage?: string };
  NotifyLikes: undefined;
  NotifyFollowers: undefined;
  NotifyComments: undefined;
  UserProfile: { userName: string };
  PostDetail: { postId: string; commentId?: string };
};

// Me Stack
export type MeStackParamList = {
  MeHome: undefined;
  EditProfile: undefined;
  ShareProfile: undefined;
  FollowList: { type: 'following' | 'followers' };
  UserProfile: { userName: string };
  PostDetail: { postId: string; commentId?: string };
  Settings: undefined;
};

// Bottom Tabs
export type MainTabParamList = {
  ForumTab: NavigatorScreenParams<ForumStackParamList> | undefined;
  FunctionsTab: NavigatorScreenParams<FunctionsStackParamList> | undefined;
  MessagesTab: NavigatorScreenParams<MessagesStackParamList> | undefined;
  MeTab: NavigatorScreenParams<MeStackParamList> | undefined;
};
