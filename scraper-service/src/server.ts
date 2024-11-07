import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { DatabaseService } from './services/database-service';
import { EventService } from './services/event-service';
import { FighterService } from './services/fighter-service';
import { setupEventRoutes } from './routes/event-routes';
import { setupFighterRoutes } from './routes/fighter-routes';
import { setupAnalyticsRoutes } from './routes/analytics-routes';
import { validateApiKey } from './middleware/auth';
import { limiter } from './middleware/rateLimiter';

dotenv.config();

const app = express();
const port = process.env.PORT || 5555;

// Initialize services
const dbService = new DatabaseService(process.env.DATABASE_URL!);
const eventService = new EventService(dbService.getPool());
const fighterService = new FighterService(dbService.getPool());

// Initialize database
dbService.initialize();

// Middleware
app.use(helmet());
// app.use(limiter);
// app.use('/api', validateApiKey);
app.use(cors({
  origin: ['http://localhost:3000', 'https://www.antiballsniffer.club/', 'https://introducing-first.onrender.com'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-API-Key']
}));
app.use(express.json());

// Routes
app.use('/api/events', setupEventRoutes(eventService));
app.use('/api/fighters', setupFighterRoutes(fighterService));
app.use('/api/analytics', setupAnalyticsRoutes(dbService.getPool()));

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
