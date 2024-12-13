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
import { Clock } from "lucide-react"; // Import the clock icon

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
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-white">{event.name}</CardTitle>
                <CardDescription className="text-gray-400">
                  {formatDate(event.date)} - {event.location}
                </CardDescription>
              </div>
              {(event.main_card_time ||
                event.prelims_time ||
                event.early_prelims_time) && (
                <div className="text-right space-y-2 min-w-[200px]">
                  {event.main_card_time && (
                    <div className="flex items-center justify-end text-sm">
                      <div className="flex items-center bg-gray-800/50 rounded-full px-3 py-1">
                        <span className="font-medium text-primary">
                          Main Card
                        </span>
                        <Clock className="w-4 h-4 mx-2 text-primary" />
                        <span className="text-gray-300">
                          {event.main_card_time} ET
                        </span>
                      </div>
                    </div>
                  )}
                  {event.prelims_time && (
                    <div className="flex items-center justify-end text-sm">
                      <div className="flex items-center bg-gray-800/50 rounded-full px-3 py-1">
                        <span className="font-medium text-primary">
                          Prelims
                        </span>
                        <Clock className="w-4 h-4 mx-2 text-primary" />
                        <span className="text-gray-300">
                          {event.prelims_time} ET
                        </span>
                      </div>
                    </div>
                  )}
                  {event.early_prelims_time && (
                    <div className="flex items-center justify-end text-sm">
                      <div className="flex items-center bg-gray-800/50 rounded-full px-3 py-1">
                        <span className="font-medium">Early Prelims</span>
                        <Clock className="w-4 h-4 mx-2" />
                        <span className="text-gray-300">
                          {event.early_prelims_time} ET
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 flex-1 overflow-auto">
            <h3 className="text-xl font-semibold mb-4 text-white">Matchups</h3>
            <MatchupList
              matchups={event.matchups}
              eventDate={event.date}
              eventId={event.event_id}
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
