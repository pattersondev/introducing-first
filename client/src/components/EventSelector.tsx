import { Event } from "@/types/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEvents } from "@/hooks/useEvents";
import { useEffect, useState } from "react";

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

function sortEventsByDate(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime(); // Sort in descending order (newest first)
  });
}

export function EventSelector({ onEventSelect }: EventSelectorProps) {
  const { events, loading, error } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const sortedEvents = sortEventsByDate(events);

  useEffect(() => {
    if (events.length > 0) {
      const closestEvent = findClosestEvent(events);
      if (closestEvent) {
        setSelectedEventId(closestEvent.event_id);
        onEventSelect(closestEvent);
      }
    }
  }, [events, onEventSelect]);

  if (error) return <div>Error loading events: {error}</div>;

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
        {sortedEvents.map((event) => (
          <SelectItem key={event.event_id} value={event.event_id}>
            {event.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
