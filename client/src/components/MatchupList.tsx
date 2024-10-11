import { Matchup } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { ProbabilityBar } from "./ProbabilityBar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const isEventInFuture = (date: string) => {
    return new Date(date) > new Date();
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
        return (
          <Card key={index} className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <p
                    className={`font-semibold ${
                      matchup.Winner === matchup.Fighter1
                        ? "text-green-400"
                        : "text-white"
                    }`}
                  >
                    {matchup.Fighter1}
                  </p>
                  {isEventInFuture(eventDate) && (
                    <div className="mt-1">
                      <ProbabilityBar probability={fighter1Prob} />
                      <p className="text-xs text-gray-400 mt-1">
                        {(fighter1Prob * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center">
                  <p className="text-sm text-gray-400">vs</p>
                </div>
                <div className="flex-1 text-right">
                  <p
                    className={`font-semibold ${
                      matchup.Winner === matchup.Fighter2
                        ? "text-green-400"
                        : "text-white"
                    }`}
                  >
                    {matchup.Fighter2}
                  </p>
                  {isEventInFuture(eventDate) && (
                    <div className="mt-1">
                      <ProbabilityBar probability={fighter2Prob} />
                      <p className="text-xs text-gray-400 mt-1">
                        {(fighter2Prob * 100).toFixed(1)}%
                      </p>
                    </div>
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
