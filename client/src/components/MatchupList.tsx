import { Matchup } from "@/types/api";
import { Card, CardContent } from "@/components/ui/card";
import { ProbabilityBar } from "./ProbabilityBar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import {
  parseResult,
  getResultIcon,
  getResultColor,
} from "@/utils/fight-utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { MatchupModal } from "./MatchupModal";
import { MatchupPick } from "./MatchupPick";
import { useAuth } from "@/contexts/AuthContext";
import { PicksService } from "@/services/picks-service";
import { Pick } from "@/types/api";

interface MatchupListProps {
  matchups: Matchup[];
  eventDate: string;
  eventId: string;
  isLoading?: boolean;
}

function FighterStats({
  record,
  age,
  stance,
}: {
  record?: string;
  age?: number;
  stance?: string;
}) {
  return (
    <div className="flex gap-2 justify-center text-xs text-gray-400">
      {record && <span>{record}</span>}
      {age && <span>• {age} years</span>}
      {stance && <span>• {stance}</span>}
    </div>
  );
}

function ResultDisplay({ result }: { result: string }) {
  const parsedResult = parseResult(result);
  const IconComponent = parsedResult.method
    ? getResultIcon(parsedResult.method)
    : null;
  const colorClass = getResultColor(parsedResult.method);

  return (
    <div className="flex items-center gap-2 mt-4 justify-center border-t border-gray-700 pt-4">
      {IconComponent && (
        <div className={cn("flex items-center gap-2", colorClass)}>
          <IconComponent className="w-5 h-5" />
          <span className="font-medium">{parsedResult.details}</span>
          {parsedResult.round && (
            <span className="text-gray-400 text-sm">
              (R{parsedResult.round}, {parsedResult.time})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function CardTypeHeader({ cardType }: { cardType: string }) {
  return (
    <div className="relative py-4">
      <div className="absolute inset-0 flex items-center px-2 sm:px-6">
        <div className="w-full border-t border-gray-700"></div>
      </div>
      <div className="relative flex justify-center">
        <span className="bg-gray-900 px-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
          {cardType}
        </span>
      </div>
    </div>
  );
}

export function MatchupList({
  matchups = [],
  eventDate = new Date().toISOString(),
  eventId,
  isLoading = false,
}: MatchupListProps) {
  const [selectedMatchup, setSelectedMatchup] = useState<Matchup | null>(null);
  const [userPicks, setUserPicks] = useState<Pick[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserPicks = async () => {
      if (user?.id && eventId) {
        try {
          const picks = await PicksService.getPicksForUserAndEvent(
            parseInt(user.id),
            eventId
          );
          setUserPicks(picks);
        } catch (error) {
          console.error("Error fetching user picks:", error);
        }
      }
    };

    fetchUserPicks();
  }, [user?.id, eventId]);

  const cardTypeOrder = ["Main Card", "Prelims", "Early Prelims"];

  const sortedMatchups = matchups
    ? [...matchups].sort((a, b) => a.display_order - b.display_order)
    : [];

  const matchupsByCardType = sortedMatchups.reduce<Record<string, Matchup[]>>(
    (acc, matchup) => {
      const cardType = matchup.card_type || "Uncategorized";
      if (!acc[cardType]) {
        acc[cardType] = [];
      }
      acc[cardType].push(matchup);
      return acc;
    },
    {}
  );

  const getCardTypeOrder = (cardType: string): number => {
    const exactMatch = cardTypeOrder.indexOf(cardType);
    return exactMatch >= 0 ? exactMatch : cardTypeOrder.length;
  };

  const orderedGroups = Object.entries(matchupsByCardType)
    .map(([cardType, fights]) => ({
      type: cardType,
      matchups: fights,
      order: getCardTypeOrder(cardType),
    }))
    .sort((a, b) => a.order - b.order);

  const isEventInFuture = (date: string) => {
    if (!date) return true;
    try {
      return new Date(date) > new Date();
    } catch (e) {
      console.error("Invalid date:", date);
      return true;
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-320px)] min-h-[480px]">
      <div className="pb-6">
        <div className="space-y-2">
          {orderedGroups.map((group, groupIndex) => (
            <div key={group.type + groupIndex}>
              <CardTypeHeader cardType={group.type} />
              <div className="space-y-4 px-2 sm:px-6">
                {group.matchups.map((matchup) => {
                  const fighter1Pick = userPicks?.find(
                    (pick) =>
                      pick.matchup_id === matchup.matchup_id &&
                      pick.selection_fighter_id === matchup.fighter1_id
                  );
                  const fighter2Pick = userPicks?.find(
                    (pick) =>
                      pick.matchup_id === matchup.matchup_id &&
                      pick.selection_fighter_id === matchup.fighter2_id
                  );

                  console.log(matchup.fighter1_name, matchup.card_type);

                  return (
                    <Card
                      key={matchup.matchup_id}
                      className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest("button, a")) {
                          setSelectedMatchup(matchup);
                        }
                      }}
                    >
                      <CardContent className="p-2 sm:p-4">
                        <div className="flex justify-between items-start sm:items-center gap-1 sm:gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                              <div className="relative">
                                <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-2 border-gray-700 shrink-0">
                                  {matchup.fighter1_image ? (
                                    <AvatarImage
                                      src={matchup.fighter1_image}
                                      alt={matchup.fighter1_name}
                                      className="object-cover object-center"
                                    />
                                  ) : (
                                    <AvatarFallback className="bg-gray-800 text-xs sm:text-base">
                                      {matchup.fighter1_name
                                        ?.split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                {typeof matchup.fighter1_rank === "number" && (
                                  <div
                                    className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-xs font-medium ${
                                      matchup.fighter1_rank === 0
                                        ? "text-yellow-400"
                                        : matchup.fighter1_rank <= 5
                                        ? "text-red-400"
                                        : "text-cyan-400"
                                    }`}
                                  >
                                    {matchup.fighter1_rank === 0
                                      ? "C"
                                      : `#${matchup.fighter1_rank}`}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-center sm:items-start">
                                <Link
                                  href={`/fighters/${matchup.fighter1_id}`}
                                  className={`font-semibold hover:text-blue-400 text-sm sm:text-base text-center sm:text-left ${
                                    matchup.winner === matchup.fighter1_name
                                      ? "text-green-400"
                                      : "text-white"
                                  }`}
                                >
                                  {matchup.fighter1_name}
                                </Link>
                                <FighterStats
                                  record={matchup.fighter1_record}
                                  age={matchup.fighter1_age}
                                  stance={matchup.fighter1_stance}
                                />
                              </div>
                            </div>
                            {isEventInFuture(eventDate) && (
                              <MatchupPick
                                matchupId={matchup.matchup_id}
                                eventId={eventId}
                                fighterName={matchup.fighter1_name}
                                fighterId={matchup.fighter1_id}
                                probability={
                                  matchup.prediction?.fighter1_win_probability
                                }
                                isSelected={!!fighter1Pick}
                                onPickSubmitted={() => {
                                  if (user?.id) {
                                    PicksService.getPicksForUserAndEvent(
                                      parseInt(user.id),
                                      eventId
                                    )
                                      .then((picks) => setUserPicks(picks))
                                      .catch((error) =>
                                        console.error(
                                          "Error refreshing picks:",
                                          error
                                        )
                                      );
                                  }
                                }}
                              />
                            )}
                          </div>

                          <div className="flex-shrink-0 px-1 sm:px-4 mt-4 sm:mt-0 self-center">
                            <p className="text-xs sm:text-sm text-gray-400">
                              vs
                            </p>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row items-center justify-end gap-1 sm:gap-2">
                              <div className="flex flex-col items-center sm:items-end order-2 sm:order-1">
                                <Link
                                  href={`/fighters/${matchup.fighter2_id}`}
                                  className={`font-semibold hover:text-blue-400 text-sm sm:text-base text-center sm:text-right ${
                                    matchup.winner === matchup.fighter2_name
                                      ? "text-green-400"
                                      : "text-white"
                                  }`}
                                >
                                  {matchup.fighter2_name}
                                </Link>
                                <FighterStats
                                  record={matchup.fighter2_record}
                                  age={matchup.fighter2_age}
                                  stance={matchup.fighter2_stance}
                                />
                              </div>
                              <div className="relative order-1 sm:order-2">
                                <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-2 border-gray-700 shrink-0">
                                  {matchup.fighter2_image ? (
                                    <AvatarImage
                                      src={matchup.fighter2_image}
                                      alt={matchup.fighter2_name}
                                      className="object-cover object-center"
                                    />
                                  ) : (
                                    <AvatarFallback className="bg-gray-800 text-xs sm:text-base">
                                      {matchup.fighter2_name
                                        ?.split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                {typeof matchup.fighter2_rank === "number" && (
                                  <div
                                    className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-xs font-medium ${
                                      matchup.fighter2_rank === 0
                                        ? "text-yellow-400"
                                        : matchup.fighter2_rank <= 5
                                        ? "text-red-400"
                                        : "text-cyan-400"
                                    }`}
                                  >
                                    {matchup.fighter2_rank === 0
                                      ? "C"
                                      : `#${matchup.fighter2_rank}`}
                                  </div>
                                )}
                              </div>
                            </div>
                            {isEventInFuture(eventDate) && (
                              <MatchupPick
                                matchupId={matchup.matchup_id}
                                eventId={eventId}
                                fighterName={matchup.fighter2_name}
                                fighterId={matchup.fighter2_id}
                                probability={
                                  matchup.prediction?.fighter2_win_probability
                                }
                                isSelected={!!fighter2Pick}
                                onPickSubmitted={() => {
                                  if (user?.id) {
                                    PicksService.getPicksForUserAndEvent(
                                      parseInt(user.id),
                                      eventId
                                    )
                                      .then((picks) => setUserPicks(picks))
                                      .catch((error) =>
                                        console.error(
                                          "Error refreshing picks:",
                                          error
                                        )
                                      );
                                  }
                                }}
                              />
                            )}
                          </div>
                        </div>
                        {!isEventInFuture(eventDate) && matchup.result && (
                          <ResultDisplay result={matchup.result} />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <MatchupModal
        matchup={selectedMatchup}
        isOpen={!!selectedMatchup}
        onClose={() => setSelectedMatchup(null)}
      />
    </ScrollArea>
  );
}
