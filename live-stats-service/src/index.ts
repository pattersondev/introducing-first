import express from 'express';
import { Pool } from 'pg';
import { createTablesQuery } from './database/schema';
import { SyncService } from './services/sync-service';
import { LiveStatsService } from './services/live-stats-service';
import { LivePollingService } from './services/live-polling-service';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketService } from './services/websocket-service';

dotenv.config();

const app = express();
app.use(express.json());

// Database pools with SSL configuration
const liveStatsPool = new Pool({
  connectionString: process.env.LIVE_STATS_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const scraperServicePool = new Pool({
  connectionString: process.env.SCRAPER_SERVICE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize services
const syncService = new SyncService(scraperServicePool, liveStatsPool);
const liveStatsService = new LiveStatsService(liveStatsPool);

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);

// Initialize LivePollingService
const livePollingService = new LivePollingService(
  liveStatsPool, 
  liveStatsService,
  webSocketService
);

// Initialize database
async function initializeDatabase() {
  const client = await liveStatsPool.connect();
  try {
    await client.query(createTablesQuery);
    console.log('Database tables initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Setup cron jobs
function setupCronJobs() {
  // Sync matchups every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await syncService.syncMatchups();
      await syncService.syncEvents();
    } catch (error) {
      console.error('Error in sync cron job:', error);
    }
  });
}

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    
    // Initial sync
    await syncService.forceSyncEvents();
    
    // Setup cron jobs
    setupCronJobs();

    // Start live stats polling (every 10 seconds)
    livePollingService.startPolling(10);

    const port = process.env.PORT || 3002;
    server.listen(port, () => {
      console.log(`Live stats service listening on port ${port}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();
