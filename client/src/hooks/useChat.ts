import { useState, useEffect } from 'react';
import chatService from '@/services/chat-service';

interface ChatMessage {
  _id: string;
  matchup_id: string;
  user_id: string;
  content: string;
  user_name: string;
  user_avatar?: string;
  created_at: Date;
}

export function useChat(matchupId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load initial messages
    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const initialMessages = await chatService.getMessages(matchupId);
        setMessages(initialMessages);
      } catch (err) {
        setError('Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();

    // Join the matchup room
    chatService.joinMatchup(matchupId);

    // Subscribe to new messages
    const unsubscribeMessage = chatService.onMessage((message) => {
      if (message.matchup_id === matchupId) {
        setMessages(prev => [...prev, message]);
      }
    });

    // Subscribe to errors
    const unsubscribeError = chatService.onError((err) => {
      setError(err);
    });

    // Cleanup
    return () => {
      chatService.leaveMatchup(matchupId);
      unsubscribeMessage();
      unsubscribeError();
    };
  }, [matchupId]);

  const sendMessage = async (content: string, userId: string, userName: string, userAvatar?: string) => {
    try {
      await chatService.sendMessage({
        matchup_id: matchupId,
        content,
        user_id: userId,
        user_name: userName,
        user_avatar: userAvatar,
      });
    } catch (err) {
      setError('Failed to send message');
    }
  };

  return {
    messages,
    error,
    isLoading,
    sendMessage,
  };
} 