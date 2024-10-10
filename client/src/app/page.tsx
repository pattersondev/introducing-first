"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface Matchup {
  Fighter1: string;
  Fighter2: string;
  Result: string;
  Winner: string;
}

interface Event {
  Name: string;
  Date: string;
  Location: string;
  Matchups: Matchup[];
}

const eventData = [
  {
    Name: "Bellator Champions Series London: McCourt vs. Collins",
    Date: "September 14, 2024",
    Location: "OVO Arena Wembley, London",
    Matchups: [
      {
        Fighter1: "Leah McCourt",
        Fighter2: "Sara Collins",
        Result: "FinalSubR1, 2:25",
        Winner: "Sara Collins",
      },
      {
        Fighter1: "Simeon Powell",
        Fighter2: "Rafael Xavier",
        Result: "FinalS DecR3, 5:00",
        Winner: "Simeon Powell",
      },
      {
        Fighter1: "Luke Trainer",
        Fighter2: "Laurynas Urbonavicius",
        Result: "FinalSubR1, 4:58",
        Winner: "Luke Trainer",
      },
      {
        Fighter1: "Tim Wilde",
        Fighter2: "Marc Diakiese",
        Result: "FinalU DecR3, 5:00",
        Winner: "Marc Diakiese",
      },
      {
        Fighter1: "Archie Colgan",
        Fighter2: "Manoel Sousa",
        Result: "FinalU DecR3, 5:00",
        Winner: "Archie Colgan",
      },
      {
        Fighter1: "Mike Shipman",
        Fighter2: "Eslam Syaha",
        Result: "FinalKO/TKOR2, 2:32",
        Winner: "Mike Shipman",
      },
      {
        Fighter1: "Joseph Luciano",
        Fighter2: "Steven Hill",
        Result: "FinalSubR2, 1:22",
        Winner: "Joseph Luciano",
      },
      {
        Fighter1: "Ciaran Clarke",
        Fighter2: "Tuomas Grönvall",
        Result: "FinalU DecR3, 5:00",
        Winner: "Ciaran Clarke",
      },
      {
        Fighter1: "Darragh Kelly",
        Fighter2: "Dmytrii Hrytsenko",
        Result: "FinalU DecR3, 5:00",
        Winner: "Darragh Kelly",
      },
    ],
  },
  // ... (include other events from your JSON file)
];

export default function Home() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    const closestFutureEvent = eventData.reduce((closest, event) => {
      const eventDate = new Date(event.Date);
      const today = new Date();
      const closestDate = new Date(closest.Date);

      if (
        eventDate >= today &&
        (eventDate < closestDate || closestDate < today)
      ) {
        return event;
      }
      return closest;
    });

    setSelectedEvent(closestFutureEvent);
  }, []);

  const handleEventChange = (value: string) => {
    const event = eventData.find((e) => e.Name === value);
    setSelectedEvent(event || null);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <main className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-white">
          Introuducing First
        </h1>

        <Select onValueChange={handleEventChange} value={selectedEvent?.Name}>
          <SelectTrigger className="w-full bg-gray-800 border-gray-700">
            <SelectValue placeholder="Select an event" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            {eventData.map((event) => (
              <SelectItem key={event.Name} value={event.Name}>
                {event.Name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedEvent && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">{selectedEvent.Name}</CardTitle>
              <CardDescription className="text-gray-400">
                {selectedEvent.Date} - {selectedEvent.Location}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="text-xl font-semibold mb-4 text-white">
                Matchups
              </h3>
              <div className="space-y-4">
                {selectedEvent.Matchups.map((matchup, index) => (
                  <Card key={index} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p
                            className={`font-semibold ${
                              matchup.Winner === matchup.Fighter1
                                ? "text-green-400"
                                : "text-white"
                            }`}
                          >
                            {matchup.Fighter1}
                          </p>
                        </div>
                        <div className="flex-1 text-center">
                          <p className="text-sm text-gray-400">vs</p>
                        </div>
                        <div className="flex-1 text-right">
                          <p
                            className={`font-semibold ${
                              matchup.Winner === matchup.Fighter2
                                ? "text-green-400"
                                : "text-white"
                            }`}
                          >
                            {matchup.Fighter2}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">
                        Result: {matchup.Result}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
