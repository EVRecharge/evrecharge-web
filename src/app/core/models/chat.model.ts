export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}
