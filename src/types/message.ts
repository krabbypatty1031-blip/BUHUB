import type { RatingCategory } from './rating';

export type FunctionCardType = 'partner' | 'errand' | 'secondhand' | 'rating' | 'post';

export interface ChatFunctionCard {
  type: FunctionCardType;
  id?: string;
  index?: number;
  title: string;
  posterName: string;
  postId?: string;
  ratingCategory?: RatingCategory;
}

export interface ForwardedCardDraft {
  normalizedType: FunctionCardType;
  resolvedId?: string;
  cardTitle: string;
  posterName: string;
  dedupeKey: string;
  messageDedupeKey: string | null;
  forwardedPostId?: string;
  forwardedMessage?: string;
  requiresConfirm: boolean;
  ratingCategory?: RatingCategory;
}

export type ChatReplyReference = {
  text: string;
  from: 'me' | 'them';
  fromName?: string;
  messageId?: string;
  clientKey?: string;
  type?: 'text' | 'image' | 'audio' | 'card' | 'album' | 'recalled' | 'deleted';
  title?: string;
  thumbnailUri?: string;
  durationMs?: number;
  cardType?: FunctionCardType;
};

export interface ChatMessage {
  id?: string;
  clientKey?: string;
  createdAt?: string;
  mediaGroupId?: string;
  type: 'received' | 'sent';
  text: string;
  images?: string[];
  mediaMetas?: Array<{
    uri?: string;
    width?: number;
    height?: number;
    localKey?: string;
  }>;
  audio?: {
    url: string;
    durationMs?: number;
  };
  reactions?: Array<{
    emoji: string;
    count: number;
    reactedByMe?: boolean;
  }>;
  replyTo?: ChatReplyReference;
  imageAlbum?: {
    count: number;
  };
  time: string;
  isRecalled?: boolean;
  status?: 'read' | 'delivered' | 'sent' | 'sending' | 'failed';
  functionCard?: ChatFunctionCard;
}

export interface ChatHistory {
  date: string;
  messages: ChatMessage[];
}
