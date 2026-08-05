import { database } from '../../../shared/database';

export interface Conversation {
  id: number;
  participant1_id: string;
  participant2_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: Date;
}

export const messagingService = {
  async getConversations(userId: string): Promise<Conversation[]> {
    return database('conversations')
      .where('participant1_id', userId)
      .orWhere('participant2_id', userId)
      .orderBy('updated_at', 'desc');
  },
  
  async getMessages(conversationId: number): Promise<Message[]> {
    return database('messages')
      .where('conversation_id', conversationId)
      .orderBy('created_at', 'asc');
  },
  
  async sendMessage(conversationId: number, senderId: string, content: string): Promise<Message> {
    const [message] = await database('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        is_read: false,
        created_at: new Date(),
      })
      .returning('*');
    
    // Update conversation timestamp
    await database('conversations')
      .where('id', conversationId)
      .update({ updated_at: new Date() });
    
    return message;
  },
  
  async startConversation(participant1Id: string, participant2Id: string): Promise<Conversation> {
    // Check if conversation exists
    const existing = await database('conversations')
      .where('participant1_id', participant1Id)
      .andWhere('participant2_id', participant2Id)
      .orWhere('participant1_id', participant2Id)
      .andWhere('participant2_id', participant1Id)
      .first();
    
    if (existing) {
      return existing;
    }
    
    const [conversation] = await database('conversations')
      .insert({
        participant1_id: participant1Id,
        participant2_id: participant2Id,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    
    return conversation;
  },
  
  async markMessagesAsRead(conversationId: number, userId: string): Promise<void> {
    await database('messages')
      .where('conversation_id', conversationId)
      .andWhere('sender_id', '!=', userId)
      .update({ is_read: true });
  },
  
  async deleteConversation(conversationId: number): Promise<void> {
    await database('messages').where('conversation_id', conversationId).delete();
    await database('conversations').where('id', conversationId).delete();
  },
};
