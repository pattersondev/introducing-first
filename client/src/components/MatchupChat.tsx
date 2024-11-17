import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Matchup } from "@/types/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";

interface MatchupChatProps {
  matchups: Matchup[];
}

export function MatchupChat({ matchups }: MatchupChatProps) {
  const [activeMatchupId, setActiveMatchupId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const {
    messages,
    error: chatError,
    isLoading: isChatLoading,
    sendMessage,
  } = useChat(activeMatchupId || "");

  const handleChatSelect = (matchupId: string) => {
    setActiveMatchupId(matchupId);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeMatchupId) return;

    // Ensure user is authenticated and we have user data
    if (!isAuthenticated || !user?.id) {
      console.error("User must be authenticated to send messages");
      return;
    }

    try {
      await sendMessage(
        inputMessage.trim(),
        user.id,
        user.username,
        user.avatar
      );
      setInputMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Show loading state while checking auth
  if (isAuthLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 h-full flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 h-full flex flex-col w-full">
      <div className="mb-4">
        <Select
          onValueChange={handleChatSelect}
          value={activeMatchupId || undefined}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a matchup chat" />
          </SelectTrigger>
          <SelectContent>
            {matchups.map((matchup) => (
              <SelectItem key={matchup.matchup_id} value={matchup.matchup_id}>
                {matchup.fighter1_name} vs {matchup.fighter2_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeMatchupId ? (
        <div className="flex-grow flex flex-col">
          <ScrollArea className="flex-grow w-full rounded border border-gray-800 p-4 mb-4 h-[400px]">
            <div ref={scrollAreaRef} className="space-y-2">
              {isChatLoading ? (
                <div className="text-gray-500">Loading messages...</div>
              ) : chatError ? (
                <div className="text-red-400">{chatError}</div>
              ) : messages.length === 0 ? (
                <div className="text-gray-500">
                  No messages yet.{" "}
                  {isAuthenticated
                    ? "Start the conversation!"
                    : "Sign in to chat."}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message._id}
                    className={`mb-2 ${
                      message.user_id === user?.id ? "ml-auto" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {message.user_avatar && (
                        <img
                          src={message.user_avatar}
                          alt={message.user_name}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span className="font-bold text-white">
                        {message.user_name}
                        {message.user_id === user?.id ? " (You)" : ""}:
                      </span>
                    </div>
                    <div className="ml-8">
                      <span className="text-gray-300">{message.content}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="flex mt-auto">
            <Input
              type="text"
              placeholder={
                isAuthenticated ? "Type your message..." : "Sign in to chat"
              }
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  handleSendMessage();
                }
              }}
              className="flex-grow mr-2"
              disabled={!isAuthenticated}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!isAuthenticated || !inputMessage.trim()}
            >
              Send
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center text-gray-500">
          Select a matchup to start chatting
        </div>
      )}
    </div>
  );
}
