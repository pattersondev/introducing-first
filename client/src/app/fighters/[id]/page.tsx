"use client";

import { useFighter } from "@/hooks/useFighter";
import { FighterProfile } from "@/components/FighterProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function FighterPage({ params }: { params: { id: string } }) {
  const { fighter, loading, error } = useFighter(params.id);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Fighter</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 text-white">
      <ScrollArea className="h-full">
        <div className="container mx-auto p-4 lg:p-6">
          {loading ? (
            <FighterProfileSkeleton />
          ) : (
            fighter && <FighterProfile fighter={fighter} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function FighterProfileSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        <Skeleton className="w-full md:w-64 h-64 rounded-lg bg-gray-800" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-12 w-3/4 bg-gray-800" />
          <Skeleton className="h-6 w-1/2 bg-gray-800" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 bg-gray-800" />
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-48 bg-gray-800" />
        ))}
      </div>
    </div>
  );
}
