import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TeammateFighter } from "@/types/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TeammatesListProps {
  teammates: TeammateFighter[];
  isLoading: boolean;
}

export const TeammatesList: React.FC<TeammatesListProps> = ({
  teammates,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!teammates?.length) {
    return <p className="text-gray-400">No teammates found</p>;
  }

  // Sort teammates by win count (descending)
  const sortedTeammates = [...teammates].sort((a, b) => {
    const getWins = (record: string) => {
      const wins = record.split("-")[0];
      return parseInt(wins) || 0;
    };
    return getWins(b.win_loss_record) - getWins(a.win_loss_record);
  });

  return (
    <ScrollArea className="h-[280px] -mx-6">
      <div className="grid grid-cols-2 gap-2 px-6">
        {sortedTeammates.map((teammate) => {
          const [wins, losses, draws] = teammate.win_loss_record.split("-");
          const hasGoodRecord = parseInt(wins) > parseInt(losses);

          return (
            <Link
              key={teammate.fighter_id}
              href={`/fighters/${teammate.fighter_id}`}
              className="block"
            >
              <Card
                className={cn(
                  "relative p-3",
                  "bg-gray-900 hover:bg-gray-800",
                  "border-gray-700/50",
                  "transition-colors"
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-gray-700">
                    <AvatarImage
                      src={teammate.image_url || undefined}
                      alt={`${teammate.first_name} ${teammate.last_name}`}
                    />
                    <AvatarFallback className="bg-gray-800">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-gray-100 truncate">
                      {teammate.first_name} {teammate.last_name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[11px] px-1.5 h-4",
                          hasGoodRecord
                            ? "bg-green-500/10 text-green-400"
                            : "bg-gray-800 text-gray-400"
                        )}
                      >
                        {teammate.win_loss_record}
                      </Badge>
                      {parseInt(wins) > 20 && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1 h-3.5 bg-yellow-500/10 text-yellow-400"
                        >
                          Veteran
                        </Badge>
                      )}
                      {parseInt(wins) > parseInt(losses) * 3 &&
                        parseInt(wins) > 5 && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1 h-3.5 bg-cyan-500/10 text-cyan-400"
                          >
                            Elite
                          </Badge>
                        )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
};
