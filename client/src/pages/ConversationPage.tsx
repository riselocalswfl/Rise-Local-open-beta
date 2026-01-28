import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, ArrowLeft, X } from "lucide-react";
import DetailHeader from "@/components/layout/DetailHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  vendorOwnerId: string | null;
  consumerName: string;
  consumerProfileImageUrl: string | null;
  consumerId: string;
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
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
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

  // When conversation is viewed, invalidate notification counts (messages are marked read on server)
  useEffect(() => {
    if (data) {
      queryClient.invalidateQueries({ queryKey: ["/api/b2c/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    }
  }, [data]);

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

  const { messages, vendorName, vendorLogoUrl, consumerName, consumerProfileImageUrl, userRole } = data;
  const otherPartyName = userRole === "consumer" ? vendorName : consumerName;
  const backHref = userRole === "vendor" ? "/dashboard" : "/messages";
  const otherPartyAvatar = userRole === "consumer" ? vendorLogoUrl : consumerProfileImageUrl;
  const otherPartyInitial = (otherPartyName || "?")[0].toUpperCase();

  const formatMessageTime = (dateStr: Date | string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Custom Chat Header */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href={backHref}>
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherPartyAvatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {otherPartyInitial}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold text-base" data-testid="text-conversation-name">
                {otherPartyName}
              </h1>
              <p className="text-xs text-muted-foreground">
                Typically responds in a few hours
              </p>
            </div>
          </div>
          <Link href={backHref}>
            <Button variant="ghost" size="icon" data-testid="button-close">
              <X className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-muted/30">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Start the conversation by sending a message</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMyMessage = 
              (userRole === "consumer" && msg.senderRole === "consumer") ||
              (userRole === "vendor" && msg.senderRole === "vendor");
            const isFromBusiness = msg.senderRole === "vendor";

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMyMessage ? "justify-end" : "justify-start"}`}
                data-testid={`message-${msg.id}`}
              >
                {/* Avatar for incoming messages (from the other party) */}
                {!isMyMessage && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={otherPartyAvatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {otherPartyInitial}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`flex flex-col ${isMyMessage ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[280px] rounded-2xl px-4 py-2.5 ${
                      isMyMessage
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border shadow-sm rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {formatMessageTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t bg-background p-4">
        {/* "Sending as" indicator for clarity */}
        <p className="text-xs text-muted-foreground mb-2 text-center" data-testid="text-sending-as">
          Sending as {userRole === "vendor" ? vendorName : "yourself"}
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="pr-4 rounded-full bg-muted/50 border-0"
              data-testid="input-message"
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessage.isPending}
            className="rounded-full px-6"
            data-testid="button-send"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
