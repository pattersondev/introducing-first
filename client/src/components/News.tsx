"use client";

import { useEffect, useState, useCallback } from "react";
import { NewsArticle, NewsArticleFighter, NewsArticleEvent } from "@/types/api";
import { NewsService, NewsServiceError } from "@/services/news-service";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function NewsCardSkeleton() {
  return (
    <Card className="bg-gray-900">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24 bg-gray-800" />
          <Skeleton className="h-4 w-full bg-gray-800" />
          <Skeleton className="h-4 w-full bg-gray-800" />
          <Skeleton className="h-4 w-3/4 bg-gray-800" />
        </div>
      </CardContent>
    </Card>
  );
}

interface LinkedContent {
  content: string;
  linkedParts: {
    text: string;
    fighter_id?: string;
    event_id?: string;
    start: number;
    end: number;
  }[];
}

function processContent(article: NewsArticle): LinkedContent {
  const content = article.content;
  const linkedParts: LinkedContent["linkedParts"] = [];

  // Sort fighters by name length (longest first) to avoid partial matches
  // Remove duplicate fighter names while preserving the first occurrence
  const uniqueFighters =
    article.fighters
      ?.reduce<NewsArticleFighter[]>((acc, current) => {
        const exists = acc.find(
          (f) => f.name.toLowerCase() === current.name.toLowerCase()
        );
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, [])
      .sort((a, b) => b.name.length - a.name.length) || [];

  // Find all fighter name occurrences
  uniqueFighters.forEach((fighter) => {
    let position = content.toLowerCase().indexOf(fighter.name.toLowerCase());
    while (position !== -1) {
      // Check if this position overlaps with any existing linked parts
      const overlaps = linkedParts.some(
        (part) =>
          (position >= part.start && position < part.end) ||
          (position + fighter.name.length > part.start &&
            position + fighter.name.length <= part.end)
      );

      if (!overlaps) {
        linkedParts.push({
          text: content.slice(position, position + fighter.name.length),
          fighter_id: fighter.fighter_id,
          start: position,
          end: position + fighter.name.length,
        });
      }
      position = content
        .toLowerCase()
        .indexOf(fighter.name.toLowerCase(), position + 1);
    }
  });

  return {
    content,
    linkedParts: linkedParts.sort((a, b) => a.start - b.start),
  };
}

function LinkedText({ content, linkedParts }: LinkedContent) {
  let lastIndex = 0;
  const elements: JSX.Element[] = [];

  linkedParts.forEach((part, index) => {
    // Add text before the link
    if (part.start > lastIndex) {
      elements.push(
        <span key={`text-${index}`}>
          {content.slice(lastIndex, part.start)}
        </span>
      );
    }

    // Add the linked part
    if (part.fighter_id) {
      elements.push(
        <Link
          href={`/fighters/${part.fighter_id}`}
          key={`link-${index}`}
          className="text-blue-400 hover:text-blue-300 hover:underline"
        >
          {part.text}
        </Link>
      );
    }

    lastIndex = part.end;
  });

  // Add any remaining text
  if (lastIndex < content.length) {
    elements.push(<span key="text-final">{content.slice(lastIndex)}</span>);
  }

  return <>{elements}</>;
}

function getSourceFromUrl(url: string): { handle: string; url: string } | null {
  try {
    // Extract username from Twitter URL
    const match = url.match(/twitter\.com\/([^\/]+)/);
    if (match && match[1]) {
      return {
        handle: `@${match[1].toLowerCase()}`,
        url: `https://twitter.com/${match[1]}`,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export default function News() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNews = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      }
      const articles = await NewsService.getLatestNews();
      setNews(articles);
      setError(null);
    } catch (err) {
      setError(
        err instanceof NewsServiceError ? err.message : "Failed to load news"
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleRefresh = () => {
    fetchNews(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Latest News</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <NewsCardSkeleton key={i} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Latest News</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Latest News</CardTitle>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className="h-8"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-4">
              {news.map((article) => {
                const processedContent = processContent(article);
                return (
                  <Card
                    key={article.id}
                    className="bg-gray-900 hover:bg-gray-800/50 transition-colors"
                  >
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-400">
                              {formatDistanceToNow(
                                new Date(article.published_at),
                                {
                                  addSuffix: true,
                                }
                              )}
                            </p>
                            <span className="text-gray-600">•</span>
                            <p className="text-sm text-gray-400">
                              via{" "}
                              {(() => {
                                const source = getSourceFromUrl(article.url);
                                return source ? (
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-400 hover:underline"
                                  >
                                    {source.handle}
                                  </a>
                                ) : (
                                  "Unknown Source"
                                );
                              })()}
                            </p>
                          </div>
                          {article.url && (
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-400 text-sm inline-flex items-center gap-1 hover:underline"
                            >
                              Read more
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="text-gray-100 leading-relaxed">
                          <LinkedText {...processedContent} />
                        </div>
                        {article.fighters && article.fighters.length > 0 && (
                          <>
                            <Separator className="my-4" />
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-400">
                                Featured Fighters
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {article.fighters
                                  .reduce<NewsArticleFighter[]>(
                                    (acc, current) => {
                                      const exists = acc.find(
                                        (f) =>
                                          f.name.toLowerCase() ===
                                          current.name.toLowerCase()
                                      );
                                      if (!exists) {
                                        acc.push(current);
                                      }
                                      return acc;
                                    },
                                    []
                                  )
                                  .map((fighter) => (
                                    <Link
                                      key={fighter.fighter_id}
                                      href={`/fighters/${fighter.fighter_id}`}
                                    >
                                      <div className="group relative bg-gray-800 rounded-lg p-3 hover:bg-gray-700 transition-all duration-200 flex items-center space-x-3">
                                        <div className="relative">
                                          <Avatar className="h-12 w-12 border-2 border-transparent group-hover:border-blue-500 transition-all duration-200">
                                            <AvatarImage
                                              src={
                                                fighter.image_url ||
                                                `/api/fighters/${fighter.fighter_id}/image`
                                              }
                                              alt={fighter.name}
                                              className="object-cover"
                                            />
                                            <AvatarFallback className="bg-gray-700">
                                              {fighter.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="absolute -bottom-1 -right-1">
                                            <Badge
                                              variant="secondary"
                                              className="h-5 w-5 rounded-full p-0 flex items-center justify-center"
                                            >
                                              <ExternalLink className="h-3 w-3" />
                                            </Badge>
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-100 truncate group-hover:text-blue-400 transition-colors">
                                            {fighter.name}
                                          </p>
                                          <p className="text-xs text-gray-400 truncate">
                                            View Profile
                                          </p>
                                        </div>
                                      </div>
                                    </Link>
                                  ))}
                              </div>
                            </div>
                          </>
                        )}
                        {article.events && article.events.length > 0 && (
                          <>
                            <Separator className="my-4" />
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-400">
                                Related Events
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {article.events.map((event) => (
                                  <Link
                                    key={event.event_id}
                                    href={`/events/${event.event_id}`}
                                  >
                                    <Badge
                                      variant="secondary"
                                      className="hover:bg-gray-700 transition-colors cursor-pointer"
                                    >
                                      {event.name}
                                    </Badge>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
