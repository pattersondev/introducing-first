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

  async getActiveMatchups() {
    const client = await this.pool.connect();
    try {
      // Get current time in EST
      const estTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
      console.log('Checking for active matchups at EST:', estTime);

      // Get all potential matchups
      const { rows: allMatchups } = await client.query(`
        SELECT 
          m.matchup_id,
          m.fighter1_name,
          m.fighter2_name,
          m.live_id,
          e.date as event_date,
          e.name as event_name,
          m.result
        FROM matchups m
        JOIN events e ON m.event_id = e.event_id
      `);

      console.log('All matchups in database:', allMatchups.length);

      // Get matchups with live_ids
      const { rows: matchups } = await client.query(`
        SELECT 
          m.matchup_id,
          m.fighter1_name,
          m.fighter2_name,
          m.live_id,
          e.date as event_date,
          e.name as event_name,
          m.result
        FROM matchups m
        JOIN events e ON m.event_id = e.event_id
        WHERE 
          m.live_id IS NOT NULL
          AND m.result IS NULL  -- Fight hasn't finished yet
        ORDER BY e.date ASC
      `);

      console.log('Found potential matchups:', matchups.map(m => ({
        fighters: `${m.fighter1_name} vs ${m.fighter2_name}`,
        event_date: m.event_date,
        raw_date: new Date(m.event_date),
        live_id: m.live_id,
        result: m.result
      })));

      // Convert current time to EST for comparison
      const now = new Date();
      const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const estDate = estNow.toISOString().split('T')[0];
      
      console.log('Current time info:', {
        utc: now.toISOString(),
        est: estNow.toISOString(),
        estDate
      });

      // Filter matchups based on date in EST
      const activeMatchups = matchups.filter(matchup => {
        // Log raw date info
        console.log('\nProcessing matchup:', matchup.fighter1_name, 'vs', matchup.fighter2_name);
        console.log('Raw event_date:', matchup.event_date);
        
        const rawMatchupDate = new Date(matchup.event_date);
        console.log('Parsed event_date:', rawMatchupDate.toISOString());
        
        const matchupDateInEst = new Date(rawMatchupDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        console.log('Event date in EST:', matchupDateInEst.toISOString());
        
        const matchupDate = matchupDateInEst.toLocaleString('en-US', { timeZone: 'America/New_York' }).split(',')[0];
        console.log('Formatted matchup date:', matchupDate);
        
        const [month, day, year] = matchupDate.split('/');
        const formattedMatchupDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        // Get tomorrow's date in EST
        const tomorrow = new Date(estNow);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().split('T')[0];
        
        console.log('Date comparison:', {
          matchupDate: formattedMatchupDate,
          today: estDate,
          tomorrow: tomorrowDate,
          isToday: formattedMatchupDate === estDate,
          isTomorrow: formattedMatchupDate === tomorrowDate
        });
        
        return formattedMatchupDate === estDate || formattedMatchupDate === tomorrowDate;
      });

      if (activeMatchups.length > 0) {
        console.log('\nFound active matchups:', activeMatchups.map(m => ({
          fighters: `${m.fighter1_name} vs ${m.fighter2_name}`,
          event: m.event_name,
          date: m.event_date,
          live_id: m.live_id,
          result: m.result
        })));
      } else {
        console.log(`\nNo active events found. Current EST time: ${estTime}`);
      }

      return activeMatchups;
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

  async pollActiveMatchups() {
    try {
      const activeMatchups = await this.getActiveMatchups();

      // Only proceed if we have matchups
      if (activeMatchups.length === 0) {
        return;
      }

      console.log(`Found ${activeMatchups.length} matchups to monitor`);

      for (const matchup of activeMatchups) {
        const isCurrentlyPolling = this.pollingIntervals.has(matchup.matchup_id);

        if (!isCurrentlyPolling) {
          // Start new polling for this matchup
          console.log(`Starting polling for ${matchup.fighter1_name} vs ${matchup.fighter2_name}`);
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
    } catch (error) {
      console.error('Error in pollActiveMatchups:', error);
      throw error;
    }
  }

  startPolling(intervalSeconds: number = 10) {
    console.log(`Starting live stats polling with ${intervalSeconds} second interval`);
    
    // Initial poll
    this.pollActiveMatchups().catch((error: Error) => {
      console.error('Error in initial poll:', error);
    });

    // Set up recurring poll to check for new active matchups
    setInterval(() => {
      this.pollActiveMatchups().catch((error: Error) => {
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