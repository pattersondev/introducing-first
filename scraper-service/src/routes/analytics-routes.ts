import express from 'express';
import { FighterAnalytics } from '../services/analytics-service';
import { Pool } from 'pg';

export function setupAnalyticsRoutes(pool: Pool) {
  const router = express.Router();
  const analytics = new FighterAnalytics(pool);

  router.get('/fighter-style/:fighterId', async (req, res) => {
    try {
      const style = await analytics.calculateFighterStyle(req.params.fighterId);
      res.json(style);
    } catch (error) {
      res.status(500).json({ error: 'Error calculating fighter style' });
    }
  });

  router.get('/style-matchups', async (req, res) => {
    try {
      const matchups = await analytics.analyzeStyleMatchups();
      res.json(matchups);
    } catch (error) {
      res.status(500).json({ error: 'Error analyzing style matchups' });
    }
  });

  router.get('/finishing-tendency/:fighterId', async (req, res) => {
    try {
      const tendency = await analytics.calculateFinishingTendency(req.params.fighterId);
      res.json(tendency);
    } catch (error) {
      res.status(500).json({ error: 'Error calculating finishing tendency' });
    }
  });

  router.get('/round-performance/:fighterId', async (req, res) => {
    try {
      const performance = await analytics.analyzeRoundPerformance(req.params.fighterId);
      res.json(performance);
    } catch (error) {
      res.status(500).json({ error: 'Error analyzing round performance' });
    }
  });

  router.get('/defensive-efficiency/:fighterId', async (req, res) => {
    try {
      const efficiency = await analytics.analyzeDefensiveEfficiency(req.params.fighterId);
      res.json(efficiency);
    } catch (error) {
      res.status(500).json({ error: 'Error analyzing defensive efficiency' });
    }
  });

  router.get('/recovery-ability/:fighterId', async (req, res) => {
    try {
      const recovery = await analytics.analyzeRecoveryAbility(req.params.fighterId);
      res.json(recovery);
    } catch (error) {
      res.status(500).json({ error: 'Error analyzing recovery ability' });
    }
  });

  router.get('/momentum/:fighterId', async (req, res) => {
    try {
      const momentum = await analytics.analyzeMomentum(req.params.fighterId);
      res.json(momentum);
    } catch (error) {
      res.status(500).json({ error: 'Error analyzing momentum' });
    }
  });

  router.get('/post-knockout-analysis/:fighterId', async (req, res) => {
    try {
      const analysis = await analytics.analyzePostKnockoutPerformance(req.params.fighterId);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: 'Error analyzing post-knockout performance' });
    }
  });

  router.get('/style-evolution/:fighterId', async (req, res) => {
    try {
      const evolution = await analytics.analyzeStyleEvolution(req.params.fighterId);
      res.json(evolution);
    } catch (error) {
      res.status(500).json({ error: 'Error analyzing style evolution' });
    }
  });

  router.get('/career-phases/:fighterId', async (req, res) => {
    try {
      const analysis = await analytics.analyzeCareerPhases(req.params.fighterId);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: 'Error analyzing career phases' });
    }
  });

  return router;
} 