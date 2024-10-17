"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Sidebar } from "@/components/Sidebar";

// Mock event data - replace this with actual data from your DB
const mockEvents = [
  { name: "UFC 300", date: "2024-04-13", league: "UFC" },
  { name: "Bellator 300", date: "2023-10-07", league: "Bellator" },
  { name: "PFL 10", date: "2023-11-24", league: "PFL" },
  {
    name: "UFC Fight Night: Aspinall vs. Tybura",
    date: "2023-07-22",
    league: "UFC",
  },
  { name: "Bellator 301", date: "2023-11-17", league: "Bellator" },
  { name: "PFL World Championship", date: "2023-11-24", league: "PFL" },
];

const leagues = ["All", "UFC", "Bellator", "PFL"];

export function EventSearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeague, setSelectedLeague] = useState<string>("All");
  const [searchResults, setSearchResults] = useState<typeof mockEvents>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSearch = () => {
    const results = mockEvents.filter((event) => {
      const nameMatch = event.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const leagueMatch =
        selectedLeague === "All" || event.league === selectedLeague;
      return nameMatch && leagueMatch;
    });
    setSearchResults(results);
  };

  const handleLeagueSelect = (league: string) => {
    setSelectedLeague(league);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <div className="flex-1 p-4">
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold mb-8 text-white">Event Search</h1>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  {leagues.map((league) => (
                    <Button
                      key={league}
                      variant={
                        selectedLeague === league ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => handleLeagueSelect(league)}
                    >
                      {league}
                    </Button>
                  ))}
                </div>
                <div className="flex">
                  <Input
                    type="text"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mr-2 bg-gray-700 border-gray-600 text-white"
                  />
                  <Button onClick={handleSearch}>Search</Button>
                </div>
                <ScrollArea className="h-[400px]">
                  {searchResults.map((event, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-700 mb-2 rounded flex justify-between items-center"
                    >
                      <div>
                        <span className="text-white">{event.name}</span>
                        <p className="text-sm text-gray-400">{event.date}</p>
                      </div>
                      <span className="text-sm text-gray-400">
                        {event.league}
                      </span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
