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
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [inputMessage, setInputMessage] = useState("");
  const [availableMatchups, setAvailableMatchups] = useState<string[]>(
    matchups.map((m) => `${m.Fighter1} vs ${m.Fighter2}`)
  );
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleChatSelect = (value: string) => {
    setActiveChat(value);
    if (!chats[value]) {
      setChats((prevChats) => ({ ...prevChats, [value]: [] }));
    }
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() === "" || !activeChat) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      user: "User", // Replace with actual user name when you have authentication
      message: inputMessage,
      timestamp: new Date(),
    };

    setChats((prevChats) => ({
      ...prevChats,
      [activeChat]: [...(prevChats[activeChat] || []), newMessage],
    }));

    setInputMessage("");
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [chats, activeChat]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 h-full flex flex-col w-full">
      <div className="mb-4">
        <Select
          onValueChange={handleChatSelect}
          value={activeChat || undefined}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a matchup chat" />
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
      {activeChat ? (
        <div className="flex-grow flex flex-col">
          <ScrollArea className="flex-grow w-full rounded border border-gray-800 p-4 mb-4 h-[400px]">
            <div ref={scrollAreaRef} className="space-y-2">
              {chats[activeChat]?.map((message) => (
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
              onKeyUp={(e) => {
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
          Select a matchup to start chatting.
        </div>
      )}
    </div>
  );
}
