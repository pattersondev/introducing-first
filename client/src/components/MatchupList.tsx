import { Matchup } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { ProbabilityBar } from "./ProbabilityBar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";

interface MatchupListProps {
  matchups: Matchup[];
  eventDate: string;
  isLoading?: boolean;
}

export function MatchupList({
  matchups,
  eventDate,
  isLoading = false,
}: MatchupListProps) {
  const [votes, setVotes] = useState<Record<string, string>>({});

  const isEventInFuture = (date: string) => {
    return new Date(date) > new Date();
  };

  const handleVote = (matchupId: string, fighter: string) => {
    setVotes((prev) => ({
      ...prev,
      [matchupId]: fighter,
    }));
    // Here you would typically make an API call to save the vote
  };

  const calculateWinProbability = (
    fighter1: string,
    fighter2: string
  ): [number, number] => {
    const fighter1Prob = Math.random() * 0.4 + 0.3;
    const fighter2Prob = 1 - fighter1Prob;
    return [fighter1Prob, fighter2Prob];
  };

  const content = isLoading ? (
    <div className="space-y-4 px-6">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-1/4 bg-gray-700" />
              <Skeleton className="h-4 w-8 bg-gray-700" />
              <Skeleton className="h-6 w-1/4 bg-gray-700" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  ) : (
    <div className="space-y-4 px-6">
      {matchups.map((matchup, index) => {
        const [fighter1Prob, fighter2Prob] = calculateWinProbability(
          matchup.Fighter1,
          matchup.Fighter2
        );
        const userVote = votes[matchup.ID];

        return (
          <Card key={index} className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-12 w-12 border-2 border-gray-700">
                      <AvatarImage
                        src="/placeholder-fighter.png"
                        alt={matchup.Fighter1}
                      />
                      <AvatarFallback className="bg-gray-800">
                        {matchup.Fighter1.split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <p
                      className={`font-semibold ${
                        matchup.Winner === matchup.Fighter1
                          ? "text-green-400"
                          : "text-white"
                      }`}
                    >
                      {matchup.Fighter1}
                    </p>
                  </div>
                  {isEventInFuture(eventDate) && (
                    <>
                      <div className="mt-1">
                        <ProbabilityBar probability={fighter1Prob} />
                        <p className="text-xs text-gray-400 mt-1">
                          {(fighter1Prob * 100).toFixed(1)}%
                        </p>
                      </div>
                      <Button
                        variant={
                          userVote === matchup.Fighter1
                            ? "default"
                            : "secondary"
                        }
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => handleVote(matchup.ID, matchup.Fighter1)}
                      >
                        {userVote === matchup.Fighter1
                          ? "My Pick ✓"
                          : "Pick to Win"}
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex-1 text-center">
                  <p className="text-sm text-gray-400">vs</p>
                </div>
                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <p
                      className={`font-semibold ${
                        matchup.Winner === matchup.Fighter2
                          ? "text-green-400"
                          : "text-white"
                      }`}
                    >
                      {matchup.Fighter2}
                    </p>
                    <Avatar className="h-12 w-12 border-2 border-gray-700">
                      <AvatarImage
                        src="/placeholder-fighter.png"
                        alt={matchup.Fighter2}
                      />
                      <AvatarFallback className="bg-gray-800">
                        {matchup.Fighter2.split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {isEventInFuture(eventDate) && (
                    <>
                      <div className="mt-1">
                        <ProbabilityBar probability={fighter2Prob} />
                        <p className="text-xs text-gray-400 mt-1">
                          {(fighter2Prob * 100).toFixed(1)}%
                        </p>
                      </div>
                      <Button
                        variant={
                          userVote === matchup.Fighter2
                            ? "default"
                            : "secondary"
                        }
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => handleVote(matchup.ID, matchup.Fighter2)}
                      >
                        {userVote === matchup.Fighter2
                          ? "My Pick ✓"
                          : "Pick to Win"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {!isEventInFuture(eventDate) && (
                <p className="text-sm text-gray-400 mt-2">
                  Result: {matchup.Result}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <ScrollArea className="h-[calc(100vh-320px)] min-h-[480px]">
      <div className="pb-6">{content}</div>
    </ScrollArea>
  );
}
