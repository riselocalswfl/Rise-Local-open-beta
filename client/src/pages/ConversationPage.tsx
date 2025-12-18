import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, Lock, ArrowRight } from "lucide-react";
import DetailHeader from "@/components/layout/DetailHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ConversationMessage } from "@shared/schema";
import { Link } from "wouter";

interface ConversationData {
  conversation: {
    id: string;
    consumerId: string;
    vendorId: string;
    dealId: string | null;
  };
  messages: ConversationMessage[];
  vendorName: string;
  vendorLogoUrl: string | null;
  consumerName: string;
  userRole: "consumer" | "vendor";
}

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error, refetch } = useQuery<ConversationData>({
    queryKey: ["/api/b2c/conversations", conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/b2c/conversations/${conversationId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch conversation");
      }
      return res.json();
    },
    enabled: !!conversationId,
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest(
        "POST",
        `/api/b2c/conversations/${conversationId}/messages`,
        { content }
      );
      if (!res.ok) {
        const err = await res.json();
        if (err.code === "SUBSCRIPTION_REQUIRED") {
          throw new Error("SUBSCRIPTION_REQUIRED");
        }
        throw new Error(err.error || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: () => {
      setNewMessage("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/b2c/unread-count"] });
    },
    onError: (error: Error) => {
      if (error.message === "SUBSCRIPTION_REQUIRED") {
        toast({
          title: "Subscription Required",
          description: "Upgrade to Rise Local to message customers",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to send message",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage.mutate(newMessage.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <DetailHeader title="Loading..." />
        <div className="flex-1 px-4 py-4 space-y-4">
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-16 w-1/2 ml-auto" />
          <Skeleton className="h-16 w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader title="Conversation" />
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">
            {error?.message || "Conversation not found"}
          </p>
          <Link href="/messages">
            <Button data-testid="button-back-to-messages">Back to Messages</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { messages, vendorName, vendorLogoUrl, consumerName, userRole } = data;
  const otherPartyName = userRole === "consumer" ? vendorName : consumerName;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DetailHeader 
        title={otherPartyName} 
        backHref={userRole === "vendor" ? "/dashboard" : "/messages"}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Start the conversation by sending a message</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMyMessage = 
              (userRole === "consumer" && msg.senderRole === "consumer") ||
              (userRole === "vendor" && msg.senderRole === "vendor");

            return (
              <div
                key={msg.id}
                className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}
                data-testid={`message-${msg.id}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isMyMessage
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${
                    isMyMessage ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}>
                    {msg.createdAt
                      ? new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-background p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
            data-testid="input-message"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessage.isPending}
            size="icon"
            data-testid="button-send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
