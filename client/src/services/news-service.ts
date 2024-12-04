import { NewsArticle } from "@/types/api";
import { API_BASE_URL } from "@/config/api";

export class NewsServiceError extends Error {
    constructor(message: string, public statusCode?: number) {
        super(message);
        this.name = 'NewsServiceError';
    }
}

const CACHE_KEY = 'news_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CacheEntry {
    timestamp: number;
    data: NewsArticle[];
}

export const NewsService = {
    getCachedNews(): CacheEntry | null {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;
            return JSON.parse(cached) as CacheEntry;
        } catch {
            return null;
        }
    },

    setCachedNews(articles: NewsArticle[]): void {
        const cacheEntry: CacheEntry = {
            timestamp: Date.now(),
            data: articles,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
    },

    isCacheValid(cache: CacheEntry): boolean {
        return Date.now() - cache.timestamp < CACHE_DURATION;
    },

    async getLatestNews(limit: number = 20, forceRefresh: boolean = false): Promise<NewsArticle[]> {
        // Check cache first unless force refresh is requested
        if (!forceRefresh) {
            const cached = this.getCachedNews();
            if (cached && this.isCacheValid(cached)) {
                return cached.data;
            }
        }

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

            // Update cache with new data
            this.setCachedNews(data);

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