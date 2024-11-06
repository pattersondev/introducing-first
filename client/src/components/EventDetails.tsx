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
  isSidebarCollapsed: boolean;
}

export function EventDetails({
  event,
  isLoading = false,
  isSidebarCollapsed,
}: EventDetailsProps) {
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
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-2/3 flex-grow">
        <Card className="bg-gray-900 border-gray-800 h-full">
          <CardHeader>
            <CardTitle className="text-white">{event.name}</CardTitle>
            <CardDescription className="text-gray-400">
              {formatDate(event.date)} - {event.location}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <h3 className="text-xl font-semibold mb-4 text-white px-6">
              Matchups
            </h3>
            <MatchupList
              matchups={event.matchups}
              eventDate={event.date}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
      <div className="w-full lg:w-1/3 flex-grow">
        <Card className="bg-gray-900 border-gray-800 h-full">
          <CardHeader>
            <CardTitle className="text-white">Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <MatchupChat matchups={event.matchups} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
