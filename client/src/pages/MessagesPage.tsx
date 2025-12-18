import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MessageSquare } from "lucide-react";
import DetailHeader from "@/components/layout/DetailHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ConversationItem {
  conversation: {
    id: string;
    consumerId: string;
    vendorId: string;
    dealId: string | null;
  };
  vendorName?: string;
  vendorLogoUrl?: string | null;
  consumerName?: string;
  lastMessage: string;
  lastMessageAt: Date | string;
  unreadCount: number;
}

interface ConversationsResponse {
  role: "consumer" | "vendor";
  conversations: ConversationItem[];
}

export default function MessagesPage() {
  const { data, isLoading } = useQuery<ConversationsResponse>({
    queryKey: ["/api/b2c/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/b2c/conversations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
  });

  const formatTime = (dateStr: Date | string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader title="Messages" />
        <div className="px-4 py-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const conversations = data?.conversations || [];
  const userRole = data?.role || "consumer";

  return (
    <div className="min-h-screen bg-background">
      <DetailHeader title="Messages" />

      <main className="px-4 py-4">
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No messages yet</h3>
            <p className="text-sm text-muted-foreground">
              {userRole === "consumer" 
                ? "Start a conversation by messaging a business from their profile or a deal page."
                : "Customers will appear here when they message your business."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((item) => {
              const displayName = userRole === "consumer" 
                ? item.vendorName 
                : item.consumerName;
              const avatarUrl = userRole === "consumer" ? item.vendorLogoUrl : null;

              return (
                <Link 
                  key={item.conversation.id} 
                  href={`/messages/${item.conversation.id}`}
                >
                  <Card className="hover-elevate cursor-pointer" data-testid={`conversation-${item.conversation.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {(displayName || "?")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-medium truncate" data-testid="text-name">
                              {displayName || "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatTime(item.lastMessageAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-muted-foreground truncate" data-testid="text-preview">
                              {item.lastMessage || "No messages yet"}
                            </p>
                            {item.unreadCount > 0 && (
                              <Badge className="flex-shrink-0" data-testid="badge-unread">
                                {item.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
