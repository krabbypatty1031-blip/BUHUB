export type FeedbackCategory = 'BUG' | 'SUGGESTION' | 'OTHER';
export type FeedbackStatus = 'PENDING' | 'REPLIED' | 'RESOLVED';

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
  admin: {
    id: string;
    nickname: string;
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
