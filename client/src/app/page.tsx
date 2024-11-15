"use client";

import { useState } from "react";
import { Event } from "@/types/api";
import { EventSelector } from "@/components/EventSelector";
import { EventDetails } from "@/components/EventDetails";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentAndUpcomingEvents } from "@/hooks/useRecentAndUpcomingEvents";

export default function Home() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const { events, loading: isLoading, error } = useRecentAndUpcomingEvents();

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Events</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-950 text-white">
      <div className="flex-none pt-2 px-4 lg:px-6 pb-4 w-full">
        {isLoading ? (
          <Skeleton className="w-full h-10 bg-gray-800 mb-2" />
        ) : (
          <div className="mb-2">
            <EventSelector onEventSelect={setSelectedEvent} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-4 lg:px-6">
        {isLoading ? (
          <EventDetailsSkeleton />
        ) : (
          selectedEvent && <EventDetails event={selectedEvent} />
        )}
      </div>
    </div>
  );
}

function EventDetailsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="w-full h-12 bg-gray-800" />
      <Skeleton className="w-3/4 h-6 bg-gray-800" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="w-full h-24 bg-gray-800" />
        ))}
      </div>
    </div>
  );
}
