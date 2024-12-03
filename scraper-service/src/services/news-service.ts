import { Pool } from 'pg';

export interface NewsArticle {
    id: string;
    tweet_id: string;
    content: string;
    url: string;
    published_at: Date;
    created_at: Date;
    fighters?: Array<{ fighter_id: string; name: string; similarity: number }>;
    events?: Array<{ event_id: string; name: string; similarity: number }>;
}

export class NewsService {
    constructor(private pool: Pool) {}

    private async findFightersInContent(content: string): Promise<Array<{ fighter_id: string; name: string; similarity: number }>> {
        console.log('Searching for fighters in content:', content);
        const query = `
            WITH fighter_names AS (
                SELECT 
                    fighter_id,
                    first_name || ' ' || last_name as full_name,
                    first_name,
                    last_name
                FROM fighters
                WHERE 
                    -- Check for exact full name match
                    position(lower(first_name || ' ' || last_name) in lower($1)) > 0
                    -- Or check for exact first and last name separately
                    OR (
                        position(lower(first_name) in lower($1)) > 0 
                        AND position(lower(last_name) in lower($1)) > 0
                    )
            )
            SELECT DISTINCT 
                fighter_id, 
                full_name as name,
                CASE 
                    WHEN position(lower(full_name) in lower($1)) > 0 THEN 1.0
                    ELSE similarity(full_name, regexp_replace($1, '[^a-zA-Z0-9\\s]', '', 'g'))
                END as similarity
            FROM fighter_names
            ORDER BY similarity DESC
            LIMIT 5
        `;
        
        const result = await this.pool.query(query, [content]);
        console.log('Found fighters:', result.rows);
        return result.rows;
    }

    private async findEventsInContent(content: string): Promise<Array<{ event_id: string; name: string; similarity: number }>> {
        // Use trigram similarity for fuzzy matching of event names
        const query = `
            WITH event_matches AS (
                SELECT 
                    event_id,
                    name,
                    similarity(name, word) as name_similarity
                FROM events
                CROSS JOIN (
                    SELECT unnest(regexp_split_to_array($1, E'\\s+|[.,!?;]\\s*')) as word
                ) as words
                WHERE 
                    length(word) > 3 AND
                    (
                        similarity(name, word) > 0.3 OR
                        name ILIKE '%' || word || '%'
                    )
            )
            SELECT DISTINCT 
                event_id, 
                name,
                max(name_similarity) as similarity
            FROM event_matches
            GROUP BY event_id, name
            ORDER BY max(name_similarity) DESC
            LIMIT 3
        `;
        
        const result = await this.pool.query(query, [content]);
        return result.rows;
    }

    async addNewsArticle(article: NewsArticle): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            console.log('Inserting article:', article.id);
            // First, insert the article
            const result = await client.query(`
                INSERT INTO news_articles (id, tweet_id, content, url, published_at, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (tweet_id) DO NOTHING
                RETURNING id
            `, [
                article.id,
                article.tweet_id,
                article.content,
                article.url,
                article.published_at,
                article.created_at
            ]);

            console.log('Insert result rowCount:', result.rowCount);
            // If article was inserted (not a duplicate), find and link entities
            if (result.rowCount && result.rowCount > 0) {
                console.log('Article inserted, finding entities...');
                // Find entities in content
                const [fighters, events] = await Promise.all([
                    this.findFightersInContent(article.content),
                    this.findEventsInContent(article.content)
                ]);

                console.log('Found fighters:', fighters);
                console.log('Found events:', events);

                // Link fighters if found
                if (fighters.length > 0) {
                    console.log('Linking fighters...');
                    const fighterValues = fighters
                        .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
                        .join(',');
                    const fighterParams = [
                        article.id,
                        ...fighters.flatMap(f => [f.fighter_id, f.similarity])
                    ];
                    await client.query(`
                        INSERT INTO news_article_fighters (article_id, fighter_id, confidence_score)
                        VALUES ${fighterValues}
                        ON CONFLICT DO NOTHING
                    `, fighterParams);
                }

                // Link events if found
                if (events.length > 0) {
                    console.log('Linking events...');
                    const eventValues = events
                        .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
                        .join(',');
                    const eventParams = [
                        article.id,
                        ...events.flatMap(e => [e.event_id, e.similarity])
                    ];
                    await client.query(`
                        INSERT INTO news_article_events (article_id, event_id, confidence_score)
                        VALUES ${eventValues}
                        ON CONFLICT DO NOTHING
                    `, eventParams);
                }

                // Update the article object with found entities
                article.fighters = fighters;
                article.events = events;
            } else {
                console.log('Article already exists, skipping entity detection');
            }

            await client.query('COMMIT');
        } catch (error) {
            console.error('Error in addNewsArticle:', error);
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
                    COALESCE(
                        json_agg(DISTINCT jsonb_build_object(
                            'fighter_id', f.fighter_id,
                            'name', f.first_name || ' ' || f.last_name
                        )) FILTER (WHERE f.fighter_id IS NOT NULL),
                        '[]'::json
                    ) as fighters,
                    COALESCE(
                        json_agg(DISTINCT jsonb_build_object(
                            'event_id', e.event_id,
                            'name', e.name
                        )) FILTER (WHERE e.event_id IS NOT NULL),
                        '[]'::json
                    ) as events
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
                fighters,
                events
            FROM article_data
        `;

        const result = await this.pool.query(query, [limit]);
        return result.rows;
    }
} 