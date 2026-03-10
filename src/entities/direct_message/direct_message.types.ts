export interface DirectMessage {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderUsername: string | null;
  senderDisplayName: string | null;
  senderAvatarUrl: string | null;
  receiverUsername: string | null;
  receiverDisplayName: string | null;
  receiverAvatarUrl: string | null;
  isMine: boolean;
}

export interface ConversationSummary {
  partnerUsername: string;
  partnerDisplayName: string | null;
  partnerAvatarUrl: string | null;
  lastMessageId: string;
  lastMessageContent: string;
  lastMessageCreatedAt: string;
  lastMessageIsRead: boolean;
  lastMessageSenderUsername: string | null;
  unreadCount: number;
}
