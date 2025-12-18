import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { MessageSquare, Search, X, Loader2 } from "lucide-react";
import DetailHeader from "@/components/layout/DetailHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

interface VendorSearchResult {
  id: number;
  businessName: string;
  bio?: string;
  logoUrl?: string;
  vendorType?: string;
}

export default function MessagesPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VendorSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const { data, isLoading } = useQuery<ConversationsResponse>({
    queryKey: ["/api/b2c/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/b2c/conversations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
  });

  // Handle search debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vendors/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const results = await res.json();
          setSearchResults(results);
          setShowResults(true);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

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

  // Start or navigate to conversation with a vendor
  const startConversationMutation = useMutation({
    mutationFn: async (vendorId: number) => {
      // First check if conversation already exists
      const conversations = data?.conversations || [];
      const existingConvo = conversations.find(c => String(c.conversation.vendorId) === String(vendorId));
      
      if (existingConvo) {
        return { conversationId: existingConvo.conversation.id, isExisting: true };
      }

      // Create new conversation by sending initial message
      const res = await apiRequest("POST", "/api/b2c/conversations", {
        vendorId: vendorId,
        message: "Hi, I'd like to learn more about your business!"
      });
      const result = await res.json();
      return { conversationId: result.conversationId, isExisting: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/b2c/conversations"] });
      setSearchQuery("");
      setShowResults(false);
      navigate(`/messages/${result.conversationId}`);
    },
    onError: (error) => {
      console.error("Failed to start conversation:", error);
    },
  });

  const handleSelectVendor = (vendor: VendorSearchResult) => {
    startConversationMutation.mutate(vendor.id);
  };

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
        {/* Business Search (consumers only) */}
        {userRole === "consumer" && (
          <div ref={searchRef} className="relative mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for a business to message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                className="pl-10 pr-10"
                data-testid="input-search-business"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setShowResults(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-clear-search"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <Card className="absolute z-50 w-full mt-1 shadow-lg max-h-64 overflow-auto">
                <CardContent className="p-2">
                  {searchResults.map((vendor) => (
                    <button
                      key={vendor.id}
                      onClick={() => handleSelectVendor(vendor)}
                      disabled={startConversationMutation.isPending}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover-elevate text-left disabled:opacity-50"
                      data-testid={`search-result-${vendor.id}`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={vendor.logoUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {vendor.businessName?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{vendor.businessName}</p>
                        {vendor.bio && (
                          <p className="text-xs text-muted-foreground truncate">{vendor.bio}</p>
                        )}
                      </div>
                      {startConversationMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* No results message */}
            {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
              <Card className="absolute z-50 w-full mt-1 shadow-lg">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">No businesses found</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No messages yet</h3>
            <p className="text-sm text-muted-foreground">
              {userRole === "consumer" 
                ? "Use the search bar above to find a business and start a conversation."
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
