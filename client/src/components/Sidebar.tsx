import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  Home,
  Trophy,
  Medal,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div
      className={`h-screen ${
        isCollapsed ? "w-0 lg:w-[16vw]" : "w-full lg:w-[16vw]"
      } transition-all duration-300`}
    >
      <Button
        variant="ghost"
        size="icon"
        className={`fixed top-4 z-50 bg-gray-800 hover:bg-gray-700 transition-all duration-300 lg:hidden
          ${isCollapsed ? "left-4" : "right-4"}`}
        onClick={onToggle}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </Button>
      <Card
        className={`bg-gray-900 border-gray-800 h-full
          ${isCollapsed ? "w-0 lg:w-full" : "w-full"}
          fixed lg:relative overflow-hidden`}
      >
        <CardContent className="p-4 h-full overflow-y-auto">
          <div className="pt-16 lg:pt-4">
            <Link href="/">
              <Button
                variant={isActive("/") ? "default" : "outline"}
                className="w-full justify-start mb-2"
              >
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
            <Link href="/fighter-search">
              <Button
                variant={isActive("/fighter-search") ? "default" : "outline"}
                className="w-full justify-start mb-2"
              >
                <User className="mr-2 h-4 w-4" />
                Fighter Search
              </Button>
            </Link>
            <Link href="/event-search">
              <Button
                variant={isActive("/event-search") ? "default" : "outline"}
                className="w-full justify-start mb-2"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Event Search
              </Button>
            </Link>
            <Link href="/rankings">
              <Button
                variant={isActive("/rankings") ? "default" : "outline"}
                className="w-full justify-start mb-2"
              >
                <Medal className="mr-2 h-4 w-4" />
                Fighter Rankings
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button
                variant={isActive("/leaderboard") ? "default" : "outline"}
                className="w-full justify-start"
              >
                <Trophy className="mr-2 h-4 w-4" />
                Leaderboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
