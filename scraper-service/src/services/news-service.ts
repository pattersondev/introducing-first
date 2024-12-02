import { Pool } from 'pg';

export interface NewsArticle {
    id: string;
    tweet_id: string;
    content: string;
    url: string;
    published_at: Date;
    created_at: Date;
}

export class NewsService {
    constructor(private pool: Pool) {}

    async addNewsArticle(article: NewsArticle): Promise<void> {
        const query = `
            INSERT INTO news_articles (id, tweet_id, content, url, published_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (tweet_id) DO NOTHING
        `;

        await this.pool.query(query, [
            article.id,
            article.tweet_id,
            article.content,
            article.url,
            article.published_at,
            article.created_at
        ]);
    }

    async getLatestNews(limit: number = 20): Promise<NewsArticle[]> {
        const query = `
            SELECT * FROM news_articles
            ORDER BY published_at DESC
            LIMIT $1
        `;

        const result = await this.pool.query(query, [limit]);
        return result.rows;
    }
} 