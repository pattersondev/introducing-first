"use client";

import { useState } from "react";
import { Event } from "@/types/api";
import { EventSelector } from "@/components/EventSelector";
import { EventDetails } from "@/components/EventDetails";
import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar } from "@/components/Sidebar";
import { useEvents } from "@/hooks/useEvents";

export default function Home() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const { events, loading: isLoading, error } = useEvents();

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Events</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-950 text-white">
      <div className="flex h-full overflow-hidden">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
        <main
          className={`flex-1 overflow-y-auto p-4 lg:p-6 transition-all duration-300
            ${isSidebarCollapsed ? "" : "lg:ml-[16vw]"}`}
        >
          <h1 className="text-4xl font-bold text-center mb-8 text-white pt-4 lg:pt-0">
            Introducing First
          </h1>

          {isLoading ? (
            <Skeleton className="w-full h-10 bg-gray-800 mb-8" />
          ) : (
            <div className="mb-4">
              <EventSelector onEventSelect={setSelectedEvent} />
            </div>
          )}

          {isLoading ? (
            <EventDetailsSkeleton />
          ) : (
            selectedEvent && (
              <EventDetails
                event={selectedEvent}
                isSidebarCollapsed={isSidebarCollapsed}
              />
            )
          )}
        </main>
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
