import { Event } from "@/types/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { EventService } from "@/services/event-service";

interface EventSelectorProps {
  onEventSelect: (event: Event) => void;
}

function findClosestEvent(events: Event[]): Event | null {
  const now = new Date();
  return events.reduce((closest, event) => {
    const eventDate = new Date(event.date);
    const closestDate = closest ? new Date(closest.date) : null;

    if (!closest) return event;

    const diffCurrent = Math.abs(eventDate.getTime() - now.getTime());
    const diffClosest = Math.abs(closestDate!.getTime() - now.getTime());

    return diffCurrent < diffClosest ? event : closest;
  }, null as Event | null);
}

export function EventSelector({ onEventSelect }: EventSelectorProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await EventService.getRecentAndUpcomingEvents();
        if (response.error) {
          throw new Error(response.error);
        }
        setEvents(response.data || []);

        // Find and select the closest event
        const closestEvent = findClosestEvent(response.data || []);
        if (closestEvent) {
          setSelectedEventId(closestEvent.event_id);
          onEventSelect(closestEvent);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [onEventSelect]);

  return (
    <Select
      value={selectedEventId}
      onValueChange={(eventId) => {
        setSelectedEventId(eventId);
        const selectedEvent = events.find((e) => e.event_id === eventId);
        if (selectedEvent) {
          onEventSelect(selectedEvent);
        }
      }}
    >
      <SelectTrigger className="w-full bg-gray-800 border-gray-700">
        <SelectValue placeholder="Select an event" />
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-gray-700">
        {events.map((event) => (
          <SelectItem key={event.event_id} value={event.event_id}>
            {event.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
