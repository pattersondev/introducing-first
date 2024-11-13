import { Event } from "@/types/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { MatchupList } from "./MatchupList";
import { MatchupChat } from "./MatchupChat";

interface EventDetailsProps {
  event: Event;
  isLoading?: boolean;
}

export function EventDetails({ event, isLoading = false }: EventDetailsProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-180px)]">
      <div className="lg:col-span-2 h-full">
        <Card className="bg-gray-900 border-gray-800 h-full flex flex-col">
          <CardHeader className="pb-4 flex-none">
            <CardTitle className="text-white">{event.name}</CardTitle>
            <CardDescription className="text-gray-400">
              {formatDate(event.date)} - {event.location}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex-1 overflow-auto">
            <h3 className="text-xl font-semibold mb-4 text-white">Matchups</h3>
            <MatchupList
              matchups={event.matchups}
              eventDate={event.date}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
      <div className="h-full">
        <Card className="bg-gray-900 border-gray-800 h-full flex flex-col">
          <CardHeader className="pb-4 flex-none">
            <CardTitle className="text-white">Chat</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex-1 overflow-auto">
            <MatchupChat matchups={event.matchups} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
