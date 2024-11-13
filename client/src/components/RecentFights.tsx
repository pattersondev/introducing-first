import { RecentFight } from "@/types/api";

interface RecentFightsProps {
  fights?: RecentFight[];
}

export function RecentFights({ fights }: RecentFightsProps) {
  if (!fights || fights.length === 0) return null;

  return (
    <div className="w-full mt-4">
      <h4 className="text-sm font-medium text-gray-400 mb-2">Recent Fights</h4>
      <div className="space-y-2">
        {fights.map((fight, index) => (
          <div
            key={index}
            className="bg-gray-800 p-2 rounded text-sm flex justify-between items-center"
          >
            <div className="flex-1">
              <div className="text-white">{fight.opponent}</div>
              <div className="text-gray-400 text-xs">
                {new Date(fight.date).toLocaleDateString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-white">{fight.result}</div>
              <div className="text-gray-400 text-xs">
                {fight.decision} (R{fight.round})
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
