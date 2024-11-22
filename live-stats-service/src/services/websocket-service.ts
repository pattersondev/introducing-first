import WebSocket from 'ws';
import { Server } from 'http';

export class WebSocketService {
  private wss: WebSocket.Server;
  private matchupSubscriptions: Map<string, Set<WebSocket>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocket.Server({ server });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection established');

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.removeSubscriber(ws);
      });
    });
  }

  private handleMessage(ws: WebSocket, data: any) {
    switch (data.type) {
      case 'subscribe':
        this.addSubscriber(ws, data.matchupId);
        break;
      case 'unsubscribe':
        this.removeSubscriberFromMatchup(ws, data.matchupId);
        break;
      default:
        console.warn('Unknown message type:', data.type);
    }
  }

  private addSubscriber(ws: WebSocket, matchupId: string) {
    if (!this.matchupSubscriptions.has(matchupId)) {
      this.matchupSubscriptions.set(matchupId, new Set());
    }
    this.matchupSubscriptions.get(matchupId)?.add(ws);
    console.log(`Client subscribed to matchup ${matchupId}`);
  }

  private removeSubscriber(ws: WebSocket) {
    for (const [matchupId, subscribers] of this.matchupSubscriptions.entries()) {
      if (subscribers.has(ws)) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          this.matchupSubscriptions.delete(matchupId);
        }
      }
    }
  }

  private removeSubscriberFromMatchup(ws: WebSocket, matchupId: string) {
    const subscribers = this.matchupSubscriptions.get(matchupId);
    if (subscribers) {
      subscribers.delete(ws);
      if (subscribers.size === 0) {
        this.matchupSubscriptions.delete(matchupId);
      }
    }
  }

  broadcastFightStats(matchupId: string, stats: any) {
    const subscribers = this.matchupSubscriptions.get(matchupId);
    if (!subscribers) return;

    const message = JSON.stringify({
      type: 'fightStats',
      matchupId,
      stats
    });

    subscribers.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  broadcastFightResult(matchupId: string, result: any) {
    const subscribers = this.matchupSubscriptions.get(matchupId);
    if (!subscribers) return;

    const message = JSON.stringify({
      type: 'fightResult',
      matchupId,
      result
    });

    subscribers.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
} 