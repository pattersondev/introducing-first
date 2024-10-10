import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Matchup } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface ChatMessage {
  id: number;
  user: string;
  message: string;
  timestamp: Date;
}

interface MatchupChatProps {
  matchups: Matchup[];
}

export function MatchupChat({ matchups }: MatchupChatProps) {
  const [activeTabs, setActiveTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [inputMessage, setInputMessage] = useState("");
  const [availableMatchups, setAvailableMatchups] = useState<string[]>(
    matchups.map((m) => `${m.Fighter1} vs ${m.Fighter2}`)
  );
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleAddTab = (value: string) => {
    if (!activeTabs.includes(value)) {
      setActiveTabs([...activeTabs, value]);
      setActiveTab(value);
      setAvailableMatchups(availableMatchups.filter((m) => m !== value));
    }
  };

  const handleRemoveTab = (tab: string) => {
    const newActiveTabs = activeTabs.filter((t) => t !== tab);
    setActiveTabs(newActiveTabs);
    setAvailableMatchups([...availableMatchups, tab].sort());
    if (activeTab === tab) {
      setActiveTab(newActiveTabs[newActiveTabs.length - 1] || null);
    }
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() === "" || !activeTab) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      user: "User", // Replace with actual user name when you have authentication
      message: inputMessage,
      timestamp: new Date(),
    };

    setChats((prevChats) => ({
      ...prevChats,
      [activeTab]: [...(prevChats[activeTab] || []), newMessage],
    }));

    setInputMessage("");
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [chats, activeTab]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 h-full flex flex-col w-full">
      <div className="mb-4">
        <Select onValueChange={handleAddTab}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Add a matchup chat" />
          </SelectTrigger>
          <SelectContent>
            {availableMatchups.map((matchup) => (
              <SelectItem key={matchup} value={matchup}>
                {matchup}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {activeTabs.length > 0 ? (
        <div className="flex-grow flex flex-col">
          <div className="flex overflow-x-auto space-x-2 mb-4 pb-2">
            {activeTabs.map((tab) => (
              <div
                key={tab}
                className={`flex items-center bg-gray-800 rounded-md cursor-pointer ${
                  activeTab === tab ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => setActiveTab(tab)}
              >
                <span className="px-2 py-1 text-xs">{tab}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTab(tab);
                  }}
                  className="ml-1 p-1"
                >
                  <X size={12} />
                </Button>
              </div>
            ))}
          </div>
          <ScrollArea className="flex-grow w-full rounded border border-gray-800 p-4 mb-4 h-[400px]">
            <div ref={scrollAreaRef} className="space-y-2">
              {chats[activeTab || ""]?.map((message) => (
                <div key={message.id} className="mb-2">
                  <span className="font-bold">{message.user}: </span>
                  <span>{message.message}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex mt-auto">
            <Input
              type="text"
              placeholder="Type your message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage();
                }
              }}
              className="flex-grow mr-2"
            />
            <Button onClick={handleSendMessage}>Send</Button>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center text-gray-500">
          No active chats. Add a matchup to start chatting.
        </div>
      )}
    </div>
  );
}
