import { Event } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventSelectorProps {
  events: Event[];
  selectedEvent: Event | null;
  onEventChange: (value: string) => void;
}

export function EventSelector({
  events,
  selectedEvent,
  onEventChange,
}: EventSelectorProps) {
  return (
    <Select onValueChange={onEventChange} value={selectedEvent?.Name}>
      <SelectTrigger className="w-full bg-gray-800 border-gray-700">
        <SelectValue placeholder="Select an event" />
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-gray-700">
        {events.map((event) => (
          <SelectItem key={event.Name} value={event.Name}>
            {event.Name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
