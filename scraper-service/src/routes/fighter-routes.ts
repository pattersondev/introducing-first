import { Router } from 'express';
import { FighterService } from '../services/fighter-service';

export function setupFighterRoutes(fighterService: FighterService) {
  const router = Router();

  router.post('/', async (req, res) => {
    try {
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      if (!req.body) {
        throw new Error('No request body received');
      }

      const fighters = Array.isArray(req.body) ? req.body : [req.body];
      
      // Validate each fighter object
      fighters.forEach((fighter, index) => {
        if (!fighter.FirstName || !fighter.LastName) {
          console.log('Invalid fighter:', fighter);
          throw new Error(`Invalid fighter data at index ${index}: missing required fields`);
        }
      });

      // Process fighters
      for (const fighter of fighters) {
        await fighterService.processFighter(fighter);
      }

      res.json({ 
        message: 'Fighter data processed successfully',
        processedCount: fighters.length
      });
    } catch (error) {
      console.error('Error processing fighters:', error);
      res.status(500).json({ 
        error: 'Error processing fighters',
        details: error instanceof Error ? error.message : String(error),
        receivedData: req.body
      });
    }
  });

  router.get('/search', async (req, res) => {
    try {
      const query = req.query.q as string || '';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const results = await fighterService.searchFighters(query, page, limit);
      res.json(results);
    } catch (error) {
      console.error('Error searching fighters:', error);
      res.status(500).json({ error: 'Error searching fighters' });
    }
  });

  return router;
} 