"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { EventService } from "@/services/event-service";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

type Promotion = "ALL" | "UFC" | "BELLATOR" | "PFL";

export function EventSearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion>("ALL");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const promotions: Promotion[] = ["ALL", "UFC", "BELLATOR", "PFL"];

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        let response;
        if (!debouncedSearch && selectedPromotion === "ALL") {
          response = await EventService.getUpcomingEvents();
        } else {
          response = await EventService.searchEvents(
            debouncedSearch,
            selectedPromotion
          );
        }

        if (response.data) {
          setEvents(response.data);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [debouncedSearch, selectedPromotion]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="h-full bg-gray-950 text-white p-4 lg:p-6">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">Event Search</h1>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {promotions.map((promotion) => (
                  <Button
                    key={promotion}
                    variant={
                      selectedPromotion === promotion ? "default" : "outline"
                    }
                    onClick={() => setSelectedPromotion(promotion)}
                  >
                    {promotion === "ALL" ? "All Promotions" : promotion}
                  </Button>
                ))}
              </div>

              <Input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />

              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="px-6">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <Skeleton
                        key={i}
                        className="h-24 w-full bg-gray-700 mb-6"
                      />
                    ))
                  ) : events.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      No events found
                    </div>
                  ) : (
                    events.map((event) => (
                      <Link
                        href={`/events/${event.event_id}`}
                        key={event.event_id}
                        className="block mb-2"
                      >
                        <Card className="bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="text-lg font-semibold">
                                  {event.name}
                                </h3>
                                <p className="text-sm text-gray-400">
                                  {formatDate(event.date)}
                                </p>
                                {event.location && (
                                  <p className="text-sm text-gray-400 mt-1">
                                    {event.location}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-400">
                                  {event.matchups?.length || 0} Matchups
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
