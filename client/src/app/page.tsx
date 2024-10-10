"use client";

import { useState, useEffect } from "react";
import { Event } from "@/types";
import { EventSelector } from "@/components/EventSelector";
import { EventDetails } from "@/components/EventDetails";
import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar } from "@/components/Sidebar";

const eventData: Event[] = [
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
  {
    Name: "PFL Super Fights: Battle of the Giants - Ngannou vs. Ferreira",
    Date: "October 19, 2024",
    Location: "The Mayadeen, Riyadh, Saudi Arabia",
    Matchups: [
      {
        Fighter1: "Francis Ngannou",
        Fighter2: "Renan Ferreira",
        Result: "",
        Winner: "",
      },
      {
        Fighter1: "Cris Cyborg",
        Fighter2: "Larissa Pacheco",
        Result: "",
        Winner: "",
      },
      {
        Fighter1: "Johnny Eblen",
        Fighter2: "Fabian Edwards",
        Result: "",
        Winner: "",
      },
      {
        Fighter1: "Husein Kadimagomaev",
        Fighter2: "Zafar Mohsen",
        Result: "",
        Winner: "",
      },
      {
        Fighter1: "AJ McKee",
        Fighter2: "Paul Hughes",
        Result: "",
        Winner: "",
      },
      {
        Fighter1: "Raufeon Stots",
        Fighter2: "Marcos Breno",
        Result: "",
        Winner: "",
      },
      {
        Fighter1: "Makkasharip Zaynukov",
        Fighter2: "Dedrek Sanders",
        Result: "",
        Winner: "",
      },
      {
        Fighter1: "Ibragim Ibragimov",
        Fighter2: "Nacho Campos",
        Result: "",
        Winner: "",
      },
      {
        Fighter1: "Mostafa Nada",
        Fighter2: "Ahmed Sami",
        Result: "",
        Winner: "",
      },
      {
        Fighter1: "Youssef Al",
        Fighter2: "Taha Bendaoud",
        Result: "",
        Winner: "",
      },
    ],
  },
  // ... (include other events from your JSON file)
];

export default function Home() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  useEffect(() => {
    // Simulate API call
    setIsLoading(true);
    setTimeout(() => {
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
      setIsLoading(false);
    }, 500);
  }, []);

  const handleEventChange = (value: string) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const event = eventData.find((e) => e.Name === value);
      setSelectedEvent(event || null);
      setIsLoading(false);
    }, 1000); // Simulate 1 second loading time
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

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
              <EventSelector
                events={eventData}
                selectedEvent={selectedEvent}
                onEventChange={handleEventChange}
              />
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
