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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const {
    messages,
    error: chatError,
    rateLimitError,
    rateLimitSeconds,
    isLoading: isChatLoading,
    sendMessage,
  } = useChat(activeMatchupId || "");

  const handleChatSelect = (matchupId: string) => {
    setActiveMatchupId(matchupId);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeMatchupId) return;

    if (!isAuthenticated || !user?.id) {
      console.error("User must be authenticated to send messages");
      return;
    }

    if (rateLimitError) {
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
    } catch (error: any) {
      console.error("Failed to send message:", error);
    }
  };

  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    scrollToBottom();
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
            <div className="space-y-4">
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
                <>
                  {messages.map((message) => {
                    const isOwnMessage = message.user_id === user?.id;
                    return (
                      <div
                        key={message._id}
                        className={`flex flex-col max-w-[80%] ${
                          isOwnMessage
                            ? "ml-auto items-end"
                            : "mr-auto items-start"
                        }`}
                      >
                        <div
                          className={`flex items-center gap-2 mb-1 ${
                            isOwnMessage ? "flex-row-reverse" : "flex-row"
                          }`}
                        >
                          <div className="h-6 w-6 rounded-full overflow-hidden flex-shrink-0 bg-gray-800">
                            {message.user_avatar ? (
                              <img
                                src={message.user_avatar}
                                alt={message.user_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                {message.user_name?.[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="text-sm text-gray-400 truncate">
                            {isOwnMessage ? "You" : message.user_name}
                          </span>
                        </div>
                        <div
                          className={`rounded-lg px-4 py-2 break-words whitespace-pre-wrap ${
                            isOwnMessage
                              ? "bg-blue-600 text-white"
                              : "bg-gray-700 text-gray-100"
                          }`}
                          style={{ maxWidth: "100%", width: "fit-content" }}
                        >
                          {message.content}
                        </div>
                        <span className="text-xs text-gray-500 mt-1">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </ScrollArea>

          {rateLimitError && (
            <div className="text-yellow-200 text-sm mb-2 flex items-center gap-2">
              <span className="text-yellow-400">⚠️</span>
              Woah slow down there. Please wait {rateLimitSeconds} seconds
              before sending another message.
            </div>
          )}

          <div className="flex">
            <Input
              type="text"
              placeholder={
                isAuthenticated
                  ? rateLimitError
                    ? "Please wait before sending another message..."
                    : "Type your message..."
                  : "Sign in to chat"
              }
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  handleSendMessage();
                }
              }}
              className="flex-grow mr-2"
              disabled={!isAuthenticated || !!rateLimitError}
            />
            <Button
              onClick={handleSendMessage}
              disabled={
                !isAuthenticated || !inputMessage.trim() || !!rateLimitError
              }
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
