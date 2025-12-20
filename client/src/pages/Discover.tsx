import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "wouter";
import { ChevronDown, ChevronRight, Lock, MapPin, Navigation, Loader2, MessageSquare, Utensils, Heart, Home, ShoppingBag, Sparkles } from "lucide-react";
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
import type { Deal, Vendor, Category } from "@shared/schema";

// Map category icon strings from database to Lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Utensils,
  Heart,
  Home,
  ShoppingBag,
  Sparkles,
};

const SWFL_DEFAULT = { lat: 26.6406, lng: -81.8723 };

type LocationOption = {
  id: string;
  label: string;
  coords?: { lat: number; lng: number };
  isGPS?: boolean;
};

const LOCATION_OPTIONS: LocationOption[] = [
  { id: "current", label: "Use My Location", isGPS: true },
  { id: "swfl", label: "SWFL", coords: { lat: 26.6406, lng: -81.8723 } },
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
];

// CATEGORY_CHIPS are now fetched from the API

// Helper to calculate distance in miles using Haversine formula
function calculateDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Compute savings for a deal
function computeSavings(deal: Deal): number {
  if (deal.savingsAmount && deal.savingsAmount > 0) {
    return deal.savingsAmount;
  }
  if (deal.discountType === "PERCENT" && deal.discountValue) {
    return Math.round(deal.discountValue / 10);
  }
  if (deal.dealType === "bogo") {
    return 10;
  }
  if (deal.tier === "premium") {
    return 15;
  }
  return 5;
}

type ExtendedRiseLocalDeal = RiseLocalDeal & { 
  rawDistance: number; 
  createdAt: Date | null; 
  vendorCreatedAt: Date | null;
};

// Filter out deals that have already been used
function filterUsedDeals(deals: ExtendedRiseLocalDeal[], usedIds: Set<number>): ExtendedRiseLocalDeal[] {
  return deals.filter(deal => !usedIds.has(deal.id));
}

// Mark deals as used (call this after slicing to only mark displayed deals)
function markDealsAsUsed(deals: ExtendedRiseLocalDeal[], usedIds: Set<number>): void {
  deals.forEach(deal => usedIds.add(deal.id));
}

// Interleave deals to avoid same vendor appearing back-to-back
function interleaveByVendor(deals: ExtendedRiseLocalDeal[]): ExtendedRiseLocalDeal[] {
  if (deals.length <= 2) return deals;
  
  const result: ExtendedRiseLocalDeal[] = [];
  const remaining = [...deals];
  let lastVendorId: string | null = null;
  
  while (remaining.length > 0) {
    let foundDifferent = false;
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].vendorId !== lastVendorId) {
        const [deal] = remaining.splice(i, 1);
        result.push(deal);
        lastVendorId = deal.vendorId;
        foundDifferent = true;
        break;
      }
    }
    if (!foundDifferent && remaining.length > 0) {
      const deal = remaining.shift()!;
      result.push(deal);
      lastVendorId = deal.vendorId;
    }
  }
  return result;
}

