import type { NavigatorScreenParams } from '@react-navigation/native';
import { PartnerCategory } from './partner';
import { ErrandCategory } from './errand';
import { SecondhandCategory } from './secondhand';
import { RatingCategory } from './rating';

export type TabRouteName = 'ForumTab' | 'FunctionsTab' | 'MessagesTab' | 'MeTab';

export type ChatBackTarget = {
  tab: TabRouteName;
  screen?: string;
  params?: Record<string, unknown>;
};

type BackToChatParams = {
  contactId: string;
  contactName: string;
  contactAvatar: string;
};

// Auth Stack
export type AuthStackParamList = {
  Language: undefined;
  Login: undefined;
  EmailInput: undefined;
  SetPassword: { email: string };
  InviteCode: undefined;
  ProfileSetup: { email: string };
};

// Forum Stack
export type ForumStackParamList = {
  ForumHome: undefined;
  PostDetail: { postId: string; commentId?: string; shouldReply?: boolean };
  Compose: { type?: 'text' | 'image' | 'poll'; quotePostId?: string; functionType?: string; functionTitle?: string; functionId?: string; functionIndex?: number };
  Search: undefined;
  CircleDetail: { tag: string };
  UserProfile: { userName: string };
};

// Functions Stack
export type FunctionsStackParamList = {
  FunctionsHub: undefined;
  PartnerList: { category?: PartnerCategory };
  PartnerDetail: { id: string; backToChat?: BackToChatParams };
  ComposePartner: { category?: string } | undefined;
  PartnerShare: { activityName: string; posterName: string; functionId: string };
  ErrandList: { category?: ErrandCategory };
  ErrandDetail: { id: string; backToChat?: BackToChatParams };
  ComposeErrand: { category?: ErrandCategory } | undefined;
  ErrandShare: { taskName: string; posterName: string; functionId: string };
  SecondhandList: { category?: SecondhandCategory };
  SecondhandDetail: { id: string; backToChat?: BackToChatParams };
  ComposeSecondhand: { category?: SecondhandCategory } | undefined;
  SecondhandShare: { itemName: string; posterName: string; functionId: string };
  RatingList: { category?: RatingCategory };
  RatingDetail: { category: RatingCategory; id: string };
  RatingForm: { category: RatingCategory; id: string };
  MyPosts: undefined;
  FacilityBooking: undefined;
  LibraryDetail: undefined;
};

// Messages Stack
export type MessagesStackParamList = {
  MessagesList: undefined;
  Chat: { contactId: string; contactName: string; contactAvatar: string; forwardedType?: string; forwardedTitle?: string; forwardedPosterName?: string; forwardedId?: string; forwardedIndex?: number; forwardedPostId?: string; forwardedMessage?: string; forwardedNonce?: string; backTo?: ChatBackTarget };
  NotifyLikes: undefined;
  NotifyFollowers: undefined;
  NotifyComments: undefined;
  UserProfile: { userName: string };
  PostDetail: { postId: string; commentId?: string; shouldReply?: boolean };
};

// Me Stack
export type MeStackParamList = {
  MeHome: undefined;
  EditProfile: undefined;
  ShareProfile: undefined;
  FollowList: { type: 'following' | 'followers' };
  UserProfile: { userName: string };
  PostDetail: { postId: string; commentId?: string; shouldReply?: boolean };
  Settings: undefined;
  Blocklist: undefined;
};

// Bottom Tabs
export type MainTabParamList = {
  ForumTab: NavigatorScreenParams<ForumStackParamList> | undefined;
  FunctionsTab: NavigatorScreenParams<FunctionsStackParamList> | undefined;
  MessagesTab: NavigatorScreenParams<MessagesStackParamList> | undefined;
  MeTab: NavigatorScreenParams<MeStackParamList> | undefined;
};
