"use client";

import { useEffect, useState } from "react";
import { FighterService } from "@/services/fighter-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Fighter } from "@/types/api";

interface GroupedFighters {
  [weightClass: string]: Fighter[];
}

export default function StandingsPage() {
  const [groupedFighters, setGroupedFighters] = useState<GroupedFighters>({});
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFighters = async () => {
      try {
        const response = await FighterService.getFightersByRank();
        const fighters = response.data || [];

        // Group fighters by weight class
        const grouped = fighters.reduce<GroupedFighters>((acc, fighter) => {
          if (fighter.weight_class) {
            if (!acc[fighter.weight_class]) {
              acc[fighter.weight_class] = [];
            }
            acc[fighter.weight_class].push(fighter);
          }
          return acc;
        }, {});

        setGroupedFighters(grouped);
        // Set first weight class as default selected
        if (Object.keys(grouped).length > 0) {
          setSelectedClass(Object.keys(grouped)[0]);
        }
      } catch (error) {
        console.error("Error fetching rankings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFighters();
  }, []);

  const renderFighterCard = (fighter: Fighter) => (
    <Link href={`/fighters/${fighter.fighter_id}`} key={fighter.fighter_id}>
      <Card className="hover:bg-accent transition-colors duration-200">
        <CardContent className="flex items-center p-4 gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Avatar className="h-12 w-12 border-2 border-primary">
              <AvatarImage
                src={fighter.image_url}
                alt={`${fighter.first_name} ${fighter.last_name}`}
              />
              <AvatarFallback className="bg-muted">
                {`${fighter.first_name[0]}${fighter.last_name[0]}`}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">
                {fighter.first_name} {fighter.last_name}
              </p>
              {fighter.nickname && (
                <p className="text-sm text-muted-foreground">
                  "{fighter.nickname}"
                </p>
              )}
            </div>
          </div>
          <div className="text-2xl font-bold text-primary">
            {fighter.current_promotion_rank === 0
              ? "C"
              : `#${fighter.current_promotion_rank}`}
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-8 w-32" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">
            UFC Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={selectedClass}
            onValueChange={setSelectedClass}
            className="space-y-4"
          >
            <TabsList className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {Object.keys(groupedFighters).map((weightClass) => (
                <TabsTrigger
                  key={weightClass}
                  value={weightClass}
                  className="data-[state=active]:bg-primary"
                >
                  {weightClass}
                </TabsTrigger>
              ))}
            </TabsList>
            {Object.entries(groupedFighters).map(([weightClass, fighters]) => (
              <TabsContent
                key={weightClass}
                value={weightClass}
                className="space-y-4 min-h-[400px]"
              >
                {fighters
                  .sort(
                    (a, b) =>
                      (a.current_promotion_rank || 999) -
                      (b.current_promotion_rank || 999)
                  )
                  .map(renderFighterCard)}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
