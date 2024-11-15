import { io, Socket } from "socket.io-client";

interface ChatMessage {
  _id: string;
  matchup_id: string;
  user_id: string;
  content: string;
  user_name: string;
  user_avatar?: string;
  created_at: Date;
}

class ChatService {
  private socket: Socket | null = null;
  private messageHandlers: ((message: ChatMessage) => void)[] = [];
  private errorHandlers: ((error: string) => void)[] = [];

  constructor() {
    this.connect();
  }

  private connect() {
    this.socket = io(process.env.NEXT_PUBLIC_CHAT_SERVICE_URL || 'http://localhost:4000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to chat service');
    });

    this.socket.on('new-message', (message: ChatMessage) => {
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.socket.on('error', (error: string) => {
      this.errorHandlers.forEach(handler => handler(error));
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat service');
    });
  }

  public joinMatchup(matchupId: string) {
    if (this.socket) {
      this.socket.emit('join-matchup', matchupId);
    }
  }

  public leaveMatchup(matchupId: string) {
    if (this.socket) {
      this.socket.emit('leave-matchup', matchupId);
    }
  }

  public async sendMessage(data: {
    matchup_id: string;
    content: string;
    user_id: string;
    user_name: string;
    user_avatar?: string;
  }) {
    if (!this.socket) {
      throw new Error('Not connected to chat service');
    }

    this.socket.emit('send-message', data);
  }

  public async getMessages(matchupId: string, before?: Date): Promise<ChatMessage[]> {
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_CHAT_SERVICE_URL || 'http://localhost:4000'}/api/messages/${matchupId}`);
      if (before) {
        url.searchParams.append('before', before.toISOString());
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  public onMessage(handler: (message: ChatMessage) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  public onError(handler: (error: string) => void) {
    this.errorHandlers.push(handler);
    return () => {
      this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
    };
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Create a singleton instance
const chatService = new ChatService();
export default chatService; 