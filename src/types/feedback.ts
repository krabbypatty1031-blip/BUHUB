export type FeedbackCategory = 'BUG' | 'SUGGESTION' | 'OTHER';
export type FeedbackStatus = 'UNRESOLVED' | 'RESOLVED' | 'CLOSED';

export interface Feedback {
  id: string;
  category: FeedbackCategory;
  description: string;
  status: FeedbackStatus;
  createdAt: string;
}

export interface FeedbackReply {
  id: string;
  content: string;
  createdAt: string;
  isAdmin: boolean;
  user: {
    id: string;
    nickname: string;
    avatar?: string;
  };
}

export interface FeedbackDetail {
  id: string;
  category: FeedbackCategory;
  description: string;
  imageUrls: string[];
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  replies: FeedbackReply[];
}
