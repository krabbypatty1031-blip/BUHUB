import type { NavigationProp, NavigatorScreenParams, ParamListBase } from '@react-navigation/native';
import type { PartnerCategory, PartnerPost } from './partner';
import type { ErrandCategory, Errand } from './errand';
import type { SecondhandCategory, SecondhandItem } from './secondhand';
import type { RatingCategory } from './rating';
import type { FunctionCardType } from './message';

export type TabRouteName = 'ForumTab' | 'FunctionsTab' | 'MessagesTab' | 'MeTab';
export type FunctionRefType = Exclude<FunctionCardType, 'post'>;
export type ForwardedChatType = FunctionCardType;
export type UserProfileParams = {
  userName: string;
  cachedAvatar?: string | null;
  cachedNickname?: string | null;
  cachedGender?: string | null;
};
export type PostDetailParams = {
  postId: string;
  commentId?: string;
  shouldReply?: boolean;
};
export type ChatContactParams = {
  contactId: string;
  contactName: string;
  contactAvatar: string;
};
export type ForumComposeParams = {
  type?: 'text' | 'image' | 'poll';
  quotePostId?: string;
  functionType?: FunctionRefType;
  functionTitle?: string;
  functionId?: string;
  functionIndex?: number;
  ratingCategory?: RatingCategory;
};

type TabBackTarget<TTab extends TabRouteName, TScreen extends string> =
  | {
      tab: TTab;
      screen?: undefined;
      params?: undefined;
    }
  | {
      tab: TTab;
      screen: TScreen;
      params?: Record<string, unknown>;
    };

export type ChatBackTarget = TabBackTarget<'ForumTab', keyof ForumStackParamList & string>
  | TabBackTarget<'FunctionsTab', keyof FunctionsStackParamList & string>
  | TabBackTarget<'MessagesTab', Exclude<keyof MessagesStackParamList, 'Chat'> & string>
  | TabBackTarget<'MeTab', keyof MeStackParamList & string>;

export type PendingComposeSelection = {
  quotePostId?: string;
  functionType?: FunctionRefType;
  functionTitle?: string;
  functionId?: string;
  ratingCategory?: RatingCategory;
};

export type ChatForwardParams = {
  forwardedType: ForwardedChatType;
  forwardedPosterName: string;
  forwardedTitle?: string;
  forwardedId?: string;
  forwardedIndex?: number;
  forwardedPostId?: string;
  forwardedMessage?: string;
  forwardedNonce?: string;
  forwardedRequiresConfirm?: boolean;
  forwardedRatingCategory?: RatingCategory;
};

export type ChatRouteParams = ChatContactParams &
  {
    backTo?: ChatBackTarget;
  } &
  (
    | {
        forwardedType?: undefined;
        forwardedPosterName?: undefined;
        forwardedTitle?: undefined;
        forwardedId?: undefined;
        forwardedIndex?: undefined;
        forwardedPostId?: undefined;
        forwardedMessage?: undefined;
        forwardedNonce?: undefined;
        forwardedRequiresConfirm?: undefined;
        forwardedRatingCategory?: undefined;
      }
    | ChatForwardParams
  );

type ComposeDraftParams<TCategory, TInitialData> = {
  category?: TCategory;
  editId?: string;
  initialData?: TInitialData;
};

export type ComposePartnerParams = ComposeDraftParams<PartnerCategory, PartnerPost>;

export type ComposeErrandParams = ComposeDraftParams<ErrandCategory, Errand>;

export type ComposeSecondhandParams = ComposeDraftParams<SecondhandCategory, SecondhandItem>;

type FunctionDetailParams = {
  id: string;
  backToChat?: ChatContactParams;
  backTo?: ChatBackTarget;
};

type FunctionShareParams = {
  posterName: string;
  functionId: string;
  ratingCategory?: RatingCategory;
};

type PartnerShareParams = FunctionShareParams & {
  activityName: string;
};

type ErrandShareParams = FunctionShareParams & {
  taskName: string;
};

