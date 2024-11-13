"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EventService } from "@/services/event-service";
import { Event } from "@/types/api";
import { MatchupList } from "./MatchupList";

interface EventViewProps {
  eventId: string;
}

export function EventView({ eventId }: EventViewProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await EventService.getEvent(eventId);
        if (response.data) {
          setEvent(response.data);
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
        <div className="flex-1 p-4 lg:p-6">
          <div className="container mx-auto">
            <Skeleton className="h-12 w-2/3 mb-6 bg-gray-700" />
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full bg-gray-700 mb-4" />
                <Skeleton className="h-96 w-full bg-gray-700" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
        <div className="flex-1 p-4 lg:p-6">
          <div className="container mx-auto">
            <div className="text-center text-gray-400 py-8">
              Event not found
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
      <div className="flex-1 p-4 lg:p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold mb-6">{event.name}</h1>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="mb-6">
                <p className="text-lg text-gray-400">
                  {formatDate(event.date)}
                </p>
                {event.location && (
                  <p className="text-lg text-gray-400">{event.location}</p>
                )}
              </div>
              <MatchupList
                matchups={event.matchups}
                eventDate={event.date}
                isLoading={loading}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
