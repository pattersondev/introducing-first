import { useEffect, useState } from "react";
import { NewsArticle } from "@/types/api";
import { NewsService, NewsServiceError } from "@/services/news-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function News() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const articles = await NewsService.getLatestNews();
        setNews(articles);
        setError(null);
      } catch (err) {
        setError(
          err instanceof NewsServiceError ? err.message : "Failed to load news"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-100" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Latest News</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-4">
              {news.map((article) => (
                <Card key={article.id} className="bg-gray-900">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">
                        {new Date(article.published_at).toLocaleDateString()}
                      </p>
                      <p className="text-gray-100">{article.content}</p>
                      {article.url && (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-400 text-sm"
                        >
                          Read more →
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
