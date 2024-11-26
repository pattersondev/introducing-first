import { useMatchupDetails } from "@/hooks/useMatchupDetails";
import { Matchup } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ProbabilityBar } from "./ProbabilityBar";
import { RecentFights } from "./RecentFights";
import { getCountryCode } from "@/utils/country-codes";
import Link from "next/link";
import { useFighterAnalytics } from "@/hooks/useFighterAnalytics";
import { StyleComparison } from "./analytics/StyleComparison";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "./ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FighterStatsProps {
  name: string;
  fighter_id: string;
  country?: string;
  record?: string;
  reach?: string;
  stance?: string;
  age?: number;
}

function FighterStats({
  name,
  fighter_id,
  country,
  record,
  reach,
  stance,
  age,
}: FighterStatsProps) {
  return (
    <div className="w-full space-y-2 mt-4">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Link
          href={`/fighters/${fighter_id}`}
          className="font-semibold text-lg hover:text-blue-300 hover:underline"
        >
          {name}
        </Link>
        {country && (
          <img
            src={`https://flagcdn.com/16x12/${getCountryCode(country)}.png`}
            alt={country}
            className="w-4 h-3"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-gray-800 p-2 rounded">
          <span className="text-gray-400">Record:</span>{" "}
          <span className="text-white">{record || "N/A"}</span>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <span className="text-gray-400">Reach:</span>{" "}
          <span className="text-white">{reach || "N/A"}</span>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <span className="text-gray-400">Stance:</span>{" "}
          <span className="text-white capitalize">{stance || "N/A"}</span>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <span className="text-gray-400">Age:</span>{" "}
          <span className="text-white">{age || "N/A"}</span>
        </div>
      </div>
    </div>
  );
}

interface MatchupModalProps {
  matchup: Matchup | null;
  isOpen: boolean;
  onClose: () => void;
}

function TrendIndicator({ value }: { value: number }) {
  if (value > 0) {
    return <ArrowUpIcon className="w-4 h-4 text-green-500" />;
  } else if (value < 0) {
    return <ArrowDownIcon className="w-4 h-4 text-red-500" />;
  }
  return <MinusIcon className="w-4 h-4 text-gray-500" />;
}

export function MatchupModal({ matchup, isOpen, onClose }: MatchupModalProps) {
  const { detailedMatchup, isLoading, error } = useMatchupDetails(matchup);

  const { data: fighter1Analytics, isLoading: isLoadingAnalytics1 } =
    useFighterAnalytics(matchup?.fighter1_id ?? "", {
      enabled: isOpen && !!matchup?.fighter1_id,
    });

  const { data: fighter2Analytics, isLoading: isLoadingAnalytics2 } =
    useFighterAnalytics(matchup?.fighter2_id ?? "", {
      enabled: isOpen && !!matchup?.fighter2_id,
    });

  if (!matchup) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 text-white border-gray-800 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            {matchup.fighter1_name} vs {matchup.fighter2_name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        ) : error ? (
          <div className="text-red-400 p-4 text-center">{error}</div>
        ) : (
          <Tabs defaultValue="standard" className="mt-4">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger value="standard">Standard</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="standard" className="mt-4">
              <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
                <div className="flex-1 w-full md:w-auto">
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-20 w-20 md:h-24 md:w-24 border-2 border-gray-700">
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
                    <FighterStats
                      name={matchup.fighter1_name}
                      fighter_id={matchup.fighter1_id}
                      country={detailedMatchup?.fighter1_country}
                      record={detailedMatchup?.fighter1_record}
                      reach={detailedMatchup?.fighter1_reach}
                      stance={detailedMatchup?.fighter1_stance}
                      age={detailedMatchup?.fighter1_age}
                    />
                    <ProbabilityBar probability={0.5} />
                    <RecentFights
                      fights={detailedMatchup?.fighter1_recent_fights}
                      key={`fighter1-${detailedMatchup?.fighter1_id}`}
                    />
                  </div>
                </div>

                <div className="flex-1 w-full md:w-auto">
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-20 w-20 md:h-24 md:w-24 border-2 border-gray-700">
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
                    <FighterStats
                      name={matchup.fighter2_name}
                      fighter_id={matchup.fighter2_id}
                      country={detailedMatchup?.fighter2_country}
                      record={detailedMatchup?.fighter2_record}
                      reach={detailedMatchup?.fighter2_reach}
                      stance={detailedMatchup?.fighter2_stance}
                      age={detailedMatchup?.fighter2_age}
                    />
                    <ProbabilityBar probability={0.5} />
                    <RecentFights
                      fights={detailedMatchup?.fighter2_recent_fights}
                      key={`fighter2-${detailedMatchup?.fighter2_id}`}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="mt-4">
              {isLoadingAnalytics1 || isLoadingAnalytics2 ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                </div>
              ) : fighter1Analytics && fighter2Analytics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div className="flex flex-col items-center gap-4">
                        <Avatar className="h-20 w-20 md:h-24 md:w-24 border-2 border-gray-700">
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
                        <div className="text-lg font-semibold text-center text-blue-400">
                          {matchup.fighter1_name}
                        </div>
                      </div>

                      <Card className="bg-gray-800 border-gray-700">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold text-white">
                              Style Analysis
                            </CardTitle>
                            <Badge
                              variant="outline"
                              className="bg-gray-700 text-blue-400 border-blue-400"
                            >
                              {fighter1Analytics.styleAnalysis.primaryStyle}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Striking</span>
                              <span className="text-white">
                                {(
                                  fighter1Analytics.styleAnalysis
                                    .strikePercentage * 100
                                ).toFixed(1)}
                                %
                              </span>
                            </div>
                            <Progress
                              value={
                                fighter1Analytics.styleAnalysis
                                  .strikePercentage * 100
                              }
                              className="text-blue-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Wrestling</span>
                              <span className="text-white">
                                {(
                                  fighter1Analytics.styleAnalysis
                                    .wrestlingPercentage * 100
                                ).toFixed(1)}
                                %
                              </span>
                            </div>
                            <Progress
                              value={
                                fighter1Analytics.styleAnalysis
                                  .wrestlingPercentage * 100
                              }
                              className="text-blue-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Grappling</span>
                              <span className="text-white">
                                {(
                                  fighter1Analytics.styleAnalysis
                                    .grapplingPercentage * 100
                                ).toFixed(1)}
                                %
                              </span>
                            </div>
                            <Progress
                              value={
                                fighter1Analytics.styleAnalysis
                                  .grapplingPercentage * 100
                              }
                              className="text-blue-500"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gray-800 border-gray-700">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold text-white">
                              Career Metrics
                            </CardTitle>
                            <Badge
                              variant="outline"
                              className={cn(
                                "bg-gray-700 border-blue-400",
                                fighter1Analytics.careerPhases.peakPerformance
                                  .currentPhase === "Peak"
                                  ? "text-green-400 border-green-400"
                                  : fighter1Analytics.careerPhases
                                      .peakPerformance.currentPhase ===
                                    "Declining"
                                  ? "text-yellow-400 border-yellow-400"
                                  : fighter1Analytics.careerPhases
                                      .peakPerformance.currentPhase ===
                                    "Veteran"
                                  ? "text-red-400 border-red-400"
                                  : "text-blue-400"
                              )}
                            >
                              {
                                fighter1Analytics.careerPhases.peakPerformance
                                  .currentPhase
                              }
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="text-sm text-gray-400">
                                Win Rate
                              </div>
                              <div className="text-2xl font-bold text-white">
                                {fighter1Analytics.styleAnalysis.winRate}%
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-sm text-gray-400">
                                Finish Rate
                              </div>
                              <div className="text-2xl font-bold text-white">
                                {fighter1Analytics.careerPhases.careerTrajectory.performanceMetrics.finishRate.toFixed(
                                  1
                                )}
                                %
                              </div>
                            </div>
                          </div>
                          <Separator className="my-4 bg-gray-700" />
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-400">
                                Strike Accuracy Trend
                              </span>
                              <div className="flex items-center gap-2">
                                <TrendIndicator
                                  value={
                                    fighter1Analytics.careerPhases
                                      .careerTrajectory.performanceMetrics
                                      .strikeAccuracyTrend
                                  }
                                />
                                <span className="text-white">
                                  {Math.abs(
                                    fighter1Analytics.careerPhases
                                      .careerTrajectory.performanceMetrics
                                      .strikeAccuracyTrend
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-400">
                                Takedown Accuracy Trend
                              </span>
                              <div className="flex items-center gap-2">
                                <TrendIndicator
                                  value={
                                    fighter1Analytics.careerPhases
                                      .careerTrajectory.performanceMetrics
                                      .takedownAccuracyTrend
                                  }
                                />
                                <span className="text-white">
                                  {Math.abs(
                                    fighter1Analytics.careerPhases
                                      .careerTrajectory.performanceMetrics
                                      .takedownAccuracyTrend
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-6">
                      <div className="flex flex-col items-center gap-4">
                        <Avatar className="h-20 w-20 md:h-24 md:w-24 border-2 border-gray-700">
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
                        <div className="text-lg font-semibold text-center text-red-400">
                          {matchup.fighter2_name}
                        </div>
                      </div>

                      <Card className="bg-gray-800 border-gray-700">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold text-white">
                              Style Analysis
                            </CardTitle>
                            <Badge
                              variant="outline"
                              className="bg-gray-700 text-red-400 border-red-400"
                            >
                              {fighter2Analytics.styleAnalysis.primaryStyle}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Striking</span>
                              <span className="text-white">
                                {(
                                  fighter2Analytics.styleAnalysis
                                    .strikePercentage * 100
                                ).toFixed(1)}
                                %
                              </span>
                            </div>
                            <Progress
                              value={
                                fighter2Analytics.styleAnalysis
                                  .strikePercentage * 100
                              }
                              className="text-red-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Wrestling</span>
                              <span className="text-white">
                                {(
                                  fighter2Analytics.styleAnalysis
                                    .wrestlingPercentage * 100
                                ).toFixed(1)}
                                %
                              </span>
                            </div>
                            <Progress
                              value={
                                fighter2Analytics.styleAnalysis
                                  .wrestlingPercentage * 100
                              }
                              className="text-red-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Grappling</span>
                              <span className="text-white">
                                {(
                                  fighter2Analytics.styleAnalysis
                                    .grapplingPercentage * 100
                                ).toFixed(1)}
                                %
                              </span>
                            </div>
                            <Progress
                              value={
                                fighter2Analytics.styleAnalysis
                                  .grapplingPercentage * 100
                              }
                              className="text-red-500"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gray-800 border-gray-700">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold text-white">
                              Career Metrics
                            </CardTitle>
                            <Badge
                              variant="outline"
                              className={cn(
                                "bg-gray-700 border-red-400",
                                fighter2Analytics.careerPhases.peakPerformance
                                  .currentPhase === "Peak"
                                  ? "text-green-400 border-green-400"
                                  : fighter2Analytics.careerPhases
                                      .peakPerformance.currentPhase ===
                                    "Declining"
                                  ? "text-yellow-400 border-yellow-400"
                                  : fighter2Analytics.careerPhases
                                      .peakPerformance.currentPhase ===
                                    "Veteran"
                                  ? "text-red-400 border-red-400"
                                  : "text-blue-400"
                              )}
                            >
                              {
                                fighter2Analytics.careerPhases.peakPerformance
                                  .currentPhase
                              }
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="text-sm text-gray-400">
                                Win Rate
                              </div>
                              <div className="text-2xl font-bold text-white">
                                {fighter2Analytics.styleAnalysis.winRate}%
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-sm text-gray-400">
                                Finish Rate
                              </div>
                              <div className="text-2xl font-bold text-white">
                                {fighter2Analytics.careerPhases.careerTrajectory.performanceMetrics.finishRate.toFixed(
                                  1
                                )}
                                %
                              </div>
                            </div>
                          </div>
                          <Separator className="my-4 bg-gray-700" />
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-400">
                                Strike Accuracy Trend
                              </span>
                              <div className="flex items-center gap-2">
                                <TrendIndicator
                                  value={
                                    fighter2Analytics.careerPhases
                                      .careerTrajectory.performanceMetrics
                                      .strikeAccuracyTrend
                                  }
                                />
                                <span className="text-white">
                                  {Math.abs(
                                    fighter2Analytics.careerPhases
                                      .careerTrajectory.performanceMetrics
                                      .strikeAccuracyTrend
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-400">
                                Takedown Accuracy Trend
                              </span>
                              <div className="flex items-center gap-2">
                                <TrendIndicator
                                  value={
                                    fighter2Analytics.careerPhases
                                      .careerTrajectory.performanceMetrics
                                      .takedownAccuracyTrend
                                  }
                                />
                                <span className="text-white">
                                  {Math.abs(
                                    fighter2Analytics.careerPhases
                                      .careerTrajectory.performanceMetrics
                                      .takedownAccuracyTrend
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-red-400 p-4 text-center">
                  Failed to load analytics data
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
