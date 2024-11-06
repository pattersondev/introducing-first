"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeaderboardUser {
  id: number;
  username: string;
  correctPicks: number;
  totalPicks: number;
  winPercentage: number;
  avatarUrl?: string;
}

const mockLeaderboardData: LeaderboardUser[] = [
  {
    id: 1,
    username: "FightGuru",
    correctPicks: 145,
    totalPicks: 180,
    winPercentage: 80.56,
  },
  {
    id: 2,
    username: "MMAProphet",
    correctPicks: 138,
    totalPicks: 175,
    winPercentage: 78.86,
  },
  {
    id: 3,
    username: "OctagonOracle",
    correctPicks: 132,
    totalPicks: 170,
    winPercentage: 77.65,
  },
  {
    id: 4,
    username: "PredictionKing",
    correctPicks: 128,
    totalPicks: 168,
    winPercentage: 76.19,
  },
  {
    id: 5,
    username: "FightScientist",
    correctPicks: 125,
    totalPicks: 165,
    winPercentage: 75.76,
  },
  {
    id: 6,
    username: "BettingBoss",
    correctPicks: 120,
    totalPicks: 160,
    winPercentage: 75.0,
  },
  {
    id: 7,
    username: "PickMaster",
    correctPicks: 118,
    totalPicks: 158,
    winPercentage: 74.68,
  },
  {
    id: 8,
    username: "CageCaller",
    correctPicks: 115,
    totalPicks: 155,
    winPercentage: 74.19,
  },
  {
    id: 9,
    username: "StrikeScore",
    correctPicks: 112,
    totalPicks: 152,
    winPercentage: 73.68,
  },
  {
    id: 10,
    username: "MatMaster",
    correctPicks: 110,
    totalPicks: 150,
    winPercentage: 73.33,
  },
];

export function LeaderboardPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const getPodiumColor = (position: number) => {
    switch (position) {
      case 0:
        return "bg-yellow-500/20 border-yellow-500";
      case 1:
        return "bg-gray-400/20 border-gray-400";
      case 2:
        return "bg-amber-700/20 border-amber-700";
      default:
        return "bg-gray-800 border-gray-700";
    }
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Trophy className="h-8 w-8 text-yellow-500" />;
      case 1:
        return <Medal className="h-8 w-8 text-gray-400" />;
      case 2:
        return <Medal className="h-8 w-8 text-amber-700" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <div className="flex-1 p-2 sm:p-4 overflow-hidden">
        <div className="container mx-auto py-4 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-8 text-white">
            Glove Knowers
          </h1>

          {/* Podium Section */}
          <div className="flex justify-center items-end gap-2 sm:gap-4 mb-6 sm:mb-12 h-[150px] sm:h-[200px] mt-4 sm:mt-0">
            {mockLeaderboardData.slice(0, 3).map((user, index) => (
              <div
                key={user.id}
                className={`flex flex-col items-center ${
                  index === 0 ? "order-2" : index === 1 ? "order-1" : "order-3"
                }`}
              >
                <Card
                  className={`w-[120px] sm:w-[200px] border-2 ${getPodiumColor(
                    index
                  )}`}
                >
                  <CardContent className="p-2 sm:p-4 text-center">
                    {getPositionIcon(index)}
                    <h3 className="font-bold text-sm sm:text-lg mt-1 sm:mt-2 truncate">
                      {user.username}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400">
                      {user.correctPicks} picks
                    </p>
                    <p className="text-xs sm:text-sm text-gray-400">
                      {user.winPercentage.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
                <div
                  className={`w-full bg-gray-800 ${
                    index === 0
                      ? "h-16 sm:h-24"
                      : index === 1
                      ? "h-12 sm:h-16"
                      : "h-6 sm:h-8"
                  }`}
                ></div>
              </div>
            ))}
          </div>

          {/* Leaderboard List */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="p-4">
              <CardTitle className="text-white text-lg sm:text-xl">
                Full Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-350px)] sm:h-[calc(100vh-450px)] min-h-[300px] sm:min-h-[400px]">
                <div className="space-y-2 p-2 sm:p-4">
                  {mockLeaderboardData.slice(3).map((user, index) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 sm:p-4 bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-2 sm:gap-4">
                        <span className="text-gray-400 w-6 sm:w-8">
                          {index + 4}
                        </span>
                        <span className="font-semibold text-sm sm:text-base">
                          {user.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-6">
                        <div className="text-right">
                          <p className="text-xs sm:text-sm text-gray-400">
                            Correct Picks
                          </p>
                          <p className="font-semibold text-sm sm:text-base">
                            {user.correctPicks}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs sm:text-sm text-gray-400">
                            Accuracy
                          </p>
                          <p className="font-semibold text-sm sm:text-base">
                            {user.winPercentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
