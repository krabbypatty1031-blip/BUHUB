import type {
  ChatBackTarget,
  ChatContactParams,
  ChatRouteParams,
  ForwardedChatType,
} from '../types/navigation';
import type { RatingCategory } from '../types';

type BuildChatForwardParamsInput = ChatContactParams & {
  forwardedType: ForwardedChatType;
  forwardedPosterName: string;
  forwardedTitle?: string;
  forwardedId?: string;
  forwardedIndex?: number;
  forwardedPostId?: string;
  forwardedMessage?: string;
  forwardedNonce: string;
  forwardedRequiresConfirm: boolean;
  backTo?: ChatBackTarget;
  forwardedRatingCategory?: RatingCategory;
};

export function buildChatForwardParams({
  contactId,
  contactName,
  contactAvatar,
  forwardedType,
  forwardedPosterName,
  forwardedTitle,
  forwardedId,
  forwardedIndex,
  forwardedPostId,
  forwardedMessage,
  forwardedNonce,
  forwardedRequiresConfirm,
  backTo,
  forwardedRatingCategory,
}: BuildChatForwardParamsInput): ChatRouteParams {
  return {
    contactId,
    contactName,
    contactAvatar,
    forwardedType,
    forwardedPosterName,
    forwardedTitle,
    forwardedId,
    forwardedIndex,
    forwardedPostId,
    forwardedMessage,
    forwardedNonce,
    forwardedRequiresConfirm,
    forwardedRatingCategory,
    ...(backTo ? { backTo } : {}),
  };
}
