import { Matchup } from "@/types/api";
import { Card, CardContent } from "@/components/ui/card";
import { ProbabilityBar } from "./ProbabilityBar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import {
  parseResult,
  getResultIcon,
  getResultColor,
} from "@/utils/fight-utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { MatchupModal } from "./MatchupModal";

interface MatchupListProps {
  matchups: Matchup[];
  eventDate: string;
  isLoading?: boolean;
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

export function MatchupList({
  matchups,
  eventDate,
  isLoading = false,
}: MatchupListProps) {
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [selectedMatchup, setSelectedMatchup] = useState<Matchup | null>(null);

  const sortedMatchups = [...matchups].sort(
    (a, b) => a.display_order - b.display_order
  );

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

  const content = (
    <div className="space-y-4 px-6">
      {sortedMatchups.map((matchup) => {
        const [fighter1Prob, fighter2Prob] = calculateWinProbability(
          matchup.fighter1_name,
          matchup.fighter2_name
        );
        const userVote = votes[matchup.matchup_id];

        return (
          <Card
            key={matchup.matchup_id}
            className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
            onClick={() => setSelectedMatchup(matchup)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-16 w-16 border-2 border-gray-700">
                      {matchup.fighter1_image ? (
                        <AvatarImage
                          src={matchup.fighter1_image}
                          alt={matchup.fighter1_name}
                          className="object-cover object-center"
                        />
                      ) : (
                        <AvatarFallback className="bg-gray-800">
                          {matchup.fighter1_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <Link
                      href={`/fighters/${matchup.fighter1_id}`}
                      className={`font-semibold hover:text-blue-400 ${
                        matchup.winner === matchup.fighter1_name
                          ? "text-green-400"
                          : "text-white"
                      }`}
                    >
                      {matchup.fighter1_name}
                    </Link>
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
                          userVote === matchup.fighter1_name
                            ? "default"
                            : "secondary"
                        }
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() =>
                          handleVote(matchup.matchup_id, matchup.fighter1_name)
                        }
                      >
                        {userVote === matchup.fighter1_name
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
                    <Link
                      href={`/fighters/${matchup.fighter2_id}`}
                      className={`font-semibold hover:text-blue-400 ${
                        matchup.winner === matchup.fighter2_name
                          ? "text-green-400"
                          : "text-white"
                      }`}
                    >
                      {matchup.fighter2_name}
                    </Link>
                    <Avatar className="h-16 w-16 border-2 border-gray-700">
                      {matchup.fighter2_image ? (
                        <AvatarImage
                          src={matchup.fighter2_image}
                          alt={matchup.fighter2_name}
                          className="object-cover object-center"
                        />
                      ) : (
                        <AvatarFallback className="bg-gray-800">
                          {matchup.fighter2_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      )}
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
                          userVote === matchup.fighter2_name
                            ? "default"
                            : "secondary"
                        }
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() =>
                          handleVote(matchup.matchup_id, matchup.fighter2_name)
                        }
                      >
                        {userVote === matchup.fighter2_name
                          ? "My Pick ✓"
                          : "Pick to Win"}
                      </Button>
                    </>
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
  );

  return (
    <ScrollArea className="h-[calc(100vh-320px)] min-h-[480px]">
      <div className="pb-6">{content}</div>
      <MatchupModal
        matchup={selectedMatchup}
        isOpen={!!selectedMatchup}
        onClose={() => setSelectedMatchup(null)}
      />
    </ScrollArea>
  );
}
