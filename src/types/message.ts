export interface ChatMessage {
  type: 'received' | 'sent';
  text: string;
  time: string;
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
