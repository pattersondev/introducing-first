import { Router, Request, Response } from 'express';
import { PredictionService } from '../services/prediction-service';

export function setupPredictionRoutes(predictionService: PredictionService) {
    const router = Router();

    // Generate a new prediction for a matchup
    router.post('/matchups/:matchupId/predict', async (req: Request, res: Response) => {
        try {
            const prediction = await predictionService.predictFight(req.params.matchupId);
            res.json(prediction);
        } catch (error) {
            console.error('Error generating prediction:', error);
            res.status(500).json({ 
                error: 'Error generating prediction',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });

    // Get the latest prediction for a matchup
    router.get('/matchups/:matchupId/prediction', async (req: Request, res: Response) => {
        try {
            const prediction = await predictionService.getLatestPrediction(req.params.matchupId);
            if (!prediction) {
                res.status(404).json({ error: 'No prediction found for this matchup' });
                return;
            }
            res.json(prediction);
        } catch (error) {
            console.error('Error fetching prediction:', error);
            res.status(500).json({ error: 'Error fetching prediction' });
        }
    });

    return router;
} 