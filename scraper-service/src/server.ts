import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { DatabaseService } from './services/database-service';
import { EventService } from './services/event-service';
import { FighterService } from './services/fighter-service';
import { RankingsService } from './services/rankings-service';
import { setupEventRoutes } from './routes/event-routes';
import { setupFighterRoutes } from './routes/fighter-routes';
import { setupAnalyticsRoutes } from './routes/analytics-routes';
import { setupRankingsRoutes } from './routes/rankings-routes';
import { validateApiKey } from './middleware/auth';
import { limiter } from './middleware/rateLimiter';
import cron from 'node-cron';
import { setupPredictionRoutes } from './routes/prediction-routes';
import { PredictionService } from './services/prediction-service';
import { FighterAnalytics } from './services/analytics-service';
import { NewsService } from './services/news-service';
import { setupNewsRoutes } from './routes/news-routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 5555;

// Initialize services
const dbService = new DatabaseService(process.env.DATABASE_URL!);
const eventService = new EventService(dbService.getPool(), new PredictionService(dbService.getPool()));
const fighterService = new FighterService(dbService.getPool());
const rankingsService = new RankingsService(dbService.getPool());
const predictionService = new PredictionService(dbService.getPool());
const newsService = new NewsService(dbService.getPool());

// Initialize database
dbService.initialize();

// Middleware
app.use(helmet());
// app.use(limiter);
// app.use('/api', validateApiKey);

// Configure CORS
const allowedOrigins = [
  'http://localhost:3000',
  'https://www.antiballsniffer.club',
  'https://antiballsniffer.club',
  'https://introducing-first.onrender.com',
  'https://merab.gay',
  'https://introducingfirst.io',
  'https://www.merab.gay',
  'https://www.introducingfirst.io'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/events', setupEventRoutes(eventService));
app.use('/api/fighters', setupFighterRoutes(fighterService));
app.use('/api/analytics', setupAnalyticsRoutes(new FighterAnalytics(dbService.getPool())));
app.use('/api/rankings', setupRankingsRoutes(rankingsService));
app.use('/api/predictions', setupPredictionRoutes(predictionService));
app.use('/api/news', setupNewsRoutes(newsService));

// Run cleanup at 3 AM every day
cron.schedule('0 3 * * *', async () => {
  try {
    console.log('Running scheduled search history cleanup...');
    await fighterService.cleanupSearches();
    console.log('Scheduled cleanup completed successfully');
  } catch (error) {
    console.error('Error during scheduled cleanup:', error);
  }
});

// Add new cron job for rankings update (Sundays at 3 AM)
cron.schedule('0 3 * * 0', async () => {
  try {
    console.log('Running weekly rankings update...');
    const weightClasses = await rankingsService.getWeightClasses();
    
    for (const weightClass of weightClasses) {
      console.log(`Updating rankings for ${weightClass.division} ${weightClass.name}...`);
      await rankingsService.updateRankings(weightClass.weight_class_id);
    }
    
    console.log('Weekly rankings update completed successfully');
  } catch (error) {
    console.error('Error during rankings update:', error);
  }
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
