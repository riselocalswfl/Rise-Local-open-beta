import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface Conversation {
  otherUserId: string;
  otherUserName: string;
  otherUserEmail: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

export default function Messages() {
  const { isAuthenticated } = useAuth();

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Sign in to view messages</h2>
          <p className="text-muted-foreground">
            You need to be signed in to access your messages.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2" data-testid="heading-messages">
          Messages
        </h1>
        <p className="text-muted-foreground">
          Communicate with vendors and customers
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : conversations && conversations.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No messages yet</h2>
          <p className="text-muted-foreground">
            Start a conversation by visiting a vendor's profile page
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations?.map((conversation) => (
            <Link
              key={conversation.otherUserId}
              href={`/messages/${conversation.otherUserId}`}
            >
              <Card
                className="p-4 hover-elevate active-elevate-2 cursor-pointer transition-colors"
                data-testid={`card-conversation-${conversation.otherUserId}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold truncate" data-testid={`text-name-${conversation.otherUserId}`}>
                        {conversation.otherUserName}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {conversation.unreadCount > 0 && (
                          <Badge
                            variant="default"
                            className="min-w-6 h-6 flex items-center justify-center px-2"
                            data-testid={`badge-unread-${conversation.otherUserId}`}
                          >
                            {conversation.unreadCount}
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(conversation.lastMessageTime), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                    <p
                      className="text-sm text-muted-foreground truncate"
                      data-testid={`text-last-message-${conversation.otherUserId}`}
                    >
                      {conversation.lastMessage}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
