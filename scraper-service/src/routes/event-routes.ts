import { Router } from 'express';
import { EventService } from '../services/event-service';

export function setupEventRoutes(eventService: EventService) {
  const router = Router();

  router.post('/', async (req, res) => {
    const events = req.body;
    try {
      for (const event of events) {
        await eventService.processEvent(event);
      }
      res.json({ message: 'Data processed successfully' });
    } catch (error) {
      console.error('Error processing events:', error);
      res.status(500).json({ error: 'Error processing events' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const events = await eventService.getAllEvents();
      res.json(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: 'Error fetching events' });
    }
  });

  return router;
} 