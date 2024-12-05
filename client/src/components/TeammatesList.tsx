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
    return <p className="text-muted-foreground">No teammates found</p>;
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
      <div className="grid grid-cols-1 gap-3 px-6">
        {sortedTeammates.map((teammate) => {
          const [wins, losses, draws] = teammate.win_loss_record.split("-");
          const hasGoodRecord = parseInt(wins) > parseInt(losses);

          return (
            <Link
              key={teammate.fighter_id}
              href={`/fighters/${teammate.fighter_id}`}
              className="block"
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                <Card
                  className={cn(
                    "relative p-4 transition-all duration-200",
                    "bg-card/40 hover:bg-card/60",
                    "border border-border/50",
                    "hover:border-border/80",
                    "hover:shadow-lg hover:shadow-primary/5",
                    "hover:-translate-y-0.5"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
                      <AvatarImage
                        src={teammate.image_url || undefined}
                        alt={`${teammate.first_name} ${teammate.last_name}`}
                      />
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm text-foreground truncate">
                          {teammate.first_name} {teammate.last_name}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <Badge
                          variant={hasGoodRecord ? "default" : "secondary"}
                          className="text-[11px] h-5"
                        >
                          {teammate.win_loss_record}
                        </Badge>
                        {parseInt(wins) > 20 && (
                          <Badge
                            variant="outline"
                            className="text-[11px] h-5 border-yellow-500/50 text-yellow-500"
                          >
                            Veteran
                          </Badge>
                        )}
                        {parseInt(wins) > parseInt(losses) * 3 &&
                          parseInt(wins) > 5 && (
                            <Badge
                              variant="outline"
                              className="text-[11px] h-5 border-green-500/50 text-green-500"
                            >
                              Elite
                            </Badge>
                          )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
};
