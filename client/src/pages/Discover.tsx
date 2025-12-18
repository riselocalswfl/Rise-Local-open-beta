import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "wouter";
import { Compass, ChevronDown, ChevronRight, Lock, MapPin, Navigation, Loader2, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import RiseLocalDealCard, { RiseLocalDeal, DealType } from "@/components/RiseLocalDealCard";
import MembershipBanner from "@/components/MembershipBanner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import LocalSpotlight from "@/components/LocalSpotlight";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Deal, Vendor } from "@shared/schema";

const FORT_MYERS_DEFAULT = { lat: 26.6406, lng: -81.8723 };

type LocationOption = {
  id: string;
  label: string;
  coords?: { lat: number; lng: number };
  isGPS?: boolean;
};

const LOCATION_OPTIONS: LocationOption[] = [
  { id: "current", label: "Use My Location", isGPS: true },
  { id: "fort-myers", label: "Fort Myers", coords: { lat: 26.6406, lng: -81.8723 } },
  { id: "cape-coral", label: "Cape Coral", coords: { lat: 26.5629, lng: -81.9495 } },
  { id: "bonita-springs", label: "Bonita Springs", coords: { lat: 26.3398, lng: -81.7787 } },
  { id: "estero", label: "Estero", coords: { lat: 26.4384, lng: -81.8067 } },
  { id: "naples", label: "Naples", coords: { lat: 26.1420, lng: -81.7948 } },
];

type LocationState = {
  status: "idle" | "requesting" | "granted";
  coords: { lat: number; lng: number } | null;
  displayName: string;
};

const FILTER_CHIPS = [
  { id: "all", label: "All Deals" },
  { id: "memberOnly", label: "Member-Only", icon: Lock },
  { id: "free", label: "Free Deals" },
  { id: "bogo", label: "BOGO" },
  { id: "value", label: "$5+ Value" },
  { id: "new", label: "New this week" },
  { id: "near", label: "Near me" },
];

// Helper to calculate distance in miles using Haversine formula
function calculateDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Transform API deal to RiseLocalDeal format
function transformDealToRiseLocal(
  deal: Deal & { vendor?: Vendor },
  userLat: number,
  userLng: number
): RiseLocalDeal {
  const vendorLat = deal.vendor?.latitude ? parseFloat(deal.vendor.latitude) : null;
  const vendorLng = deal.vendor?.longitude ? parseFloat(deal.vendor.longitude) : null;
  
  let distanceStr = "Fort Myers";
  if (vendorLat && vendorLng) {
    const distMiles = calculateDistanceMiles(userLat, userLng, vendorLat, vendorLng);
    distanceStr = `${distMiles.toFixed(1)} mi`;
  }
  
  // Map deal type
  let dealType: DealType = "value";
  if (deal.dealType === "bogo") dealType = "bogo";
  else if (deal.tier === "premium") dealType = "memberOnly";
  
  // Check if deal is new (created within last 7 days)
  const isNew = deal.createdAt ? 
    (Date.now() - new Date(deal.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000 : false;
  
  // Estimate savings based on deal type
  let savings = 5;
  if (deal.dealType === "bogo") savings = 10;
  else if (deal.tier === "premium") savings = 15;
  
  return {
    id: parseInt(deal.id.replace(/\D/g, '').slice(0, 8)) || Math.random() * 1000000,
    title: deal.title,
    vendorId: deal.vendorId,
    vendorName: deal.vendor?.businessName || "Local Business",
    vendorCategory: deal.category || undefined,
    imageUrl: deal.vendor?.logoUrl || undefined,
    savings,
    distance: distanceStr,
    redemptionWindow: "Redeem anytime",
    dealType,
    memberOnly: deal.tier === "premium",
    isNew,
    isFictitious: false,
  };
}

export default function Discover() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [userMembershipStatus] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useState<LocationState>({
    status: "idle",
    coords: FORT_MYERS_DEFAULT,
    displayName: "Fort Myers",
  });
  const locationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
      }
    };
  }, []);

  // Request GPS location
  const requestGPSLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location unavailable",
        description: "Using Fort Myers as default location.",
      });
      return;
    }

    setLocation(prev => ({ ...prev, status: "requesting" }));

    // Fallback timeout - 5 seconds
    locationTimeoutRef.current = setTimeout(() => {
      setLocation(prev => {
        if (prev.status === "requesting") {
          toast({
            title: "Using Fort Myers area",
            description: "Couldn't get your exact location.",
          });
          return {
            status: "granted",
            coords: FORT_MYERS_DEFAULT,
            displayName: "Fort Myers",
          };
        }
        return prev;
      });
    }, 5000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locationTimeoutRef.current) {
          clearTimeout(locationTimeoutRef.current);
          locationTimeoutRef.current = null;
        }
        setLocation({
          status: "granted",
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          displayName: "Current Location",
        });
        toast({
          title: "Location found",
          description: "Showing deals near you",
        });
      },
      (error) => {
        if (locationTimeoutRef.current) {
          clearTimeout(locationTimeoutRef.current);
          locationTimeoutRef.current = null;
        }
        setLocation({
          status: "granted",
          coords: FORT_MYERS_DEFAULT,
          displayName: "Fort Myers",
        });
        toast({
          title: "Using Fort Myers area",
          description: error.code === 1 
            ? "Location access denied." 
            : "Couldn't get your location.",
        });
      },
      { timeout: 5000, maximumAge: 300000 }
    );
  };

  // Handle location selection from dropdown
  const handleLocationSelect = (optionId: string) => {
    if (optionId === "current") {
      requestGPSLocation();
    } else {
      const option = LOCATION_OPTIONS.find(o => o.id === optionId);
      if (option && option.coords) {
        setLocation({
          status: "granted",
          coords: option.coords,
          displayName: option.label,
        });
        toast({
          title: `Location set to ${option.label}`,
          description: "Showing nearby deals",
        });
      }
    }
  };

  // Handle Near Me filter chip click
  const handleNearMeFilter = () => {
    if (location.status !== "granted" || location.displayName !== "Current Location") {
      requestGPSLocation();
    }
    setSelectedFilter("near");
  };

  // Generate user initials from first and last name
  const getUserInitials = () => {
    if (!user) return "?";
    const first = user.firstName?.charAt(0)?.toUpperCase() || "";
    const last = user.lastName?.charAt(0)?.toUpperCase() || "";
    if (first || last) return `${first}${last}`;
    // Fallback to email initial if no name
    return user.email?.charAt(0)?.toUpperCase() || "?";
  };

  // Fetch unread message + notification count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/b2c/unread-count"],
    refetchInterval: 10000,
  });
  const { data: notificationData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 10000,
  });
  const totalUnread = (unreadData?.count || 0) + (notificationData?.count || 0);

  // Fetch real deals from API with vendor info
  const userCoords = location.coords || FORT_MYERS_DEFAULT;
  const { data: dealsData, isLoading: dealsLoading } = useQuery<(Deal & { vendor?: Vendor })[]>({
    queryKey: ["/api/deals", "with-vendors", userCoords.lat, userCoords.lng],
    queryFn: async () => {
      const res = await fetch(`/api/deals?lat=${userCoords.lat}&lng=${userCoords.lng}&radiusMiles=25`);
      if (!res.ok) throw new Error("Failed to fetch deals");
      const deals: Deal[] = await res.json();
      
      // Fetch vendor info for each deal
      const dealsWithVendors = await Promise.all(
        deals.map(async (deal) => {
          try {
            const vendorRes = await fetch(`/api/vendors/${deal.vendorId}`);
            if (vendorRes.ok) {
              const data = await vendorRes.json();
              // API returns { vendor, deals } so extract vendor
              return { ...deal, vendor: data.vendor };
            }
          } catch {}
          return deal;
        })
      );
      return dealsWithVendors;
    },
  });

  // Transform API deals to RiseLocalDeal format
  const allDeals = useMemo(() => {
    if (!dealsData) return [];
    return dealsData.map(deal => transformDealToRiseLocal(deal, userCoords.lat, userCoords.lng));
  }, [dealsData, userCoords.lat, userCoords.lng]);

  const filterDeals = (deals: RiseLocalDeal[], filter: string): RiseLocalDeal[] => {
    if (filter === "all") return deals;
    if (filter === "memberOnly") return deals.filter((d) => d.memberOnly);
    if (filter === "free") return deals.filter((d) => !d.memberOnly);
    if (filter === "bogo") return deals.filter((d) => d.dealType === "bogo");
    if (filter === "value") return deals.filter((d) => d.savings >= 5);
    if (filter === "new") return deals.filter((d) => d.isNew);
    if (filter === "near") return deals.filter((d) => parseFloat(d.distance) <= 0.5);
    return deals;
  };

  // Categorize deals into sections
  const memberExclusives = useMemo(() => {
    const filtered = allDeals.filter(d => d.memberOnly);
    return filterDeals(filtered, selectedFilter === "memberOnly" ? "all" : selectedFilter).slice(0, 6);
  }, [allDeals, selectedFilter]);

  const bestValue = useMemo(() => {
    const filtered = allDeals.filter(d => d.savings >= 5 && !d.memberOnly);
    return filterDeals(filtered, selectedFilter === "value" ? "all" : selectedFilter).slice(0, 6);
  }, [allDeals, selectedFilter]);

  const newSpots = useMemo(() => {
    const filtered = allDeals.filter(d => d.isNew);
    return filterDeals(filtered, selectedFilter === "new" ? "all" : selectedFilter).slice(0, 6);
  }, [allDeals, selectedFilter]);

  const getFilterUrl = (filter: string) => `/browse?filter=${filter}`;

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* Location Bar */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            {location.status === "requesting" ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <MapPin className="w-5 h-5 text-primary" />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1 text-sm font-medium"
                  data-testid="button-location"
                >
                  <span className="text-foreground">
                    {location.status === "requesting" ? "Getting location..." : location.displayName}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {LOCATION_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.id}
                    onClick={() => handleLocationSelect(option.id)}
                    data-testid={`menu-item-location-${option.id}`}
                  >
                    {option.isGPS ? (
                      <Navigation className="w-4 h-4 mr-2" />
                    ) : (
                      <MapPin className="w-4 h-4 mr-2" />
                    )}
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/messages" data-testid="link-messages">
              <div className="relative cursor-pointer p-2 rounded-full hover-elevate">
                <MessageSquare className="w-5 h-5 text-foreground" />
                {totalUnread > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1 text-xs"
                    data-testid="badge-unread-messages"
                  >
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </Badge>
                )}
              </div>
            </Link>
            <Link href="/profile" data-testid="link-user-profile">
              <Avatar className="w-8 h-8 cursor-pointer hover-elevate">
                <AvatarImage src={user?.profileImageUrl || undefined} alt="Profile" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      {/* Filter Chips */}
      <div className="border-b border-border bg-background">
        <ScrollArea className="w-full">
          <div className="flex gap-2 px-4 py-3">
            {FILTER_CHIPS.map((chip) => {
              const Icon = chip.icon;
              const isNearMe = chip.id === "near";
              return (
                <button
                  key={chip.id}
                  onClick={() => isNearMe ? handleNearMeFilter() : setSelectedFilter(chip.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedFilter === chip.id
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground border border-border hover:bg-muted/80"
                  }`}
                  data-testid={`pill-filter-${chip.id}`}
                >
                  {isNearMe && <Navigation className="w-3 h-3" />}
                  {Icon && !isNearMe && <Icon className="w-3 h-3" />}
                  {chip.label}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </div>

      {/* Local Spotlight - Sponsored Business */}
      <LocalSpotlight />

      {/* Member Exclusives Section */}
      <section className="pt-6">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-lg font-semibold text-foreground" data-testid="heading-member-exclusives">
            Member Exclusives Near You
          </h2>
          <Link href={getFilterUrl("memberOnly")}>
            <button
              className="flex items-center gap-1 text-sm text-primary font-medium"
              data-testid="link-see-all-member-exclusives"
            >
              See all
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
        
        {memberExclusives.length > 0 ? (
          <ScrollArea className="w-full">
            <div className="flex gap-4 px-4 pb-4">
              {memberExclusives.map((deal) => (
                <RiseLocalDealCard key={deal.id} deal={deal} isMember={userMembershipStatus} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        ) : (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No deals match this filter. Try "All Deals".
          </div>
        )}
      </section>

      {/* Membership Banner */}
      <MembershipBanner isMember={userMembershipStatus} />

      {/* Best Value Section */}
      <section className="pt-2">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-lg font-semibold text-foreground" data-testid="heading-best-value">
            Best Value Right Now ($5+ savings)
          </h2>
          <Link href={getFilterUrl("value")}>
            <button
              className="flex items-center gap-1 text-sm text-primary font-medium"
              data-testid="link-see-all-best-value"
            >
              See all
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {bestValue.length > 0 ? (
          <ScrollArea className="w-full">
            <div className="flex gap-4 px-4 pb-4">
              {bestValue.map((deal) => (
                <RiseLocalDealCard key={deal.id} deal={deal} isMember={userMembershipStatus} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        ) : (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No deals match this filter. Try "All Deals".
          </div>
        )}
      </section>

      {/* New Local Spots Section */}
      <section className="pt-6">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-lg font-semibold text-foreground" data-testid="heading-new-spots">
            New Local Spots Added
          </h2>
          <Link href={getFilterUrl("new")}>
            <button
              className="flex items-center gap-1 text-sm text-primary font-medium"
              data-testid="link-see-all-new-spots"
            >
              See all
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {newSpots.length > 0 ? (
          <ScrollArea className="w-full">
            <div className="flex gap-4 px-4 pb-4">
              {newSpots.map((deal) => (
                <RiseLocalDealCard key={deal.id} deal={deal} isMember={userMembershipStatus} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        ) : (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No deals match this filter. Try "All Deals".
          </div>
        )}
      </section>

      {/* Additional spacing for bottom nav */}
      <div className="h-4" />
    </div>
  );
}
