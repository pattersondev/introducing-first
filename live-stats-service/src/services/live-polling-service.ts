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
      // Get matchups that should be active based on their card type and start time
      const { rows: activeMatchups } = await client.query(`
        SELECT 
          m.matchup_id,
          m.live_id,
          m.fighter1_name,
          m.fighter2_name,
          m.card_type,
          e.name as event_name,
          e.date,
          e.main_card_time,
          e.prelims_time,
          e.early_prelims_time,
          m.start_time
        FROM matchups m
        JOIN events e ON m.event_id = e.event_id
        WHERE 
          m.live_id IS NOT NULL
          AND e.date = CURRENT_DATE
          AND m.result IS NULL
          AND (
            -- Check if the card's start time has passed based on card type
            (m.card_type = 'main' AND CURRENT_TIME >= e.main_card_time::time)
            OR (m.card_type = 'prelim' AND CURRENT_TIME >= e.prelims_time::time)
            OR (m.card_type = 'early_prelim' AND CURRENT_TIME >= e.early_prelims_time::time)
            -- If specific start_time is set, use that
            OR (m.start_time IS NOT NULL AND CURRENT_TIME >= m.start_time)
          )
          -- Only include fights that started within the last 45 minutes
          -- assuming no fight lasts longer than that
          AND (
            CASE 
              WHEN m.start_time IS NOT NULL THEN 
                m.start_time >= (CURRENT_TIME - INTERVAL '45 minutes')::time
              WHEN m.card_type = 'main' THEN 
                e.main_card_time::time >= (CURRENT_TIME - INTERVAL '45 minutes')::time
              WHEN m.card_type = 'prelim' THEN 
                e.prelims_time::time >= (CURRENT_TIME - INTERVAL '45 minutes')::time
              WHEN m.card_type = 'early_prelim' THEN 
                e.early_prelims_time::time >= (CURRENT_TIME - INTERVAL '45 minutes')::time
            END
          )
        ORDER BY 
          CASE 
            WHEN m.start_time IS NOT NULL THEN m.start_time
            WHEN m.card_type = 'main' THEN e.main_card_time::time
            WHEN m.card_type = 'prelim' THEN e.prelims_time::time
            WHEN m.card_type = 'early_prelim' THEN e.early_prelims_time::time
          END ASC
      `);

      console.log(`Found ${activeMatchups.length} potentially active matchups to poll`);

      for (const matchup of activeMatchups) {
        await this.pollMatchup(matchup);
        // Only add small delay between initial checks
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Clean up any frequent polling for matchups that are no longer in the active window
      const activeMatchupIds = new Set(activeMatchups.map(m => m.matchup_id));
      for (const matchupId of this.activeMatchups) {
        if (!activeMatchupIds.has(matchupId)) {
          this.stopFrequentPolling(matchupId);
        }
      }
    } finally {
      client.release();
    }
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