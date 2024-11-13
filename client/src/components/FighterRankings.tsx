"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import Link from "next/link";
import { useRankings } from "@/hooks/useRankings";
import { Skeleton } from "@/components/ui/skeleton";

export function FighterRankings() {
  const [selectedDivision, setSelectedDivision] = useState<string>("Men's");
  const [selectedWeightClassId, setSelectedWeightClassId] = useState<
    number | null
  >(null);

  const { weightClasses, rankings, loading, error } = useRankings(
    selectedWeightClassId
  );

  // Set default weight class when weight classes are loaded
  useEffect(() => {
    if (weightClasses.length > 0 && !selectedWeightClassId) {
      const lightweightClass = weightClasses.find(
        (wc) => wc.division === "Men's" && wc.name === "Lightweight"
      );
      if (lightweightClass) {
        setSelectedWeightClassId(lightweightClass.weight_class_id);
      }
    }
  }, [weightClasses, selectedWeightClassId]);

  const divisions = Array.from(new Set(weightClasses.map((wc) => wc.division)));
  const filteredWeightClasses = weightClasses.filter(
    (wc) => wc.division === selectedDivision
  );

  const handleDivisionChange = (division: string) => {
    setSelectedDivision(division);
    const firstWeightClassInDivision = weightClasses.find(
      (wc) => wc.division === division
    );
    if (firstWeightClassInDivision) {
      setSelectedWeightClassId(firstWeightClassInDivision.weight_class_id);
    }
  };

  const getRankingMovementIcon = (current: number, previous: number | null) => {
    if (!previous) return <Minus className="w-4 h-4 text-gray-400" />;
    if (current < previous)
      return <ArrowUp className="w-4 h-4 text-green-400" />;
    if (current > previous)
      return <ArrowDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const renderRankings = () => (
    <ScrollArea className="h-[calc(100vh-280px)]">
      <div className="space-y-4">
        {loading
          ? [...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full bg-gray-700" />
            ))
          : rankings.map((fighter) => (
              <Link
                href={`/fighters/${fighter.fighter_id}`}
                key={fighter.fighter_id}
              >
                <Card className="bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-gray-400 w-8">
                          {fighter.rank}
                        </div>
                        {getRankingMovementIcon(
                          fighter.rank,
                          fighter.previous_rank
                        )}
                      </div>
                      <Avatar className="h-12 w-12 border-2 border-gray-700">
                        <AvatarImage
                          src="/placeholder-fighter.png"
                          alt={`${fighter.first_name} ${fighter.last_name}`}
                        />
                        <AvatarFallback className="bg-gray-800">
                          {fighter.first_name[0]}
                          {fighter.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">
                          {fighter.first_name} {fighter.last_name}
                        </h3>
                        <p className="text-sm text-gray-400">
                          Record: {fighter.win_loss_record}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">Rating</div>
                        <div className="text-lg font-bold text-blue-400">
                          {typeof fighter.points === "number"
                            ? fighter.points.toFixed(0)
                            : parseFloat(fighter.points).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>
    </ScrollArea>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
      <div className="flex-1 p-4 lg:p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold mb-6">Fighter Rankings</h1>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Select
                    value={selectedDivision}
                    onValueChange={handleDivisionChange}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Select Division" />
                    </SelectTrigger>
                    <SelectContent>
                      {divisions.map((division) => (
                        <SelectItem key={division} value={division}>
                          {division}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedWeightClassId?.toString()}
                    onValueChange={(value) =>
                      setSelectedWeightClassId(parseInt(value))
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Select Weight Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredWeightClasses.map((weightClass) => (
                        <SelectItem
                          key={weightClass.weight_class_id}
                          value={weightClass.weight_class_id.toString()}
                        >
                          {weightClass.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Tabs defaultValue="analytics" className="w-full">
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="analytics">
                      Introducing First Rankings
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="analytics" className="mt-6">
                    {renderRankings()}
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
