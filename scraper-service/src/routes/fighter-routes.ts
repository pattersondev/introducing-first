import { Router, Request, Response } from 'express';
import { FighterService } from '../services/fighter-service';

interface DBFight {
  date: string;
  opponent: string;
  opponent_id?: string;
  event: string;
  event_id?: string;
  result: string;
  decision: string;
  rnd: number;
  time: string;
  fight_id: string;
  fighter_id: string;
  matchup_id?: string;
  is_title_fight: boolean;
}

interface RankingData {
  weightClass: string;
  rankings: {
    name: string;
    position: number;
  }[];
}

export function setupFighterRoutes(fighterService: FighterService) {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
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

  router.get('/search', async (req: Request, res: Response) => {
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

  router.get('/popular', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const popularFighters = await fighterService.getPopularFighters(limit);
      res.json(popularFighters);
    } catch (error) {
      console.error('Error fetching popular fighters:', error);
      res.status(500).json({ error: 'Error fetching popular fighters' });
    }
  });

  router.post('/:id/track', async (req: Request, res: Response) => {
    try {
      await fighterService.trackSearch(req.params.id);
      res.json({ message: 'Search tracked successfully' });
    } catch (error) {
      console.error('Error tracking search:', error);
      res.status(500).json({ error: 'Error tracking search' });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const fighter = await fighterService.getFighterById(req.params.id);
      
      const formattedFighter = {
        ...fighter,
        fights: fighter.fights.map((fight: DBFight) => ({
          date: fight.date,
          opponent: fight.opponent,
          opponent_id: fight.opponent_id,
          event: fight.event,
          event_id: fight.event_id,
          result: fight.result,
          decision: fight.decision,
          rnd: fight.rnd,
          time: fight.time,
          is_title_fight: fight.is_title_fight
        }))
      };

      res.json(formattedFighter);
    } catch (error) {
      console.error('Error fetching fighter:', error);
      res.status(500).json({ error: 'Error fetching fighter details' });
    }
  });

  router.post('/rankings', async (req: Request, res: Response) => {
    try {
      const rankings = req.body as RankingData[];
      
      if (!Array.isArray(rankings)) {
        throw new Error('Rankings data must be an array');
      }

      // Validate the rankings data
      rankings.forEach((weightClass, index) => {
        if (!weightClass.weightClass || !Array.isArray(weightClass.rankings)) {
          throw new Error(`Invalid rankings data at index ${index}`);
        }
      });

      await fighterService.updateFighterRankings(rankings);

      res.json({ 
        message: 'Rankings updated successfully',
        updatedWeightClasses: rankings.length
      });
    } catch (error) {
      console.error('Error updating rankings:', error);
      res.status(500).json({ 
        error: 'Error updating rankings',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return router;
} 