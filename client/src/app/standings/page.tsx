"use client";

import { useEffect, useState } from "react";
import { FighterService } from "@/services/fighter-service";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <Card className="bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors">
        <CardContent className="flex items-center p-4 gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-2 border-gray-700">
              <AvatarImage
                src={fighter.image_url}
                alt={`${fighter.first_name} ${fighter.last_name}`}
                className="object-cover object-center"
              />
              <AvatarFallback className="bg-gray-800 text-xs sm:text-base">
                {`${fighter.first_name[0]}${fighter.last_name[0]}`}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-white text-sm sm:text-base">
                {fighter.first_name} {fighter.last_name}
              </p>
              {fighter.nickname && (
                <p className="text-sm text-gray-400">"{fighter.nickname}"</p>
              )}
              <div className="flex flex-col gap-1 text-xs text-gray-400 mt-1">
                <div className="flex gap-2">
                  {fighter.win_loss_record && (
                    <span className="font-medium">
                      {fighter.win_loss_record}
                    </span>
                  )}
                  {fighter.weight && <span>• {fighter.weight}lbs</span>}
                </div>
                <div className="flex gap-2">
                  {fighter.tko_record && <span>TKO: {fighter.tko_record}</span>}
                  {fighter.sub_record && (
                    <span>• SUB: {fighter.sub_record}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-400">
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
      <div className="h-full bg-gray-950 text-white p-4 lg:p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold mb-6">UFC Rankings</h1>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full bg-gray-700" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-950 text-white p-4 lg:p-6">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">UFC Rankings</h1>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="space-y-6">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full sm:w-[300px] bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Select weight class" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {Object.keys(groupedFighters).map((weightClass) => (
                    <SelectItem
                      key={weightClass}
                      value={weightClass}
                      className="hover:bg-gray-700 focus:bg-gray-700"
                    >
                      {weightClass}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-2 pr-4">
                  {selectedClass &&
                    groupedFighters[selectedClass]
                      .sort((a, b) => {
                        if (a.current_promotion_rank === 0) return -1;
                        if (b.current_promotion_rank === 0) return 1;
                        return (
                          (a.current_promotion_rank || 999) -
                          (b.current_promotion_rank || 999)
                        );
                      })
                      .map(renderFighterCard)}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
