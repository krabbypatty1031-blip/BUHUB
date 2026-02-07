export interface ChatMessage {
  type: 'received' | 'sent';
  text: string;
  time: string;
  status?: 'read' | 'delivered' | 'sent';
}

export interface ChatHistory {
  date: string;
  messages: ChatMessage[];
}

export type ChatHistoryMap = Record<string, ChatHistory>;
