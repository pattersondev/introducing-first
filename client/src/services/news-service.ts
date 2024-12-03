import { NewsArticle } from "@/types/api";
import { API_BASE_URL } from "@/config/api";

export class NewsServiceError extends Error {
    constructor(message: string, public statusCode?: number) {
        super(message);
        this.name = 'NewsServiceError';
    }
}

export const NewsService = {
    async getLatestNews(limit: number = 20): Promise<NewsArticle[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/news/latest?limit=${limit}`);
            
            if (!response.ok) {
                throw new NewsServiceError(
                    `Failed to fetch news: ${response.statusText}`,
                    response.status
                );
            }

            const data = await response.json();
            
            if (!Array.isArray(data)) {
                throw new NewsServiceError('Invalid response format: expected an array of news articles');
            }

            return data;
        } catch (error) {
            if (error instanceof NewsServiceError) {
                throw error;
            }
            
            throw new NewsServiceError(
                error instanceof Error ? error.message : 'Failed to fetch news'
            );
        }
    }
}