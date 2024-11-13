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

export function MatchupModal({ matchup, isOpen, onClose }: MatchupModalProps) {
  const { detailedMatchup, isLoading, error } = useMatchupDetails(matchup);

  if (!matchup) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 text-white border-gray-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
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
              <div className="flex justify-between items-start gap-8">
                <div className="flex-1">
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24 border-2 border-gray-700">
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
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24 border-2 border-gray-700">
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
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="mt-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Advanced Statistics</h3>
                <p className="text-gray-400">
                  Advanced statistics and analysis will be shown here.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
