"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { FighterService } from "@/services/fighter-service";

interface Fighter {
  fighter_id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  team: string;
  win_loss_record: string;
  weight: number;
  height: number;
  image_url?: string;
}

interface SearchResponse {
  fighters: Fighter[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface PopularFighter extends Fighter {
  search_count: number;
}

export function FighterSearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [popularFighters, setPopularFighters] = useState<PopularFighter[]>([]);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const searchFighters = useCallback(async (query: string, page: number) => {
    if (!query) {
      setSearchResults(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await FighterService.searchFighters(query, page);
      if (response.error) {
        console.error("Error searching fighters:", response.error);
      } else if (response.data) {
        setSearchResults(response.data);
      }
    } catch (error) {
      console.error("Error searching fighters:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    searchFighters(debouncedSearch, 1);
  }, [debouncedSearch, searchFighters]);

  useEffect(() => {
    async function loadPopularFighters() {
      try {
        const response = await FighterService.getPopularFighters();
        if (response.data) {
          setPopularFighters(response.data);
        }
      } catch (error) {
        console.error("Error loading popular fighters:", error);
      }
    }

    loadPopularFighters();
  }, []);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    searchFighters(searchTerm, newPage);
  };

  const handleFighterClick = async (fighterId: string) => {
    try {
      await FighterService.trackFighterClick(fighterId);
    } catch (error) {
      console.error("Error tracking fighter click:", error);
    }
  };

  const FighterCard = ({
    fighter,
    isPopular = false,
  }: {
    fighter: Fighter | PopularFighter;
    isPopular?: boolean;
  }) => (
    <Link
      href={`/fighters/${fighter.fighter_id}`}
      onClick={() => handleFighterClick(fighter.fighter_id)}
      className="block mb-2"
    >
      <Card className="bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Avatar className="h-12 w-12 border-2 border-gray-600 shrink-0">
                {fighter.image_url ? (
                  <AvatarImage
                    src={fighter.image_url}
                    alt={`${fighter.first_name} ${fighter.last_name}`}
                    className="object-cover object-top"
                  />
                ) : (
                  <AvatarFallback className="bg-gray-800">
                    {fighter.first_name[0]}
                    {fighter.last_name[0]}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h3 className="text-base sm:text-lg font-semibold">
                  {fighter.first_name} {fighter.last_name}
                </h3>
                {fighter.nickname && (
                  <p className="text-xs sm:text-sm text-gray-400">
                    "{fighter.nickname}"
                  </p>
                )}
                {fighter.team && (
                  <p className="text-xs sm:text-sm text-gray-400">
                    {fighter.team}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-between sm:block sm:text-right border-t sm:border-0 pt-2 sm:pt-0 mt-2 sm:mt-0">
              <p className="text-xs sm:text-sm text-gray-400">
                Record: {fighter.win_loss_record}
              </p>
              {typeof fighter.weight === "number" && fighter.weight > 0 && (
                <p className="text-xs sm:text-sm text-gray-400 sm:mb-1">
                  {fighter.weight}lbs
                </p>
              )}
              {isPopular && "search_count" in fighter && (
                <p className="text-xs text-gray-400">
                  Searched {fighter.search_count} times
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="h-full bg-gray-950 text-white p-2 sm:p-4 lg:p-6">
      <div className="container mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">
          Fighter Search
        </h1>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-3 sm:p-6">
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Search fighters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />

              <ScrollArea className="h-[calc(100vh-180px)] sm:h-[calc(100vh-250px)]">
                <div className="px-2 sm:px-6">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <Skeleton
                        key={i}
                        className="h-24 w-full bg-gray-700 mb-6"
                      />
                    ))
                  ) : searchTerm ? (
                    searchResults?.fighters.length ? (
                      searchResults.fighters.map((fighter) => (
                        <FighterCard
                          key={fighter.fighter_id}
                          fighter={fighter}
                        />
                      ))
                    ) : (
                      <div className="text-center text-gray-400 py-8">
                        No fighters found
                      </div>
                    )
                  ) : (
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold mb-4">
                        Popular Fighters
                      </h2>
                      {popularFighters.map((fighter) => (
                        <FighterCard
                          key={fighter.fighter_id}
                          fighter={fighter}
                          isPopular={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {searchResults && searchResults.pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="text-xs sm:text-sm px-2 sm:px-4"
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-2 sm:px-4 text-sm">
                    Page {currentPage} of {searchResults.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={
                      currentPage === searchResults.pagination.totalPages
                    }
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="text-xs sm:text-text px-2 sm:px-4"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
