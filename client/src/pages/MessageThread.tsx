import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Send, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function MessageThread() {
  const [, params] = useRoute("/messages/:userId");
  const otherUserId = params?.userId;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  interface Conversation {
    otherUserId: string;
    otherUserName: string;
    otherUserEmail: string;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount: number;
  }

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: messages, isLoading, error: messagesError } = useQuery<Message[]>({
    queryKey: ["/api/messages", otherUserId],
    queryFn: async () => {
      const response = await fetch(`/api/messages/${otherUserId}`);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("UNAUTHORIZED");
        }
        throw new Error("Failed to fetch messages");
      }
      return response.json();
    },
    enabled: !!otherUserId,
    refetchInterval: 5000, // Poll every 5 seconds for new messages
    retry: (failureCount, error) => {
      // Don't retry on 401
      if (error.message === "UNAUTHORIZED") return false;
      return failureCount < 3;
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/messages", {
        receiverId: otherUserId,
        content,
        isRead: false,
      });
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages", otherUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      // Optimistic scroll to bottom after sending
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Show sign-in prompt only if we get a 401 error from the API
  if (messagesError && messagesError.message === "UNAUTHORIZED") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Sign in to view messages</h2>
          <p className="text-muted-foreground">
            You need to be signed in to access your messages.
          </p>
        </Card>
      </div>
    );
  }

  // Get other user's name from conversations
  const conversation = conversations?.find(c => c.otherUserId === otherUserId);
  const otherUserName = conversation?.otherUserName || "User";

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/messages">
          <Button
            variant="ghost"
            size="icon"
            data-testid="button-back-to-messages"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold" data-testid="heading-conversation">
            {otherUserName}
          </h1>
        </div>
      </div>

      {/* Messages */}
      <Card className="flex-1 p-4 mb-4 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-16 w-3/4 ml-auto" />
            <Skeleton className="h-16 w-3/4" />
          </div>
        ) : messages && messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages?.map((message) => {
              const isOwnMessage = message.senderId === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${message.id}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      isOwnMessage
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatDistanceToNow(new Date(message.createdAt!), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </Card>

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="resize-none"
          rows={2}
          data-testid="input-message"
        />
        <Button
          onClick={handleSend}
          disabled={!messageText.trim() || sendMessageMutation.isPending}
          size="icon"
          className="h-auto"
          data-testid="button-send-message"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
