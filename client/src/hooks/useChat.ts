import { useState, useEffect, useCallback } from 'react';
import chatService from '@/services/chat-service';

export function useChat(matchupId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (rateLimitSeconds > 0) {
      timer = setInterval(() => {
        setRateLimitSeconds(prev => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            setRateLimitError(null);
            return 0;
          }
          return newValue;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [rateLimitSeconds]);

  useEffect(() => {
    if (!matchupId) return;

    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const fetchedMessages = await chatService.getMessages(matchupId);
        setMessages(fetchedMessages);
        setError(null);
      } catch (err) {
        setError('Failed to load messages');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();

    const handleNewMessage = (message: any) => {
      setMessages(prev => [...prev, message]);
    };

    const handleError = (errorMessage: string) => {
      if (errorMessage.includes('rate limit')) {
        const secondsMatch = errorMessage.match(/wait (\d+) seconds/);
        if (secondsMatch && secondsMatch[1]) {
          const seconds = parseInt(secondsMatch[1], 10);
          setRateLimitSeconds(seconds);
          setRateLimitError(`Message rate limit reached. Please wait ${seconds} seconds before sending another message.`);
        } else {
          setRateLimitError(errorMessage);
        }
      } else {
        setError(errorMessage);
      }
    };

    chatService.joinMatchup(matchupId);
    chatService.onMessage(handleNewMessage);
    chatService.onError(handleError);

    return () => {
      chatService.leaveMatchup(matchupId);
    };
  }, [matchupId]);

  const sendMessage = useCallback(async (
    content: string,
    userId: string,
    userName: string,
    userAvatar?: string
  ) => {
    try {
      await chatService.sendMessage({
        matchup_id: matchupId,
        content,
        user_id: userId,
        user_name: userName,
        user_avatar: userAvatar
      });
      setRateLimitError(null);
      setRateLimitSeconds(0);
    } catch (error) {
      throw error;
    }
  }, [matchupId]);

  return {
    messages,
    error,
    rateLimitError,
    rateLimitSeconds,
    isLoading,
    sendMessage
  };
} 