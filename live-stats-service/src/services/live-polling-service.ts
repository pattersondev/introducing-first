import { Pool } from 'pg';
import axios from 'axios';
import { LiveStatsService } from './live-stats-service';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { WebSocketService } from './websocket-service';

interface FightResult {
  winType: string;
  finalRound: number;
  winnerCode: number;
}

export class LivePollingService {
  private readonly baseUrl = 'https://www.sofascore.com/api/v1/event';
  private readonly userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.128 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15',
  ];

  private activeMatchups: Set<string> = new Set();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private axiosInstance;

  constructor(
    private pool: Pool,
    private liveStatsService: LiveStatsService,
    private webSocketService: WebSocketService
  ) {
    this.axiosInstance = this.createAxiosInstance();
  }

  private createAxiosInstance() {
    const proxyUsername = process.env.PROXY_USERNAME;
    const proxyPassword = process.env.PROXY_PASSWORD;
    const proxyHost = process.env.PROXY_HOST;
    const proxyPort = process.env.PROXY_PORT;

    if (!proxyUsername || !proxyPassword || !proxyHost || !proxyPort) {
      console.warn('Proxy configuration incomplete, running without proxy');
      return axios.create();
    }

    const proxyUrl = `http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
    const httpsAgent = new HttpsProxyAgent(proxyUrl);

    return axios.create({
      httpsAgent,
      proxy: false // Disable axios's default proxy handling
    });
  }

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  private async makeRequest(url: string) {
    const headers = {
      'User-Agent': this.getRandomUserAgent(),
      'Accept': 'application/json'
    };

    try {
      return await this.axiosInstance.get(url, { headers });
    } catch (error: any) {
      if (error.response?.status === 407) {
        console.error('Proxy authentication failed:', error.message);
      }
      throw error;
    }
  }

  private async checkFightStatus(matchup: any): Promise<FightResult | null> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/${matchup.live_id}`);

      if (response.status === 200 && response.data) {
        const { winType, winnerCode, finalRound } = response.data.event;
        if (winnerCode) {
          return { winType, winnerCode, finalRound };
        }
      }
      return null;
    } catch (error) {
      console.error(`Error checking fight status for matchup ${matchup.matchup_id}:`, error);
      return null;
    }
  }

  private async updateMatchupResult(matchup: any, result: FightResult) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const winnerName = result.winnerCode === 1 ? matchup.fighter1_name : matchup.fighter2_name;
      
      await client.query(`
        UPDATE matchups 
        SET 
          result = $1,
          winner = $2
        WHERE matchup_id = $3
      `, [
        `${result.winType} Round ${result.finalRound}`,
        winnerName,
        matchup.matchup_id
      ]);

      await client.query('COMMIT');
      console.log(`Updated fight result for ${matchup.fighter1_name} vs ${matchup.fighter2_name}: ${winnerName} wins by ${result.winType} in round ${result.finalRound}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async pollMatchup(matchup: any) {
    try {
      // First check if fight is over
      const fightResult = await this.checkFightStatus(matchup);
      if (fightResult) {
        console.log(`Fight ended: ${matchup.fighter1_name} vs ${matchup.fighter2_name}`);
        await this.updateMatchupResult(matchup, fightResult);
        // Broadcast fight result
        this.webSocketService.broadcastFightResult(matchup.matchup_id, fightResult);
        this.stopFrequentPolling(matchup.matchup_id);
        return;
      }

      // If fight is not over, get live stats
      const response = await this.makeRequest(`${this.baseUrl}/${matchup.live_id}/statistics`);

      if (response.status === 200 && response.data) {
        console.log(`Got live stats for ${matchup.fighter1_name} vs ${matchup.fighter2_name}`);
        await this.liveStatsService.processLiveStats(matchup.matchup_id, response.data);
        // Broadcast live stats
        this.webSocketService.broadcastFightStats(matchup.matchup_id, response.data);
        
        if (!this.activeMatchups.has(matchup.matchup_id)) {
          this.startFrequentPolling(matchup);
        }
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`No live stats yet for matchup ${matchup.matchup_id}`);
        this.stopFrequentPolling(matchup.matchup_id);
      } else {
        console.error(`Error polling stats for matchup ${matchup.matchup_id}:`, error);
      }
    }
  }

  private startFrequentPolling(matchup: any) {
    console.log(`Starting frequent polling for ${matchup.fighter1_name} vs ${matchup.fighter2_name}`);
    this.activeMatchups.add(matchup.matchup_id);
    
    // Clear any existing interval
    this.stopFrequentPolling(matchup.matchup_id);
    
    // Set new interval for every 5 seconds
    const interval = setInterval(() => {
      this.pollMatchup(matchup).catch(error => {
        console.error(`Error in frequent polling for matchup ${matchup.matchup_id}:`, error);
      });
    }, 5000);
    
    this.pollingIntervals.set(matchup.matchup_id, interval);
  }

  private stopFrequentPolling(matchupId: string) {
    const interval = this.pollingIntervals.get(matchupId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(matchupId);
      this.activeMatchups.delete(matchupId);
      console.log(`Stopped frequent polling for matchup ${matchupId}`);
    }
  }

  async pollActiveMatchups() {
    const client = await this.pool.connect();
    try {
      // Get all matchups for today's event
      const { rows: activeMatchups } = await client.query(`
        SELECT 
          m.matchup_id,
          m.live_id,
          m.fighter1_name,
          m.fighter2_name,
          e.name as event_name,
          e.main_card_time,
          e.prelims_time,
          e.early_prelims_time,
          m.start_time,
          CASE
            -- Check if any card has started
            WHEN e.early_prelims_time IS NOT NULL AND CURRENT_TIME >= e.early_prelims_time::time THEN true
            WHEN e.prelims_time IS NOT NULL AND CURRENT_TIME >= e.prelims_time::time THEN true
            WHEN e.main_card_time IS NOT NULL AND CURRENT_TIME >= e.main_card_time::time THEN true
            ELSE false
          END as event_started,
          CASE
            WHEN m.start_time IS NOT NULL AND CURRENT_TIME >= m.start_time THEN true
            ELSE false
          END as fight_started
        FROM public.matchups m
        JOIN public.events e ON m.event_id = e.event_id
        WHERE 
          m.live_id IS NOT NULL
          AND e.date = CURRENT_DATE
          AND m.result IS NULL
        ORDER BY m.start_time NULLS LAST
      `);

      // Only proceed if we have matchups and the event has started
      const eventStarted = activeMatchups.some(m => m.event_started);
      if (!eventStarted) {
        console.log(`Event ${activeMatchups[0].event_name} has not started yet`);
        return;
      }

      console.log(`Found ${activeMatchups.length} matchups to monitor`);

      for (const matchup of activeMatchups) {
        const isCurrentlyPolling = this.pollingIntervals.has(matchup.matchup_id);
        const shouldPollFrequently = matchup.fight_started;

        if (!isCurrentlyPolling) {
          // Start new polling for this matchup
          console.log(`Starting polling for ${matchup.fighter1_name} vs ${matchup.fighter2_name}`);
          this.startPollingForMatchup(matchup);
        } else if (shouldPollFrequently !== this.activeMatchups.has(matchup.matchup_id)) {
          // Update polling frequency if fight status changed
          console.log(`Updating polling frequency for ${matchup.fighter1_name} vs ${matchup.fighter2_name}`);
          this.stopFrequentPolling(matchup.matchup_id);
          this.startPollingForMatchup(matchup);
        }
      }

      // Clean up polling for finished fights
      const activeMatchupIds = new Set(activeMatchups.map(m => m.matchup_id));
      for (const matchupId of this.pollingIntervals.keys()) {
        if (!activeMatchupIds.has(matchupId)) {
          this.stopFrequentPolling(matchupId);
        }
      }
    } finally {
      client.release();
    }
  }

  private startPollingForMatchup(matchup: any) {
    // Clear any existing interval
    this.stopFrequentPolling(matchup.matchup_id);

    const pollInterval = matchup.fight_started ? 5000 : 60000; // 5 seconds if fight started, 1 minute if not
    
    if (matchup.fight_started) {
      this.activeMatchups.add(matchup.matchup_id);
    }

    const interval = setInterval(async () => {
      try {
        await this.pollMatchup(matchup);
      } catch (error) {
        console.error(`Error polling matchup ${matchup.matchup_id}:`, error);
      }
    }, pollInterval);

    this.pollingIntervals.set(matchup.matchup_id, interval);

    console.log(`Started ${matchup.fight_started ? 'frequent' : 'infrequent'} polling for ${matchup.fighter1_name} vs ${matchup.fighter2_name}`);
  }

  startPolling(intervalSeconds: number = 10) {
    console.log(`Starting live stats polling with ${intervalSeconds} second interval`);
    
    // Initial poll
    this.pollActiveMatchups().catch(error => {
      console.error('Error in initial poll:', error);
    });

    // Set up recurring poll to check for new active matchups
    setInterval(() => {
      this.pollActiveMatchups().catch(error => {
        console.error('Error polling live stats:', error);
      });
    }, intervalSeconds * 1000);
  }

  // Clean up method to clear all intervals
  cleanup() {
    for (const [matchupId] of this.pollingIntervals) {
      this.stopFrequentPolling(matchupId);
    }
  }
} 