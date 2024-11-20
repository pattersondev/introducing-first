"use client";

import { useState } from "react";
import { EventSelector } from "@/components/EventSelector";
import { Event } from "@/types/api";
import { MatchupList } from "@/components/MatchupList";

export default function EventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">MMA Events</h1>
      <div className="max-w-md mb-8">
        <EventSelector onEventSelect={setSelectedEvent} />
      </div>

      {selectedEvent && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">{selectedEvent.name}</h2>
          <p className="text-gray-400 mb-4">
            {new Date(selectedEvent.date).toLocaleDateString()} -{" "}
            {selectedEvent.location}
          </p>
          <MatchupList
            matchups={selectedEvent.matchups}
            eventDate={selectedEvent.date}
            eventId={selectedEvent.event_id}
          />
        </div>
      )}
    </div>
  );
}
