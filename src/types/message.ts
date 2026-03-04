export interface ChatMessage {
  id?: string;
  createdAt?: string;
  type: 'received' | 'sent';
  text: string;
  images?: string[];
  audio?: {
    url: string;
    durationMs?: number;
  };
  reactions?: Array<{
    emoji: string;
    count: number;
    reactedByMe?: boolean;
  }>;
  replyTo?: {
    text: string;
    from: 'me' | 'them';
  };
  imageAlbum?: {
    count: number;
  };
  time: string;
  isRecalled?: boolean;
  status?: 'read' | 'delivered' | 'sent';
  functionCard?: {
    type: 'partner' | 'errand' | 'secondhand' | 'post';
    id?: string;
    index?: number;
    title: string;
    posterName: string;
    postId?: string;
  };
}

export interface ChatHistory {
  date: string;
  messages: ChatMessage[];
}
