import { Router, Request, Response } from 'express';
import { RankingsService } from '../services/rankings-service';

export function setupRankingsRoutes(rankingsService: RankingsService) {
  const router = Router();

  router.get('/weight-classes', async (req: Request, res: Response) => {
    try {
      const weightClasses = await rankingsService.getWeightClasses();
      res.json(weightClasses);
    } catch (error) {
      console.error('Error fetching weight classes:', error);
      res.status(500).json({ error: 'Error fetching weight classes' });
    }
  });

  router.get('/analytics/:weightClassId', async (req: Request, res: Response) => {
    try {
      const weightClassId = parseInt(req.params.weightClassId);
      const rankings = await rankingsService.getAnalyticsRankings(weightClassId);
      res.json(rankings);
    } catch (error) {
      console.error('Error fetching analytics rankings:', error);
      res.status(500).json({ error: 'Error fetching analytics rankings' });
    }
  });

  router.get('/community/:weightClassId', async (req: Request, res: Response) => {
    try {
      const weightClassId = parseInt(req.params.weightClassId);
      const rankings = await rankingsService.getCommunityRankings(weightClassId);
      res.json(rankings);
    } catch (error) {
      console.error('Error fetching community rankings:', error);
      res.status(500).json({ error: 'Error fetching community rankings' });
    }
  });

  return router;
} 