// Transform API deal to RiseLocalDeal format
function transformDealToRiseLocal(
  deal: Deal & { vendor?: Vendor },
  userLat: number,
  userLng: number
): RiseLocalDeal & { rawDistance: number; createdAt: Date | null; vendorCreatedAt: Date | null } {
  const vendorLat = deal.vendor?.latitude ? parseFloat(deal.vendor.latitude) : null;
  const vendorLng = deal.vendor?.longitude ? parseFloat(deal.vendor.longitude) : null;
  
  let distanceStr = "SWFL";
  let rawDistance = 999;
  if (vendorLat && vendorLng) {
    rawDistance = calculateDistanceMiles(userLat, userLng, vendorLat, vendorLng);
    distanceStr = `${rawDistance.toFixed(1)} mi`;
  }
  
  let dealType: DealType = "value";
  if (deal.dealType === "bogo") dealType = "bogo";
  else if (deal.tier === "premium") dealType = "memberOnly";
  
  const isNew = deal.createdAt ? 
    (Date.now() - new Date(deal.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000 : false;
  
  const savings = computeSavings(deal);
  
  return {
    id: parseInt(deal.id.replace(/\D/g, '').slice(0, 8)) || Math.floor(Math.random() * 1000000),
    title: deal.title,
    vendorId: deal.vendorId,
    vendorName: deal.vendor?.businessName || "Local Business",
    vendorCategory: deal.category || undefined,
    imageUrl: deal.imageUrl || deal.vendor?.logoUrl || undefined,
    savings,
    distance: distanceStr,
    rawDistance,
    redemptionWindow: "Redeem anytime",
    dealType,
    memberOnly: deal.tier === "premium" || deal.isPassLocked === true,
    isNew,
    isFictitious: false,
    createdAt: deal.createdAt ? new Date(deal.createdAt) : null,
    vendorCreatedAt: deal.vendor?.createdAt ? new Date(deal.vendor.createdAt) : null,
  };
}

export default function Discover() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useState<LocationState>({
    status: "idle",
    coords: SWFL_DEFAULT,
    displayName: "SWFL",
  });
  const locationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user has Rise Local Pass membership
  const isPassMember = user?.isPassMember === true;
  
  // Check if user is a business owner
  const isVendor = user?.role === "vendor" || user?.role === "restaurant" || user?.role === "service_provider";

  useEffect(() => {
    return () => {
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
      }
    };
  }, []);

  const requestGPSLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location unavailable",
        description: "Using SWFL as default location.",
      });
      return;
    }

    setLocation(prev => ({ ...prev, status: "requesting" }));

    locationTimeoutRef.current = setTimeout(() => {
      setLocation(prev => {
        if (prev.status === "requesting") {
          toast({
            title: "Using SWFL area",
            description: "Couldn't get your exact location.",
          });
          return {
            status: "granted",
            coords: SWFL_DEFAULT,
            displayName: "SWFL",
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
          coords: SWFL_DEFAULT,
          displayName: "SWFL",
        });
        toast({
          title: "Using SWFL area",
          description: error.code === 1 
            ? "Location access denied." 
            : "Couldn't get your location.",
        });
      },
      { timeout: 5000, maximumAge: 300000 }
    );
  };

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

  const getUserInitials = () => {
    if (!user) return "?";
    const first = user.firstName?.charAt(0)?.toUpperCase() || "";
    const last = user.lastName?.charAt(0)?.toUpperCase() || "";
    if (first || last) return `${first}${last}`;
    return user.email?.charAt(0)?.toUpperCase() || "?";
  };

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/b2c/unread-count"],
    refetchInterval: 10000,
  });
  const { data: notificationData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 10000,
  });
  const totalUnread = (unreadData?.count || 0) + (notificationData?.count || 0);

  // Fetch categories from API - single source of truth
  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const userCoords = location.coords || SWFL_DEFAULT;
  const { data: dealsData, isLoading: dealsLoading } = useQuery<(Deal & { vendor?: Vendor })[]>({
    queryKey: ["/api/deals", "with-vendors", userCoords.lat, userCoords.lng],
    queryFn: async () => {
      const res = await fetch(`/api/deals?lat=${userCoords.lat}&lng=${userCoords.lng}&radiusMiles=25`);
      if (!res.ok) throw new Error("Failed to fetch deals");
      const deals: Deal[] = await res.json();
      
      const dealsWithVendors = await Promise.all(
        deals.map(async (deal) => {
          try {
            const vendorRes = await fetch(`/api/vendors/${deal.vendorId}`);
            if (vendorRes.ok) {
              const data = await vendorRes.json();
              return { ...deal, vendor: data.vendor };
            }
          } catch {}
          return deal;
        })
      );
      return dealsWithVendors;
    },
  });

  // Transform all deals
  const allTransformedDeals = useMemo(() => {
    if (!dealsData) return [];
    return dealsData.map(deal => transformDealToRiseLocal(deal, userCoords.lat, userCoords.lng));
  }, [dealsData, userCoords.lat, userCoords.lng]);

  // Apply top filter (All, Member-Only, Free)
  const filteredDeals = useMemo(() => {
    let deals = allTransformedDeals;
    
    if (selectedFilter === "memberOnly") {
      deals = deals.filter(d => d.memberOnly);
    } else if (selectedFilter === "free") {
      deals = deals.filter(d => !d.memberOnly);
    }
    
    // Apply category filter if selected
    if (selectedCategory) {
      deals = deals.filter(d => d.vendorCategory === selectedCategory);
    }
    
    return deals;
  }, [allTransformedDeals, selectedFilter, selectedCategory]);

  // Create sections with deduplication - only mark displayed deals as used
  const { bestValueDeals, useTodayDeals, newBusinessDeals, popularDeals } = useMemo(() => {
    const usedIds = new Set<number>();
    
    // Best Value Near You: savings >= $5, sorted by savings desc then distance asc
    const bestValue = filteredDeals
      .filter(d => d.savings >= 5)
      .sort((a, b) => {
        if (b.savings !== a.savings) return b.savings - a.savings;
        return a.rawDistance - b.rawDistance;
      });
    const bestValueSliced = interleaveByVendor(bestValue).slice(0, 8);
    markDealsAsUsed(bestValueSliced, usedIds);
    
    // Use Today: all remaining deals sorted by distance
    const useToday = filterUsedDeals(filteredDeals, usedIds)
      .sort((a, b) => a.rawDistance - b.rawDistance);
    const useTodaySliced = interleaveByVendor(useToday).slice(0, 8);
    markDealsAsUsed(useTodaySliced, usedIds);
    
    // New Local Businesses: vendors created within last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const newBusiness = filterUsedDeals(filteredDeals, usedIds)
      .filter(d => d.vendorCreatedAt && d.vendorCreatedAt.getTime() > thirtyDaysAgo)
      .sort((a, b) => {
        const aTime = a.vendorCreatedAt?.getTime() || 0;
        const bTime = b.vendorCreatedAt?.getTime() || 0;
        return bTime - aTime;
      });
    const newBusinessSliced = interleaveByVendor(newBusiness).slice(0, 8);
    markDealsAsUsed(newBusinessSliced, usedIds);
    
    // Popular With Locals: remaining deals (simulating popularity sort)
    const popular = filterUsedDeals(filteredDeals, usedIds)
      .sort((a, b) => {
        if (b.savings !== a.savings) return b.savings - a.savings;
        return a.rawDistance - b.rawDistance;
      });
    const popularSliced = interleaveByVendor(popular).slice(0, 8);
    markDealsAsUsed(popularSliced, usedIds);
    
    return {
      bestValueDeals: bestValueSliced,
      useTodayDeals: useTodaySliced,
      newBusinessDeals: newBusinessSliced,
      popularDeals: popularSliced,
    };
  }, [filteredDeals]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(prev => prev === categoryId ? null : categoryId);
  };

  const getSectionUrl = (section: string) => `/deals?section=${section}`;

  // Skeleton loader for deal cards
  const DealCardSkeleton = () => (
    <div className="flex-shrink-0 w-[180px]">
      <Skeleton className="aspect-[4/3] rounded-xl mb-2" />
      <Skeleton className="h-4 w-24 mb-1" />
      <Skeleton className="h-3 w-32" />
    </div>
  );

  const DealSection = ({ 
    title, 
    deals, 
    sectionKey, 
    testId 
  }: { 
    title: string; 
    deals: ExtendedRiseLocalDeal[]; 
    sectionKey: string;
    testId: string;
  }) => {
    if (deals.length === 0) return null;
    
    return (
      <section className="pt-6">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-lg font-semibold text-foreground" data-testid={`heading-${testId}`}>
            {title}
          </h2>
          <Link href={getSectionUrl(sectionKey)}>
            <button
              className="flex items-center gap-1 text-sm text-primary font-medium"
              data-testid={`link-see-all-${testId}`}
            >
              See all
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
        
        <ScrollArea className="w-full">
          <div className="flex gap-4 px-4 pb-4">
            {deals.map((deal) => (
              <RiseLocalDealCard key={deal.id} deal={deal} isMember={isPassMember} />
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </section>
    );
  };

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
            <Link href={isVendor ? "/account" : "/profile"} data-testid="link-user-profile">
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
              return (
                <button
                  key={chip.id}
                  onClick={() => setSelectedFilter(chip.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedFilter === chip.id
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground border border-border hover:bg-muted/80"
                  }`}
                  data-testid={`pill-filter-${chip.id}`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {chip.label}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </div>

      {/* Local Spotlight */}
      <LocalSpotlight />

      {/* Loading State */}
      {dealsLoading && (
        <section className="pt-6">
          <div className="px-4 mb-4">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="flex gap-4 px-4">
            {[1, 2, 3].map(i => <DealCardSkeleton key={i} />)}
          </div>
        </section>
      )}

      {/* Browse by Category */}
      <section className="pt-6 pb-4">
        <div className="px-4 mb-4">
          <h2 className="text-lg font-semibold text-foreground" data-testid="heading-categories">
            Browse by Category
          </h2>
        </div>
        <ScrollArea className="w-full">
          <div className="flex gap-3 px-4 pb-4">
            {(categoriesData || []).map((cat) => {
              const Icon = (cat.icon && ICON_MAP[cat.icon]) || Sparkles;
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.key)}
                  className={`flex-shrink-0 flex flex-col items-center gap-2 p-4 rounded-xl min-w-[100px] transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground border border-border hover:bg-muted/80"
                  }`}
                  data-testid={`category-${cat.key}`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-medium text-center leading-tight">{cat.label}</span>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </section>

      {/* Deal Sections */}
      {!dealsLoading && (
        <>
          <DealSection 
            title="Best Value Near You" 
            deals={bestValueDeals} 
            sectionKey="bestValue"
            testId="best-value"
          />

          <DealSection 
            title="Use Today" 
            deals={useTodayDeals} 
            sectionKey="useToday"
            testId="use-today"
          />

          {/* Membership Banner */}
          <MembershipBanner isMember={isPassMember} />

          <DealSection 
            title="New Local Businesses" 
            deals={newBusinessDeals} 
            sectionKey="newBusinesses"
            testId="new-businesses"
          />

          <DealSection 
            title="Popular With Locals" 
            deals={popularDeals} 
            sectionKey="popular"
            testId="popular"
          />

          {/* Empty state when no deals */}
          {filteredDeals.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-muted-foreground">
                No deals match your current filters. Try selecting "All Deals".
              </p>
            </div>
          )}
        </>
      )}

      <div className="h-4" />
    </div>
  );
}
