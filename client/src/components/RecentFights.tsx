import { RecentFight } from "@/types/api";
import {
  Swords,
  Award,
  Timer,
  Handshake,
  Ban,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Fight {
  date: string;
  opponent: string;
  opponent_id?: string;
  result: string;
  decision: string;
  round: number;
}

interface RecentFightsProps {
  fights?: Fight[];
  //test
}

export function RecentFights({ fights }: RecentFightsProps) {
  const getMethodIcon = (decision: string) => {
    const methodLower = decision?.toLowerCase() || "";
    if (methodLower.includes("ko") || methodLower.includes("tko")) {
      return <Swords className="w-4 h-4 text-red-400" />;
    }
    if (methodLower.includes("submission") || methodLower.includes("sub")) {
      return <Award className="w-4 h-4 text-blue-400" />;
    }
    if (methodLower.includes("decision")) {
      return <Timer className="w-4 h-4 text-gray-400" />;
    }
    if (methodLower.includes("draw")) {
      return <Handshake className="w-4 h-4 text-yellow-400" />;
    }
    if (methodLower.includes("no contest")) {
      return <Ban className="w-4 h-4 text-yellow-400" />;
    }
    return <AlertCircle className="w-4 h-4 text-gray-400" />;
  };

  if (!fights || fights.length === 0) {
    return (
      <div className="w-full mt-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">
          Recent Fights
        </h4>
        <div className="text-sm text-gray-500">No recent fights found</div>
      </div>
    );
  }

  return (
    <div className="w-full mt-4">
      <h4 className="text-sm font-medium text-gray-400 mb-2">Recent Fights</h4>
      <div className="space-y-2">
        {fights.map((fight, index) => (
          <div
            key={`${fight.date}-${fight.opponent}-${index}`}
            className="bg-gray-800 p-2 rounded text-sm flex justify-between items-center"
          >
            <div className="flex-1">
              {fight.opponent_id ? (
                <Link
                  href={`/fighters/${fight.opponent_id}`}
                  className="font-medium text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {fight.opponent}
                </Link>
              ) : (
                <div className="font-medium">{fight.opponent}</div>
              )}
              <div className="text-xs text-gray-400">
                {new Date(fight.date).toLocaleDateString()}
              </div>
            </div>
            <div className="text-right">
              <span
                className={cn(
                  "inline-block min-w-[26px] text-center px-1.5 py-0.5 rounded-full text-xs font-medium",
                  {
                    "bg-green-500/20 text-green-400":
                      fight.result?.toLowerCase() === "w",
                    "bg-red-500/20 text-red-400":
                      fight.result?.toLowerCase() === "l",
                    "bg-yellow-500/20 text-yellow-400":
                      fight.result?.toLowerCase() === "d" ||
                      fight.decision?.toLowerCase().includes("no contest"),
                  }
                )}
              >
                {fight.result}
              </span>
              <div className="text-xs text-gray-400 flex items-center gap-1 mt-1 justify-end">
                {getMethodIcon(fight.decision)}
                <span>
                  {fight.decision} R{fight.round}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
