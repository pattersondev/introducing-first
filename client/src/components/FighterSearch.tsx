import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Mock fighter data - replace this with actual data from your DB
const mockFighters = [
  { name: "Francis Ngannou", league: "PFL" },
  { name: "Cris Cyborg", league: "Bellator" },
  { name: "Johnny Eblen", league: "Bellator" },
  { name: "AJ McKee", league: "PFL" },
  { name: "Raufeon Stots", league: "Bellator" },
  { name: "Leah McCourt", league: "Bellator" },
  { name: "Sara Collins", league: "Bellator" },
  { name: "Simeon Powell", league: "Bellator" },
  { name: "Rafael Xavier", league: "Bellator" },
  { name: "Luke Trainer", league: "Bellator" },
  { name: "Tim Wilde", league: "Bellator" },
  { name: "Marc Diakiese", league: "Bellator" },
  { name: "Jon Jones", league: "UFC" },
  { name: "Israel Adesanya", league: "UFC" },
  { name: "Alexander Volkanovski", league: "UFC" },
];

const leagues = ["All", "UFC", "Bellator", "PFL"];

export function FighterSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeague, setSelectedLeague] = useState<string | null>("All");
  const [searchResults, setSearchResults] = useState<typeof mockFighters>([]);

  const handleSearch = () => {
    const results = mockFighters.filter((fighter) => {
      const nameMatch = fighter.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const leagueMatch =
        selectedLeague === "All" || fighter.league === selectedLeague;
      return nameMatch && leagueMatch;
    });
    setSearchResults(results);
  };

  const handleLeagueSelect = (league: string) => {
    setSelectedLeague(league);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Fighter Search</h3>
      <div className="flex flex-wrap gap-2 mb-2">
        {leagues.map((league) => (
          <Button
            key={league}
            variant={selectedLeague === league ? "default" : "outline"}
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
          placeholder="Search fighters..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mr-2"
        />
        <Button onClick={handleSearch}>Search</Button>
      </div>
      <ScrollArea className="h-[200px]">
        {searchResults.map((fighter, index) => (
          <div
            key={index}
            className="p-2 bg-gray-800 mb-2 rounded flex justify-between"
          >
            <span>{fighter.name}</span>
            <span className="text-sm text-gray-400">{fighter.league}</span>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
