import { Message, IMessage } from '../models/Message';

export class ChatService {
  async getMessages(matchupId: string, limit: number = 50, before?: Date) {
    try {
      const query = {
        matchup_id: matchupId,
        ...(before && { created_at: { $lt: before } }),
      };

      const messages = await Message.find(query)
        .sort({ created_at: 1 })
        .limit(limit)
        .lean();

      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  async createMessage(messageData: {
    matchup_id: string;
    user_id: string;
    content: string;
    user_name: string;
    user_avatar?: string;
  }): Promise<IMessage> {
    const message = new Message({
      ...messageData,
      created_at: new Date()
    });

    return await message.save();
  }

  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const result = await Message.updateOne(
      { _id: messageId, user_id: userId },
      { deleted: true, updated_at: new Date() }
    );
    return result.modifiedCount > 0;
  }

  async getRecentMatchupActivity(matchupId: string): Promise<number> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return await Message.countDocuments({
      matchup_id: matchupId,
      created_at: { $gte: fiveMinutesAgo }
    });
  }
} 