interface FightStats {
  statistics: {
    period: string;
    groups: {
      groupName: string;
      statisticsItems: {
        name: string;
        home: string;
        away: string;
        key: string;
        homeValue: number;
        awayValue: number;
      }[];
    }[];
  }[];
}

interface FightResult {
  winType: string;
  finalRound: number;
  winnerCode: number;
}

type StatsUpdateCallback = (stats: FightStats) => void;
type ResultUpdateCallback = (result: FightResult) => void;

export class LiveStatsClient {
  private ws!: WebSocket;
  private statsListeners: Set<StatsUpdateCallback> = new Set();
  private resultListeners: Set<ResultUpdateCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // Start with 2 seconds

  constructor(private matchupId: string) {
    this.connect();
  }

  private connect() {
    const wsUrl = process.env.LIVE_STATS_WS_URL || 'localhost:3002';
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connection established');
      this.reconnectAttempts = 0;
      this.subscribe();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
      this.handleDisconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Attempting to reconnect in ${delay}ms...`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'fightStats':
        this.handleFightStats(data.stats);
        break;
      case 'fightResult':
        this.handleFightResult(data.result);
        break;
      default:
        console.warn('Unknown message type:', data.type);
    }
  }

  private handleFightStats(stats: FightStats) {
    // Notify all stats listeners
    this.statsListeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('Error in stats listener:', error);
      }
    });
  }

  private handleFightResult(result: FightResult) {
    // Notify all result listeners
    this.resultListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.error('Error in result listener:', error);
      }
    });
  }

  private subscribe() {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        matchupId: this.matchupId
      }));
    }
  }

  // Public methods for adding listeners
  onStatsUpdate(callback: StatsUpdateCallback) {
    this.statsListeners.add(callback);
    return () => this.statsListeners.delete(callback); // Return cleanup function
  }

  onFightResult(callback: ResultUpdateCallback) {
    this.resultListeners.add(callback);
    return () => this.resultListeners.delete(callback); // Return cleanup function
  }

  // Helper methods to get specific stats
  static extractStatValue(stats: FightStats, groupName: string, statKey: string) {
    const group = stats.statistics[0]?.groups.find(g => g.groupName === groupName);
    const stat = group?.statisticsItems.find(s => s.key === statKey);
    return stat ? { home: stat.homeValue, away: stat.awayValue } : null;
  }

  // Example usage:
  // const strikes = LiveStatsClient.extractStatValue(stats, 'Strikes', 'significantStrikesLanded');

  disconnect() {
    this.statsListeners.clear();
    this.resultListeners.clear();
    if (this.ws) {
      this.ws.close();
    }
  }
}