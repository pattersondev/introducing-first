import express from 'express';
import { NewsService } from '../services/news-service';

export function setupNewsRoutes(newsService: NewsService) {
    const router = express.Router();

    // Add a new news article
    router.post('/article', async (req, res): Promise<void> => {
        try {
            const article = req.body;
            
            // Validate required fields
            if (!article.tweet_id || !article.content || !article.url) {
                res.status(400).json({ 
                    error: 'Missing required fields' 
                });
                return;
            }

            await newsService.addNewsArticle(article);
            
            res.status(200).json({ 
                message: 'News article added successfully',
                article_id: article.id
            });
        } catch (error: any) {
            console.error('Error adding news article:', error);
            
            // Check for duplicate key violation
            if (error.code === '23505') { // PostgreSQL unique violation code
                res.status(409).json({ 
                    error: 'Article already exists',
                    tweet_id: req.body.tweet_id
                });
                return;
            }
            
            res.status(500).json({ 
                error: 'Failed to add news article' 
            });
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