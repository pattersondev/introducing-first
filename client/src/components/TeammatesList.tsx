import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { TeammateFighter } from "@/types/api";

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
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card">
              <CardContent className="p-4">
                <Skeleton className="aspect-square w-full rounded-lg mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!teammates.length) {
    return null;
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-6 w-6" />
        <h2 className="text-2xl font-bold text-foreground">Teammates</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {teammates.map((teammate) => (
          <Link
            key={teammate.fighter_id}
            href={`/fighter/${teammate.fighter_id}`}
            className="transition-transform hover:scale-105"
          >
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="aspect-square overflow-hidden rounded-lg mb-3">
                  <img
                    src={teammate.image_url || "/placeholder-fighter.png"}
                    alt={`${teammate.first_name} ${teammate.last_name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.src = "/placeholder-fighter.png";
                    }}
                  />
                </div>
                <h3 className="font-semibold text-foreground">
                  {teammate.first_name} {teammate.last_name}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {teammate.win_loss_record}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
