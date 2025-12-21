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
import { Checkbox } from "@/components/ui/checkbox";
import type { Deal, Vendor, Category } from "@shared/schema";
import { DEALS_QUERY_KEY } from "@/hooks/useDeals";

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
  { id: "fort-myers", label: "Fort Myers", coords: { lat: 26.6406, lng: -81.8723 } },
  { id: "cape-coral", label: "Cape Coral", coords: { lat: 26.5629, lng: -81.9495 } },
  { id: "bonita-springs", label: "Bonita Springs", coords: { lat: 26.3398, lng: -81.7787 } },
  { id: "estero", label: "Estero", coords: { lat: 26.4384, lng: -81.8067 } },
  { id: "naples", label: "Naples", coords: { lat: 26.1420, lng: -81.7948 } },
];

// Get all city location IDs (excluding GPS)
const ALL_CITY_IDS = LOCATION_OPTIONS.filter(o => !o.isGPS).map(o => o.id);

type LocationState = {
  status: "idle" | "requesting" | "granted";
  coords: { lat: number; lng: number } | null;
  displayName: string;
  selectedIds: string[]; // Array of selected location IDs for multi-select
  isGPS?: boolean; // True when using GPS location
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
function filterUsedDeals(deals: ExtendedRiseLocalDeal[], usedIds: Set<string>): ExtendedRiseLocalDeal[] {
  return deals.filter(deal => !usedIds.has(deal.id));
}

// Mark deals as used (call this after slicing to only mark displayed deals)
function markDealsAsUsed(deals: ExtendedRiseLocalDeal[], usedIds: Set<string>): void {
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
    id: deal.id,
    title: deal.title,
    vendorId: deal.vendorId,
    vendorName: deal.vendor?.businessName || "Local Business",
    vendorCategory: deal.category || undefined,
    imageUrl: deal.imageUrl || deal.vendor?.logoUrl || undefined,
    savings,
    distance: distanceStr,
    rawDistance,
    redemptionWindow: "Redeem today",
    dealType,
    memberOnly: deal.isPassLocked === true || deal.tier === "premium" || deal.tier === "member",
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
    displayName: "All Areas",
    selectedIds: ALL_CITY_IDS, // Start with all cities selected
    isGPS: false,
  });
  const locationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user has Rise Local Pass membership
  // Use centralized membership check that accounts for expiration
  const isPassMember = user?.isPassMember === true && 
    (!user?.passExpiresAt || new Date(user.passExpiresAt) > new Date());
  
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
        description: "Using all areas as default.",
      });
      return;
    }

    setLocation(prev => ({ ...prev, status: "requesting" }));

    locationTimeoutRef.current = setTimeout(() => {
      setLocation(prev => {
        if (prev.status === "requesting") {
          toast({
            title: "Using all areas",
            description: "Couldn't get your exact location.",
          });
          return {
            status: "granted",
            coords: SWFL_DEFAULT,
            displayName: "All Areas",
            selectedIds: ALL_CITY_IDS,
            isGPS: false,
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
          selectedIds: [],
          isGPS: true,
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
          displayName: "All Areas",
          selectedIds: ALL_CITY_IDS,
          isGPS: false,
        });
        toast({
          title: "Using all areas",
          description: error.code === 1 
            ? "Location access denied." 
            : "Couldn't get your location.",
        });
      },
      { timeout: 5000, maximumAge: 300000 }
    );
  };

  // Toggle a location in multi-select
  const handleLocationToggle = (optionId: string) => {
    if (optionId === "current") {
      requestGPSLocation();
      return;
    }
    
    setLocation(prev => {
      const isSelected = prev.selectedIds.includes(optionId);
      let newSelectedIds: string[];
      
      if (isSelected) {
        // Remove from selection (but keep at least one)
        newSelectedIds = prev.selectedIds.filter(id => id !== optionId);
        if (newSelectedIds.length === 0) {
          // If removing would result in empty, select all instead
          newSelectedIds = ALL_CITY_IDS;
        }
      } else {
        // Add to selection, disable GPS mode
        newSelectedIds = [...prev.selectedIds, optionId];
      }
      
      // Calculate display name
      let displayName: string;
      if (newSelectedIds.length === ALL_CITY_IDS.length) {
        displayName = "All Areas";
      } else if (newSelectedIds.length === 1) {
        const opt = LOCATION_OPTIONS.find(o => o.id === newSelectedIds[0]);
        displayName = opt?.label || "Selected Area";
      } else if (newSelectedIds.length <= 2) {
        displayName = newSelectedIds.map(id => {
          const opt = LOCATION_OPTIONS.find(o => o.id === id);
          return opt?.label || id;
        }).join(", ");
      } else {
        displayName = `${newSelectedIds.length} Areas`;
      }
      
      // Use center point of SWFL for multiple selections
      return {
        status: "granted",
        coords: SWFL_DEFAULT,
        displayName,
        selectedIds: newSelectedIds,
        isGPS: false,
      };
    });
  };

  // Select all locations
  const handleSelectAll = () => {
    setLocation({
      status: "granted",
      coords: SWFL_DEFAULT,
      displayName: "All Areas",
      selectedIds: ALL_CITY_IDS,
      isGPS: false,
    });
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
  const dealsFilters = { lat: userCoords.lat, lng: userCoords.lng, radiusMiles: 25 };
  const { data: dealsData, isLoading: dealsLoading } = useQuery<(Deal & { vendor?: Vendor })[]>({
    queryKey: [DEALS_QUERY_KEY, dealsFilters],
    queryFn: async () => {
      const res = await fetch(`/api/deals?lat=${userCoords.lat}&lng=${userCoords.lng}&radiusMiles=25`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deals");
      const deals: Deal[] = await res.json();
      
      const dealsWithVendors = await Promise.all(
        deals.map(async (deal) => {
          try {
            const vendorRes = await fetch(`/api/vendors/${deal.vendorId}`, { credentials: "include" });
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
  const { memberExclusiveDeals, useTodayDeals, newBusinessDeals, popularDeals } = useMemo(() => {
    const usedIds = new Set<string>();
    
    // Member Exclusives Near You: member-only deals, sorted by distance then savings
    const memberExclusive = filteredDeals
      .filter(d => d.memberOnly)
      .sort((a, b) => {
        if (a.rawDistance !== b.rawDistance) return a.rawDistance - b.rawDistance;
        return b.savings - a.savings;
      });
    const memberExclusiveSliced = interleaveByVendor(memberExclusive).slice(0, 8);
    markDealsAsUsed(memberExclusiveSliced, usedIds);
    
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
      memberExclusiveDeals: memberExclusiveSliced,
      useTodayDeals: useTodaySliced,
      newBusinessDeals: newBusinessSliced,
      popularDeals: popularSliced,
    };
  }, [filteredDeals]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(prev => prev === categoryId ? null : categoryId);
  };

  const getSectionUrl = (section: string) => `/discover?section=${section}`;

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
          <h2 className="text-section-header text-foreground" data-testid={`heading-${testId}`}>
            {title}
          </h2>
          <Link href={getSectionUrl(sectionKey)}>
            <button
              className="flex items-center gap-1 text-body-emphasis text-primary"
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 p-1.5 rounded-full bg-primary/10">
              {location.status === "requesting" ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <MapPin className="w-4 h-4 text-primary" />
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2"
                  data-testid="button-location"
                >
                  <span className="text-deal-title text-foreground">
                    {location.status === "requesting" ? "Getting location..." : location.displayName}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  <span className="text-body-emphasis text-primary">Change</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 p-2">
                {/* GPS Option */}
                <div
                  className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-muted"
                  onClick={() => handleLocationToggle("current")}
                  data-testid="menu-item-location-current"
                >
                  <Navigation className="w-4 h-4 text-primary" />
                  <span className={`text-sm font-medium ${location.isGPS ? "text-primary" : ""}`}>
                    Use My Location
                  </span>
                  {location.isGPS && (
                    <span className="ml-auto text-xs text-primary">Active</span>
                  )}
                </div>
                
                <div className="border-t border-border my-2" />
                
                {/* Select All */}
                <div
                  className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-muted"
                  onClick={handleSelectAll}
                  data-testid="menu-item-location-all"
                >
                  <Checkbox 
                    checked={location.selectedIds.length === ALL_CITY_IDS.length && !location.isGPS}
                    className="pointer-events-none"
                  />
                  <span className="text-sm font-medium">All Areas</span>
                </div>
                
                {/* Individual Cities */}
                {LOCATION_OPTIONS.filter(o => !o.isGPS).map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-muted"
                    onClick={() => handleLocationToggle(option.id)}
                    data-testid={`menu-item-location-${option.id}`}
                  >
                    <Checkbox 
                      checked={location.selectedIds.includes(option.id) && !location.isGPS}
                      className="pointer-events-none"
                    />
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{option.label}</span>
                  </div>
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
            <Link href={isVendor ? "/dashboard" : "/profile"} data-testid="link-user-profile">
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
          <h2 className="text-section-header text-foreground" data-testid="heading-categories">
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
                  <span className="text-meta-emphasis text-center">{cat.label}</span>
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
            title="Use Today" 
            deals={useTodayDeals} 
            sectionKey="useToday"
            testId="use-today"
          />

          <DealSection 
            title="Member Exclusives Near You" 
            deals={memberExclusiveDeals} 
            sectionKey="memberExclusives"
            testId="member-exclusives"
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
