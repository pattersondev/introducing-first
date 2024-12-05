import { DetailedFighter } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Calendar,
  Ruler,
  Weight,
  Award,
  Flag,
  Swords,
  Trophy,
  Handshake,
  Ban,
  Timer,
  AlertCircle,
  Crown,
  Newspaper,
  Clock,
  ClipboardList,
  Dumbbell,
  History,
  Medal,
  Users,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { getCountryCode } from "@/utils/country-codes";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { NewsService } from "@/services/news-service";
import { NewsArticle } from "@/types/api";
import NextLink from "next/link";
import { TeammatesList } from "./TeammatesList";
import { FighterService } from "@/services/fighter-service";
import { TeammateFighter, ApiResponse } from "@/types/api";

interface FighterProfileProps {
  fighter: DetailedFighter;
}

export function FighterProfile({ fighter }: FighterProfileProps) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teammates, setTeammates] = useState<TeammateFighter[]>([]);
  const [isLoadingTeammates, setIsLoadingTeammates] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      if (!fighter?.first_name || !fighter?.last_name) return;

      setLoading(true);
      setError(null);
      try {
        const articles = await NewsService.getNewsByFighter(
          `${fighter.first_name} ${fighter.last_name}`
        );
        setNews(articles);
      } catch (err) {
        setError("Failed to load news articles");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [fighter?.first_name, fighter?.last_name]);

  useEffect(() => {
    const loadTeammates = async () => {
      if (!fighter.fighter_id) return;
      console.log("Loading teammates for fighter:", fighter.fighter_id);

      setIsLoadingTeammates(true);
      try {
        const response = await FighterService.getTeammates(fighter.fighter_id);
        console.log("Teammates response:", response);

        if (response.data?.success && Array.isArray(response.data.data)) {
          console.log("Setting teammates array:", response.data.data);
          setTeammates(response.data.data);
        } else {
          console.log("No valid teammates array found in response");
          setTeammates([]);
        }
      } catch (error) {
        console.error("Error loading teammates:", error);
        setTeammates([]);
      } finally {
        setIsLoadingTeammates(false);
      }
    };

    loadTeammates();
  }, [fighter.fighter_id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const stats = [
    {
      label: "Record",
      value: fighter.win_loss_record,
      icon: Trophy,
      color: "text-yellow-400",
    },
    {
      label: "TKO Record",
      value: fighter.tko_record,
      icon: Swords,
      color: "text-red-400",
    },
    {
      label: "Submission Record",
      value: fighter.sub_record,
      icon: Award,
      color: "text-blue-400",
    },
    {
      label: "Country",
      value: fighter.country || "Unknown",
      icon: Flag,
      color: "text-green-400",
      render: (value: string) => {
        const countryCode = getCountryCode(value);
        return (
          <div className="flex items-center gap-2">
            <span>{value}</span>
            {countryCode && (
              <img
                src={`https://flagcdn.com/16x12/${countryCode}.png`}
                alt={value}
                className="w-4 h-3"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>
        );
      },
    },
  ];

  const details = [
    {
      label: "Age",
      value: fighter.age && fighter.age > 0 ? fighter.age : "Unknown",
      icon: User,
    },
    {
      label: "Birthday",
      value: fighter.birthdate ? formatDate(fighter.birthdate) : "Unknown",
      icon: Calendar,
    },
    {
      label: "Height",
      value: fighter.height
        ? `${Math.floor(fighter.height / 12)}'${fighter.height % 12}"`
        : "Unknown",
      icon: Ruler,
    },
    {
      label: "Weight",
      value:
        fighter.weight && fighter.weight > 0
          ? `${fighter.weight} lbs`
          : "Unknown",
      icon: Weight,
    },
    {
      label: "Stance",
      value: fighter.stance || "Unknown",
      icon: Dumbbell,
    },
    {
      label: "Team",
      value: fighter.team || "Unknown",
      icon: Users,
    },
    {
      label: "Reach",
      value: fighter.reach || "Unknown",
      icon: Ruler,
    },
  ];

  const getMethodIcon = (decision: string) => {
    const methodLower = decision?.toLowerCase() || "";
    if (methodLower.includes("ko") || methodLower.includes("tko")) {
      return <Swords className="w-4 h-4 text-red-400 shrink-0" />;
    }
    if (methodLower.includes("submission") || methodLower.includes("sub")) {
      return <Award className="w-4 h-4 text-blue-400 shrink-0" />;
    }
    if (methodLower.includes("decision")) {
      return <Timer className="w-4 h-4 text-gray-400 shrink-0" />;
    }
    if (methodLower.includes("draw")) {
      return <Handshake className="w-4 h-4 text-yellow-400 shrink-0" />;
    }
    if (methodLower.includes("no contest")) {
      return <Ban className="w-4 h-4 text-yellow-400 shrink-0" />;
    }
    return <AlertCircle className="w-4 h-4 text-gray-400 shrink-0" />;
  };

  const getUniqueFights = (fights: DetailedFighter["fights"]) => {
    if (!fights) return [];

    const uniqueFights = fights.reduce((acc, current) => {
      const key = `${current.date}-${current.event}-${current.opponent}`;
      if (!acc.has(key)) {
        acc.set(key, current);
      }
      return acc;
    }, new Map());

    return Array.from(uniqueFights.values());
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        <Card className="bg-gray-800 border-gray-700 w-full md:w-64">
          <CardContent className="p-6">
            <div className="aspect-square rounded-lg bg-gray-700 overflow-hidden">
              {fighter.image_url ? (
                <Image
                  src={fighter.image_url}
                  alt={`${fighter.first_name} ${fighter.last_name}`}
                  width={350}
                  height={254}
                  className="w-full h-full object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-24 h-24 text-gray-400" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 space-y-6">
          <div>
            <div className="flex items-center gap-2 h-[42px]">
              <h1 className="text-3xl font-bold">
                {fighter.first_name} {fighter.last_name}
              </h1>
              {typeof fighter.current_promotion_rank === "number" && (
                <div
                  className={cn(
                    "px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-sm font-medium mt-1",
                    {
                      "text-yellow-400": fighter.current_promotion_rank === 0,
                      "text-red-400":
                        fighter.current_promotion_rank > 0 &&
                        fighter.current_promotion_rank <= 5,
                      "text-cyan-400": fighter.current_promotion_rank > 5,
                    }
                  )}
                >
                  {fighter.current_promotion_rank === 0
                    ? "Champion"
                    : `#${fighter.current_promotion_rank}`}
                </div>
              )}
            </div>
            {fighter.nickname && (
              <p className="text-xl text-gray-400">"{fighter.nickname}"</p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    <span className="text-sm text-gray-400">{stat.label}</span>
                  </div>
                  {stat.render ? (
                    stat.render(stat.value)
                  ) : (
                    <p className="text-lg font-semibold">{stat.value}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              <CardTitle>Fighter Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {details.map((detail, index) => (
                <div key={index} className="flex items-center gap-2">
                  <detail.icon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">{detail.label}</p>
                    <p className="font-medium">{detail.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Teammates</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <TeammatesList
              teammates={teammates}
              isLoading={isLoadingTeammates}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              <CardTitle>Recent News</CardTitle>
            </div>
            {news.length > 0 && (
              <p className="text-sm text-gray-400">
                {news.length} article{news.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {error && <p className="text-destructive py-4">{error}</p>}

          {!loading && !error && news.length === 0 && (
            <p className="text-gray-400 py-4">
              No recent news found for {fighter?.first_name}{" "}
              {fighter?.last_name}.
            </p>
          )}

          <div
            className={cn(
              "grid gap-4",
              news.length === 1
                ? "grid-cols-1 max-w-2xl mx-auto"
                : news.length === 2
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}
          >
            {news.map((article) => (
              <div
                key={article.id}
                className={cn(
                  "p-4 rounded-lg border border-gray-700 bg-gray-900",
                  "transition-all duration-200 hover:-translate-y-1",
                  "hover:bg-gray-800",
                  news.length === 1 ? "md:p-6" : ""
                )}
              >
                <NextLink
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                >
                  <h3 className="font-semibold text-gray-100">
                    {article.content.split("\n")[0]}
                  </h3>
                </NextLink>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-400">
                    {new Date(article.published_at).toLocaleDateString()}
                  </p>
                </div>
                <p
                  className={cn(
                    "text-sm text-gray-400 mt-3",
                    news.length === 1 ? "line-clamp-4" : "line-clamp-2"
                  )}
                >
                  {article.content}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700 col-span-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <CardTitle>Fight History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-900 z-10">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Opponent</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Round/Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getUniqueFights(fighter.fights)
                  ?.sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  )
                  .map((fight, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {fight.date ? formatDate(fight.date) : "Unknown"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {fight.opponent_id ? (
                            <Link
                              href={`/fighters/${fight.opponent_id}`}
                              className="text-blue-400 hover:text-blue-300 hover:underline"
                            >
                              {fight.opponent}
                            </Link>
                          ) : (
                            fight.opponent
                          )}
                          {fight.is_title_fight && (
                            <span className="text-yellow-400">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Crown className="w-4 h-4" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Title Fight</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{fight.event}</TableCell>
                      <TableCell>
                        <div className="w-8 text-center">
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-sm font-medium",
                              {
                                "bg-green-500/20 text-green-400":
                                  fight.result?.toLowerCase() === "w",
                                "bg-red-500/20 text-red-400":
                                  fight.result?.toLowerCase() === "l",
                                "bg-yellow-500/20 text-yellow-400":
                                  fight.result?.toLowerCase() === "d" ||
                                  fight.decision
                                    ?.toLowerCase()
                                    .includes("no contest"),
                              }
                            )}
                          >
                            {fight.result}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex-shrink-0">
                            {getMethodIcon(fight.decision)}
                          </div>
                          <span className="truncate">{fight.decision}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {fight.rnd && fight.time
                          ? `R${fight.rnd} ${fight.time}`
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700 col-span-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Medal className="h-5 w-5" />
            <CardTitle>Fighter Rankings</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p>Coming Soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
