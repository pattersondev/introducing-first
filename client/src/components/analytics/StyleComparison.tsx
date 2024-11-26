import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StyleComparisonProps {
  title: string;
  fighter1Style: {
    primaryStyle: string;
    strikePercentage: number;
    wrestlingPercentage: number;
    grapplingPercentage: number;
  };
  fighter2Style: {
    primaryStyle: string;
    strikePercentage: number;
    wrestlingPercentage: number;
    grapplingPercentage: number;
  };
}

export function StyleComparison({
  title,
  fighter1Style,
  fighter2Style,
}: StyleComparisonProps) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-blue-400">Striking</span>
            <span className="text-red-400">Striking</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress
              value={fighter1Style.strikePercentage * 100}
              className="text-blue-500"
            />
            <Progress
              value={fighter2Style.strikePercentage * 100}
              className="text-red-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-blue-400">Wrestling</span>
            <span className="text-red-400">Wrestling</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress
              value={fighter1Style.wrestlingPercentage * 100}
              className="text-blue-500"
            />
            <Progress
              value={fighter2Style.wrestlingPercentage * 100}
              className="text-red-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-blue-400">Grappling</span>
            <span className="text-red-400">Grappling</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress
              value={fighter1Style.grapplingPercentage * 100}
              className="text-blue-500"
            />
            <Progress
              value={fighter2Style.grapplingPercentage * 100}
              className="text-red-500"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
