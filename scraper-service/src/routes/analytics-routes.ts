import { Router } from 'express';
import { FighterAnalytics } from '../services/analytics-service';

export function setupAnalyticsRoutes(analyticsService: FighterAnalytics) {
  const router = Router();

  // Get fighter's fighting style analysis
  router.get('/fighter/:fighterId/style', async (req, res) => {
    try {
      const { fighterId } = req.params;
      const [styleAnalysis, rates] = await Promise.all([
        analyticsService.calculateFighterStyle(fighterId),
        analyticsService.calculateFighterRates(fighterId)
      ]);

      res.json({
        ...styleAnalysis,
        ...rates
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze fighter style' });
    }
  });

  // Get fighter's career phases analysis
  router.get('/fighter/:fighterId/career-phases', async (req, res) => {
    try {
      const { fighterId } = req.params;
      const careerPhases = await analyticsService.analyzeCareerPhases(fighterId);
      res.json(careerPhases);
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze career phases' });
    }
  });

  // Get fighter's style evolution analysis
  router.get('/fighter/:fighterId/style-evolution', async (req, res) => {
    try {
      const { fighterId } = req.params;
      const styleEvolution = await analyticsService.analyzeStyleEvolution(fighterId);
      res.json(styleEvolution);
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze style evolution' });
    }
  });

  return router;
} 