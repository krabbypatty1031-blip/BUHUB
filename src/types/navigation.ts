import { PartnerCategory } from './partner';
import { ErrandCategory } from './errand';
import { SecondhandCategory } from './secondhand';
import { RatingCategory } from './rating';

// Auth Stack
export type AuthStackParamList = {
  Language: undefined;
  Verify: undefined;
  ProfileSetup: undefined;
};

// Forum Stack
export type ForumStackParamList = {
  ForumHome: undefined;
  PostDetail: { postId: string };
  Compose: { type?: 'text' | 'image' | 'poll'; quotePostId?: string };
  Search: undefined;
  CircleDetail: { tag: string };
  UserProfile: { userName: string };
};

// Functions Stack
export type FunctionsStackParamList = {
  FunctionsHub: undefined;
  PartnerList: { category?: PartnerCategory };
  PartnerDetail: { index: number };
  ComposePartner: undefined;
  ErrandList: { category?: ErrandCategory };
  ErrandDetail: { index: number };
  ComposeErrand: undefined;
  SecondhandList: { category?: SecondhandCategory };
  SecondhandDetail: { index: number };
  ComposeSecondhand: undefined;
  RatingList: { category?: RatingCategory };
  RatingDetail: { category: RatingCategory; index: number };
  RatingForm: { category: RatingCategory; index: number };
  MyPosts: undefined;
};

// Messages Stack
export type MessagesStackParamList = {
  MessagesList: undefined;
  Chat: { contactName: string; contactAvatar: string };
  NotifyLikes: undefined;
  NotifyFollowers: undefined;
  NotifyComments: undefined;
};

// Me Stack
export type MeStackParamList = {
  MeHome: undefined;
  EditProfile: undefined;
  UserProfile: { userName: string };
  Settings: undefined;
};

// Bottom Tabs
export type MainTabParamList = {
  ForumTab: undefined;
  FunctionsTab: undefined;
  MessagesTab: undefined;
  MeTab: undefined;
};
