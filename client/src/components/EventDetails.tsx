import { Event } from "@/types";
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
  return (
    <div className="space-y-8 lg:space-y-0 lg:flex lg:gap-8 max-w-7xl mx-auto">
      <div className="lg:w-3/5">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">{event.Name}</CardTitle>
            <CardDescription className="text-gray-400">
              {event.Date} - {event.Location}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <h3 className="text-xl font-semibold mb-4 text-white px-6">
              Matchups
            </h3>
            <MatchupList
              matchups={event.Matchups}
              eventDate={event.Date}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>

      <div className="lg:w-2/5">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <MatchupChat matchups={event.Matchups} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
