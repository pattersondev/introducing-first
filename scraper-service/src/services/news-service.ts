import { Pool } from 'pg';

export interface NewsArticle {
    id: string;
    tweet_id: string;
    content: string;
    url: string;
    published_at: Date;
    created_at: Date;
    fighters?: Array<{ fighter_id: string; name: string }>;
    events?: Array<{ event_id: string; name: string }>;
}

export class NewsService {
    constructor(private pool: Pool) {}

    private async findFightersInContent(content: string): Promise<Array<{ fighter_id: string; name: string }>> {
        // Efficient query to match fighter names in content
        const query = `
            WITH fighter_names AS (
                SELECT 
                    fighter_id,
                    first_name || ' ' || last_name as full_name
                FROM fighters
                WHERE position($1 ILIKE '%' || first_name || ' ' || last_name || '%') > 0
            )
            SELECT DISTINCT fighter_id, full_name as name
            FROM fighter_names
            ORDER BY length(full_name) DESC
            LIMIT 5
        `;
        
        const result = await this.pool.query(query, [content]);
        return result.rows;
    }

    private async findEventsInContent(content: string): Promise<Array<{ event_id: string; name: string }>> {
        // Efficient query to match event names in content
        const query = `
            SELECT DISTINCT event_id, name
            FROM events
            WHERE position($1 ILIKE '%' || name || '%') > 0
            ORDER BY length(name) DESC
            LIMIT 3
        `;
        
        const result = await this.pool.query(query, [content]);
        return result.rows;
    }

    private async linkArticleToEntities(
        articleId: string,
        fighters: Array<{ fighter_id: string }>,
        events: Array<{ event_id: string }>
    ): Promise<void> {
        // Use a transaction to ensure all links are created atomically
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Link fighters
            if (fighters.length > 0) {
                const fighterValues = fighters
                    .map((f, i) => `($1, $${i + 2})`)
                    .join(',');
                const fighterParams = [articleId, ...fighters.map(f => f.fighter_id)];
                await client.query(
                    `INSERT INTO news_article_fighters (article_id, fighter_id)
                     VALUES ${fighterValues}
                     ON CONFLICT DO NOTHING`,
                    fighterParams
                );
            }

            // Link events
            if (events.length > 0) {
                const eventValues = events
                    .map((e, i) => `($1, $${i + 2})`)
                    .join(',');
                const eventParams = [articleId, ...events.map(e => e.event_id)];
                await client.query(
                    `INSERT INTO news_article_events (article_id, event_id)
                     VALUES ${eventValues}
                     ON CONFLICT DO NOTHING`,
                    eventParams
                );
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async addNewsArticle(article: NewsArticle): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Insert the article
            const articleQuery = `
                INSERT INTO news_articles (id, tweet_id, content, url, published_at, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (tweet_id) DO NOTHING
                RETURNING id
            `;

            const result = await client.query(articleQuery, [
                article.id,
                article.tweet_id,
                article.content,
                article.url,
                article.published_at,
                article.created_at
            ]);

            // If article was inserted (not a duplicate), process entities
            if (result.rowCount && result.rowCount > 0) {
                // Find entities in content
                const [fighters, events] = await Promise.all([
                    this.findFightersInContent(article.content),
                    this.findEventsInContent(article.content)
                ]);

                // Link entities to the article
                await this.linkArticleToEntities(article.id, fighters, events);

                // Add the found entities to the article object
                article.fighters = fighters;
                article.events = events;
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getLatestNews(limit: number = 20): Promise<NewsArticle[]> {
        const query = `
            WITH article_data AS (
                SELECT 
                    na.*,
                    json_agg(DISTINCT jsonb_build_object(
                        'fighter_id', f.fighter_id,
                        'name', f.first_name || ' ' || f.last_name
                    )) FILTER (WHERE f.fighter_id IS NOT NULL) as fighters,
                    json_agg(DISTINCT jsonb_build_object(
                        'event_id', e.event_id,
                        'name', e.name
                    )) FILTER (WHERE e.event_id IS NOT NULL) as events
                FROM news_articles na
                LEFT JOIN news_article_fighters naf ON na.id = naf.article_id
                LEFT JOIN fighters f ON naf.fighter_id = f.fighter_id
                LEFT JOIN news_article_events nae ON na.id = nae.article_id
                LEFT JOIN events e ON nae.event_id = e.event_id
                GROUP BY na.id
                ORDER BY na.published_at DESC
                LIMIT $1
            )
            SELECT 
                id, tweet_id, content, url, published_at, created_at,
                CASE WHEN fighters = '[null]' THEN '[]'::json ELSE fighters END as fighters,
                CASE WHEN events = '[null]' THEN '[]'::json ELSE events END as events
            FROM article_data
        `;

        const result = await this.pool.query(query, [limit]);
        return result.rows;
    }
} 