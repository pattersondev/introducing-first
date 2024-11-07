"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Sidebar } from "@/components/Sidebar";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleFighterClick = async (fighterId: string) => {
    try {
      await FighterService.trackFighterClick(fighterId);
    } catch (error) {
      console.error("Error tracking fighter click:", error);
    }
  };

  return (
    <div className="flex">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <div className="flex-1 p-4">
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold mb-8 text-white">Fighter Search</h1>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Search fighters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />

                <ScrollArea className="h-[600px]">
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full bg-gray-700" />
                      ))}
                    </div>
                  ) : searchTerm ? (
                    <div className="space-y-4">
                      {searchResults?.fighters.map((fighter) => (
                        <Link
                          href={`/fighters/${fighter.fighter_id}`}
                          key={fighter.fighter_id}
                          onClick={() => handleFighterClick(fighter.fighter_id)}
                        >
                          <Card className="bg-gray-700 hover:bg-gray-600 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="text-lg font-semibold text-white">
                                    {fighter.first_name} {fighter.last_name}
                                  </h3>
                                  {fighter.nickname && (
                                    <p className="text-sm text-gray-400">
                                      "{fighter.nickname}"
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-400">
                                    {fighter.team}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-400">
                                    Record: {fighter.win_loss_record}
                                  </p>
                                  {fighter.weight && (
                                    <p className="text-sm text-gray-400">
                                      {fighter.weight}lbs
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold text-white mb-4">
                        Popular Fighters
                      </h2>
                      {popularFighters.map((fighter) => (
                        <Link
                          href={`/fighters/${fighter.fighter_id}`}
                          key={fighter.fighter_id}
                          onClick={() => handleFighterClick(fighter.fighter_id)}
                        >
                          <Card className="bg-gray-700 hover:bg-gray-600 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="text-lg font-semibold text-white">
                                    {fighter.first_name} {fighter.last_name}
                                  </h3>
                                  {fighter.nickname && (
                                    <p className="text-sm text-gray-400">
                                      "{fighter.nickname}"
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-400">
                                    {fighter.team}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-400">
                                    Record: {fighter.win_loss_record}
                                  </p>
                                  {fighter.weight && (
                                    <p className="text-sm text-gray-400">
                                      {fighter.weight}lbs
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500">
                                    Searched {fighter.search_count} times
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {searchResults && searchResults.pagination.totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-4 text-white">
                      Page {currentPage} of{" "}
                      {searchResults.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={
                        currentPage === searchResults.pagination.totalPages
                      }
                      onClick={() => handlePageChange(currentPage + 1)}
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
    </div>
  );
}
