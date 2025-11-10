export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  productId?: string;
  text: string;
  createdAt: string;
  read: boolean;
  senderName?: string;
  senderEmail?: string;
}

export interface Conversation {
  id: string;
  productId?: string;
  productTitle?: string;
  productImage?: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  isBlocked: boolean;
  blockedByMe: boolean;
}

export interface MessageNotification {
  type: 'NEW_MESSAGE' | 'MESSAGE_READ' | 'USER_TYPING';
  conversationId: string;
  message?: Message;
  userId?: string;
}