type SecondhandShareParams = FunctionShareParams & {
  itemName: string;
};

type RatingShareParams = FunctionShareParams & {
  itemName: string;
  ratingCategory: RatingCategory;
};

type PartnerDetailParams = FunctionDetailParams;

type ErrandDetailParams = FunctionDetailParams;

type SecondhandDetailParams = FunctionDetailParams;

// Auth Stack
export type AuthStackParamList = {
  Language: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  EmailInput: undefined;
  SetPassword: { email: string; registrationToken?: string; agreedToTerms?: boolean };
  ProfileSetup: { email: string };
};

// Forum Stack
export type ForumStackParamList = {
  ForumHome: { pendingComposeSelection?: PendingComposeSelection } | undefined;
  PostDetail: PostDetailParams;
  Compose: ForumComposeParams;
  Search: undefined;
  CircleDetail: { tag: string; cachedFollowed?: boolean; cachedFollowerCount?: number; cachedUsageCount?: number };
  UserProfile: UserProfileParams;
};

// Functions Stack
export type FunctionsStackParamList = {
  FunctionsHub: undefined;
  PartnerList: { category?: PartnerCategory };
  PartnerDetail: PartnerDetailParams;
  ComposePartner: ComposePartnerParams | undefined;
  PartnerShare: PartnerShareParams;
  ErrandList: { category?: ErrandCategory };
  ErrandDetail: ErrandDetailParams;
  ComposeErrand: ComposeErrandParams | undefined;
  ErrandShare: ErrandShareParams;
  SecondhandList: { category?: SecondhandCategory };
  SecondhandCart: undefined;
  SecondhandDetail: SecondhandDetailParams;
  ComposeSecondhand: ComposeSecondhandParams | undefined;
  SecondhandShare: SecondhandShareParams;
  RatingList: undefined;
  RatingDetail: { category?: RatingCategory; id: string; backToChat?: ChatContactParams; backTo?: ChatBackTarget };
  RatingShare: RatingShareParams;
  RatingForm: { category: RatingCategory; id: string };
  FacilityBooking: undefined;
  LibraryDetail: undefined;
  UserProfile: UserProfileParams;
  AIScheduleUpload: undefined;
  AIScheduleView: { dayDetectionWarning?: boolean } | undefined;
  FeedbackList: undefined;
  FeedbackSubmit: undefined;
  FeedbackDetail: { id: string };
  LockerSFSC: undefined;
};

// Messages Stack
export type MessagesStackParamList = {
  MessagesList: undefined;
  Chat: ChatRouteParams;
  NotifyLikes: undefined;
  NotifyFollowers: undefined;
  NotifyComments: undefined;
  UserProfile: UserProfileParams;
  PostDetail: PostDetailParams;
};

// Me Stack
export type MeStackParamList = {
  MeHome: undefined;
  EditProfile: undefined;
  ShareProfile: undefined;
  ScanQR: undefined;
  FollowList: { type: 'following' | 'followers' };
  ForumList: undefined;
  CircleDetail: { tag: string; cachedFollowed?: boolean; cachedFollowerCount?: number; cachedUsageCount?: number };
  UserProfile: UserProfileParams;
  PostDetail: PostDetailParams;
  Settings: undefined;
  ManageEmails: undefined;
  Blocklist: undefined;
};

// Bottom Tabs
export type MainTabParamList = {
  ForumTab: NavigatorScreenParams<ForumStackParamList> | undefined;
  FunctionsTab: NavigatorScreenParams<FunctionsStackParamList> | undefined;
  MessagesTab: NavigatorScreenParams<MessagesStackParamList> | undefined;
  MeTab: NavigatorScreenParams<MeStackParamList> | undefined;
};

export type ChatForwardNavigation = Pick<
  NavigationProp<ParamListBase>,
  'dispatch' | 'getParent' | 'getState'
>;

export type FunctionShareNavigation = NavigationProp<ParamListBase> & {
  popToTop: () => void;
};
