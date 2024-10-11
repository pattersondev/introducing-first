import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FighterSearch } from "./FighterSearch";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
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
        <CardContent className="p-2 h-full overflow-y-auto">
          <div className="pt-16 lg:pt-4">
            <FighterSearch />
            {/* Add other sidebar components here in the future */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
