import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { MessageSquare, User, Search, Store } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useState, useRef, useEffect } from "react";
import type { Vendor, User as UserType } from "@shared/schema";

interface SafeUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

interface Conversation {
  otherUserId: string;
  otherUserName: string;
  otherUserEmail: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

export default function Messages() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Check both isVendor flag and legacy role for backward compatibility
  const isVendor = user?.isVendor === true || user?.role === "vendor" || user?.role === "restaurant" || user?.role === "service_provider";

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: conversations, isLoading, error: conversationsError } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const response = await fetch("/api/conversations");
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("UNAUTHORIZED");
        }
        throw new Error("Failed to fetch conversations");
      }
      return response.json();
    },
    retry: (failureCount, error) => {
      // Don't retry on 401
      if (error.message === "UNAUTHORIZED") return false;
      return failureCount < 3;
    },
  });

  // Fetch vendors for buyer search
  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
    enabled: searchQuery.length > 0 && !isVendor,
  });

  // Fetch users for vendor search
  const { data: users } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
    enabled: searchQuery.length > 0 && isVendor,
  });

  const filteredVendors = vendors?.filter(vendor => {
    const query = searchQuery.toLowerCase();
    return (
      vendor.businessName.toLowerCase().includes(query) ||
      vendor.displayName?.toLowerCase().includes(query) ||
      vendor.tagline?.toLowerCase().includes(query) ||
      vendor.bio?.toLowerCase().includes(query) ||
      vendor.vendorType?.toLowerCase().includes(query) ||
      vendor.values?.some((val: string) => val.toLowerCase().includes(query))
    );
  }).slice(0, 5);

  const filteredUsers = users?.filter(u => {
    const query = searchQuery.toLowerCase();
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(query) ||
      u.email?.toLowerCase().includes(query)
    );
  }).slice(0, 5);

  // Show sign-in prompt only if we get a 401 error from the API
  if (conversationsError && conversationsError.message === "UNAUTHORIZED") {
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

  const handleContactClick = (userId: string) => {
    setSearchQuery("");
    setShowResults(false);
    setLocation(`/messages/${userId}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2" data-testid="heading-messages">
          Messages
        </h1>
        <p className="text-muted-foreground">
          Communicate with businesses and customers
        </p>
      </div>

      {/* Search to message */}
      <div className="mb-6 relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={isVendor ? "Search customers to message..." : "Search businesses to message..."}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(e.target.value.length > 0);
            }}
            onFocus={() => setShowResults(searchQuery.length > 0)}
            className="pl-10"
            data-testid="input-search-contacts"
          />
        </div>
        
        {showResults && searchQuery.length > 0 && (
          <Card className="absolute top-full mt-2 w-full z-10 max-h-80 overflow-y-auto bg-white shadow-lg">
            {isVendor ? (
              filteredUsers && filteredUsers.length > 0 ? (
                <div className="p-2">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleContactClick(u.id)}
                      className="flex items-center gap-3 p-3 rounded-md hover-elevate active-elevate-2 cursor-pointer"
                      data-testid={`result-user-${u.id}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">
                          {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email}
                        </h4>
                        {u.email && u.firstName && (
                          <p className="text-sm text-muted-foreground truncate">
                            {u.email}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No customers found
                </div>
              )
            ) : (
              filteredVendors && filteredVendors.length > 0 ? (
                <div className="p-2">
                  {filteredVendors.map((vendor) => (
                    <div
                      key={vendor.id}
                      onClick={() => handleContactClick(vendor.ownerId)}
                      className="flex items-center gap-3 p-3 rounded-md hover-elevate active-elevate-2 cursor-pointer"
                      data-testid={`result-vendor-${vendor.id}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Store className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{vendor.businessName}</h4>
                        {vendor.vendorType && (
                          <p className="text-sm text-muted-foreground truncate capitalize">
                            {vendor.vendorType}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No vendors found
                </div>
              )
            )}
          </Card>
        )}
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
