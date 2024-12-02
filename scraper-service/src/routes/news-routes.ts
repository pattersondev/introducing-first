import express from 'express';
import { NewsService } from '../services/news-service';

export function setupNewsRoutes(newsService: NewsService) {
    const router = express.Router();

    // Add a new news article
    router.post('/article', async (req, res) => {
        try {
            await newsService.addNewsArticle(req.body);
            res.status(200).json({ message: 'News article added successfully' });
        } catch (error) {
            console.error('Error adding news article:', error);
            res.status(500).json({ error: 'Failed to add news article' });
        }
    });

    // Get latest news
    router.get('/latest', async (req, res) => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
            const articles = await newsService.getLatestNews(limit);
            res.json(articles);
        } catch (error) {
            console.error('Error fetching news:', error);
            res.status(500).json({ error: 'Failed to fetch news' });
        }
    });

    return router;
} 