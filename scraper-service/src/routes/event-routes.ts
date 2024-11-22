import { Router, Request, Response } from 'express';
import { EventService } from '../services/event-service';

export function setupEventRoutes(eventService: EventService) {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        throw new Error('No request body received');
      }

      const events = Array.isArray(req.body) ? req.body : [req.body];
      
      for (const event of events) {
        await eventService.processEvent(event);
      }

      res.json({ message: 'Event data processed successfully' });
    } catch (error) {
      console.error('Error processing events:', error);
      res.status(500).json({ 
        error: 'Error processing events',
        details: error instanceof Error ? error.message : String(error),
        receivedData: req.body
      });
    }
  });

  router.get('/recent-and-upcoming', async (req: Request, res: Response) => {
    try {
      const events = await eventService.getRecentAndUpcomingEvents();
      res.json(events);
    } catch (error) {
      console.error('Error fetching recent and upcoming events:', error);
      res.status(500).json({ error: 'Error fetching recent and upcoming events' });
    }
  });

  router.get('/upcoming', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 7;
      const events = await eventService.getUpcomingEvents(limit);
      res.json(events);
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      res.status(500).json({ error: 'Error fetching upcoming events' });
    }
  });

  router.get('/search', async (req: Request, res: Response) => {
    try {
      const searchTerm = req.query.q as string || '';
      const promotion = req.query.promotion as string || 'ALL';
      
      const events = await eventService.searchEvents(searchTerm, promotion);
      res.json(events);
    } catch (error) {
      console.error('Error searching events:', error);
      res.status(500).json({ error: 'Error searching events' });
    }
  });

  router.get('/', async (req: Request, res: Response) => {
    try {
      const events = await eventService.getAllEvents();
      res.json(events);
    } catch (error) {
      console.error('Error fetching all events:', error);
      res.status(500).json({ error: 'Error fetching all events' });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const event = await eventService.getEvent(req.params.id);
      res.json(event);
    } catch (error) {
      console.error('Error fetching event:', error);
      res.status(500).json({ error: 'Error fetching event' });
    }
  });
  
  router.post('/matchup/live-data', async (req: Request, res: Response) => {
    try {
      await eventService.updateMatchupLiveData(req.body);
      res.status(200).json({ message: 'Matchup live data updated successfully' });
    } catch (error) {
      console.error('Error updating matchup live data:', error);
      res.status(500).json({ error: 'Failed to update matchup live data' });
    }
  });

  router.get('/matchups/:id/details', async (req: Request, res: Response) => {
    try {
      const matchup = await eventService.getMatchupDetails(req.params.id);
      if (!matchup) {
        res.status(404).json({ error: 'Matchup not found' });
        return;
      }
      res.json(matchup);
    } catch (error) {
      console.error('Error fetching matchup details:', error);
      res.status(500).json({ error: 'Error fetching matchup details' });
    }
  });

  return router;
} 