"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { Message } from "../types/chat";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Matchup } from "@/types/api";

interface MatchupChatProps {
  matchups: Matchup[];
}

export function MatchupChat({ matchups }: MatchupChatProps) {
  const { user } = useAuth();
  const { messages, sendMessage } = useChat(matchups[0]?.matchup_id || "");
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    await sendMessage(newMessage, user.id, user.username);
    setNewMessage("");
  };

  const isCurrentUserMessage = (message: Message) => {
    return user?.id === message.userId;
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 border border-gray-800 rounded-lg">
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={message.id || index}
            className={cn(
              "flex",
              isCurrentUserMessage(message) ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2",
                isCurrentUserMessage(message)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-100"
              )}
            >
              <p className="text-sm font-medium">
                {isCurrentUserMessage(message) ? "You" : message.username}
              </p>
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
        ))}
      </ScrollArea>
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-800 p-4 flex gap-2"
      >
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-900 border-gray-800 text-white"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!newMessage.trim() || !user}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
