import { DetailedFighter } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Calendar,
  Ruler,
  Weight,
  Award,
  Flag,
  Swords,
  Trophy,
  Handshake,
  Ban,
  Timer,
  AlertCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

interface FighterProfileProps {
  fighter: DetailedFighter;
}

export function FighterProfile({ fighter }: FighterProfileProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const stats = [
    {
      label: "Record",
      value: fighter.win_loss_record,
      icon: Trophy,
      color: "text-yellow-400",
    },
    {
      label: "TKO Record",
      value: fighter.tko_record,
      icon: Swords,
      color: "text-red-400",
    },
    {
      label: "Submission Record",
      value: fighter.sub_record,
      icon: Award,
      color: "text-blue-400",
    },
    {
      label: "Country",
      value: fighter.country || "Unknown",
      icon: Flag,
      color: "text-green-400",
    },
  ];

  const details = [
    {
      label: "Age",
      value: fighter.age,
      icon: User,
    },
    {
      label: "Birthday",
      value: fighter.birthdate ? formatDate(fighter.birthdate) : "Unknown",
      icon: Calendar,
    },
    {
      label: "Height",
      value: fighter.height
        ? `${Math.floor(fighter.height / 12)}'${fighter.height % 12}"`
        : "Unknown",
      icon: Ruler,
    },
    {
      label: "Weight",
      value: fighter.weight ? `${fighter.weight} lbs` : "Unknown",
      icon: Weight,
    },
  ];

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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        <Card className="bg-gray-800 border-gray-700 w-full md:w-64">
          <CardContent className="p-6">
            <div className="aspect-square rounded-lg bg-gray-700 flex items-center justify-center">
              <User className="w-24 h-24 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">
              {fighter.first_name} {fighter.last_name}
            </h1>
            {fighter.nickname && (
              <p className="text-xl text-gray-400">"{fighter.nickname}"</p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    <span className="text-sm text-gray-400">{stat.label}</span>
                  </div>
                  <p className="text-lg font-semibold">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle>Fighter Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {details.map((detail, index) => (
                <div key={index} className="flex items-center gap-2">
                  <detail.icon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">{detail.label}</p>
                    <p className="font-medium">{detail.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle>Fight Style</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Stance</p>
              <p className="font-medium">{fighter.stance || "Unknown"}</p>
              <p className="text-sm text-gray-400 mt-4">Team</p>
              <p className="font-medium">{fighter.team || "Unknown"}</p>
              <p className="text-sm text-gray-400 mt-4">Reach</p>
              <p className="font-medium">{fighter.reach || "Unknown"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700 col-span-2">
        <CardHeader>
          <CardTitle>Fight History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-900 z-10">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Opponent</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Round/Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fighter.fights?.map((fight, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {fight.date ? formatDate(fight.date) : "Unknown"}
                    </TableCell>
                    <TableCell>
                      {fight.opponent_id ? (
                        <Link
                          href={`/fighters/${fight.opponent_id}`}
                          className="text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          {fight.opponent}
                        </Link>
                      ) : (
                        fight.opponent
                      )}
                    </TableCell>
                    <TableCell>{fight.event}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-sm font-medium",
                          {
                            "bg-green-500/20 text-green-400":
                              fight.result?.toLowerCase() === "w",
                            "bg-red-500/20 text-red-400":
                              fight.result?.toLowerCase() === "l",
                            "bg-yellow-500/20 text-yellow-400":
                              fight.result?.toLowerCase() === "d" ||
                              fight.decision
                                ?.toLowerCase()
                                .includes("no contest"),
                          }
                        )}
                      >
                        {fight.result}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMethodIcon(fight.decision)}
                        <span>{fight.decision}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {fight.rnd && fight.time
                        ? `R${fight.rnd} ${fight.time}`
                        : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
