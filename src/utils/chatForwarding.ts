import type {
  ChatBackTarget,
  ChatContactParams,
  ChatRouteParams,
  ForwardedChatType,
} from '../types/navigation';

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
    ...(backTo ? { backTo } : {}),
  };
}
