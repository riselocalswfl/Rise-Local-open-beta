import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Filter, Sparkles, MapPin, Navigation, UserPlus, Ticket, Heart } from "lucide-react";
import Header from "@/components/Header";
import DealCard from "@/components/DealCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { Deal, Vendor } from "@shared/schema";
import { DEALS_QUERY_KEY } from "@/hooks/useDeals";
import { checkIsPassMember } from "@/lib/authUtils";

const SWFL_DEFAULT = { lat: 26.6406, lng: -81.8723 };

interface DealWithDistance extends Deal {
  distanceMiles?: number;
}

const CATEGORIES = [
  { value: "all", label: "What are you looking for?" },
  { value: "Food", label: "Food" },
  { value: "Retail", label: "Retail" },
  { value: "Beauty", label: "Beauty" },
  { value: "Fitness", label: "Fitness" },
  { value: "Services", label: "Services" },
  { value: "Experiences", label: "Experiences" },
];

const CITIES = [
  { value: "all", label: "Near you" },
  { value: "Fort Myers", label: "Fort Myers" },
  { value: "Cape Coral", label: "Cape Coral" },
  { value: "Bonita Springs", label: "Bonita Springs" },
  { value: "Estero", label: "Estero" },
  { value: "Naples", label: "Naples" },
];

const RADIUS_OPTIONS = [
  { value: "5", label: "5 miles" },
  { value: "10", label: "10 miles" },
  { value: "25", label: "25 miles" },
  { value: "50", label: "50 miles" },
];

type LocationState = {
  status: "idle" | "requesting" | "granted" | "denied" | "unavailable";
  coords: { lat: number; lng: number } | null;
};

export default function DealsPage() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  
  // Check if user has active Rise Local Pass membership
  const isPassMember = checkIsPassMember(user);
  const [category, setCategory] = useState("all");
  const [city, setCity] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [nearMeEnabled, setNearMeEnabled] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState("10");
  const [location, setLocation] = useState<LocationState>({
    status: "idle",
    coords: null,
  });
  const locationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if geolocation is available on mount (but don't request yet)
  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
      }
    };
  }, []);

  // Use default SWFL location as fallback
  const useDefaultLocation = () => {
    setLocation({
      status: "granted",
      coords: SWFL_DEFAULT,
    });
    setNearMeEnabled(true);
    setCity("all");
    toast({
      title: "Using SWFL area",
      description: "Showing deals near SWFL",
    });
  };

  // Request location when user enables Near Me
  const requestLocation = () => {
    // If geolocation not available, use default
    if (!navigator.geolocation) {
      useDefaultLocation();
      return;
    }

    // Clear any existing timeout
    if (locationTimeoutRef.current) {
      clearTimeout(locationTimeoutRef.current);
    }

    setLocation((prev) => ({ ...prev, status: "requesting" }));

    // Fallback timeout - if browser doesn't respond in 5 seconds, use default location
    locationTimeoutRef.current = setTimeout(() => {
      setLocation((prev) => {
        if (prev.status === "requesting") {
          // Use SWFL default when geolocation times out
          toast({
            title: "Using SWFL area",
            description: "Couldn't get your exact location. Showing deals near SWFL.",
          });
          return {
            status: "granted",
            coords: SWFL_DEFAULT,
          };
        }
        return prev;
      });
      setNearMeEnabled(true);
      setCity("all");
    }, 5000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Clear fallback timeout on success
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
        });
        setNearMeEnabled(true);
        setCity("all");
        toast({
          title: "Location found",
          description: "Showing deals near you",
        });
      },
      (error) => {
        // Clear fallback timeout on error
        if (locationTimeoutRef.current) {
          clearTimeout(locationTimeoutRef.current);
          locationTimeoutRef.current = null;
        }
        console.log("Geolocation error:", error.message);
        // Use default location on any error
        setLocation({
          status: "granted",
          coords: SWFL_DEFAULT,
        });
        setNearMeEnabled(true);
        setCity("all");
        toast({
          title: "Using SWFL area",
          description: error.code === 1 
            ? "Location access denied. Showing deals near SWFL." 
            : "Couldn't get your location. Showing deals near SWFL.",
        });
      },
      { timeout: 5000, maximumAge: 300000 } // 5 second timeout, cache for 5 minutes
    );
  };

  // Build query params
  const queryParams = new URLSearchParams();
  
  if (nearMeEnabled && location.coords) {
    queryParams.set("lat", location.coords.lat.toString());
    queryParams.set("lng", location.coords.lng.toString());
    queryParams.set("radiusMiles", radiusMiles);
  } else if (city !== "all") {
    queryParams.set("city", city);
  }
  
  if (category !== "all") queryParams.set("category", category);
  queryParams.set("isActive", "true");

  const queryString = queryParams.toString();

  const dealsFilters = {
    category: category !== "all" ? category : undefined,
    city: !nearMeEnabled && city !== "all" ? city : undefined,
    lat: nearMeEnabled && location.coords ? location.coords.lat : undefined,
    lng: nearMeEnabled && location.coords ? location.coords.lng : undefined,
    radiusMiles: nearMeEnabled && location.coords ? parseInt(radiusMiles) : undefined,
    isActive: true,
  };
  
  const { data: deals, isLoading: dealsLoading } = useQuery<DealWithDistance[]>({
    queryKey: [DEALS_QUERY_KEY, dealsFilters],
    queryFn: async () => {
      const res = await fetch(`/api/deals?${queryString}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deals");
      return res.json();
    },
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const vendorMap = vendors?.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {} as Record<string, Vendor>) || {};

  const filteredDeals = deals?.filter((deal) => {
    if (!searchTerm) return true;
    const vendor = vendorMap[deal.vendorId];
    const searchLower = searchTerm.toLowerCase();
    return (
      deal.title.toLowerCase().includes(searchLower) ||
      deal.description.toLowerCase().includes(searchLower) ||
      vendor?.businessName?.toLowerCase().includes(searchLower)
    );
  });

  const handleNearMeToggle = () => {
    if (nearMeEnabled) {
      // Turn off Near Me
      setNearMeEnabled(false);
    } else if (location.status === "granted" && location.coords) {
      // Already have location, just enable
      setNearMeEnabled(true);
      setCity("all");
    } else {
      // Request location (handles idle, denied, or unavailable states)
      requestLocation();
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setCategory("all");
    setCity("all");
    setNearMeEnabled(false);
    setRadiusMiles("10");
  };

  const hasActiveFilters = searchTerm || category !== "all" || city !== "all" || nearMeEnabled;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/90 to-primary py-16 md:py-24">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-4">
            <Sparkles className="w-12 h-12 text-white/90" />
          </div>
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-heading font-semibold text-white mb-4 [text-wrap:balance]">
            Shop Local. Save Money. Strengthen Your Community.
          </h1>
          <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto mb-8 leading-relaxed">
            Exclusive deals and perks from trusted Southwest Florida small businesses — all in one place.
          </p>
          
          {/* CTA Button */}
          {isAuthenticated ? (
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                document.getElementById("deals-filters")?.scrollIntoView({ behavior: "smooth" });
              }}
              data-testid="button-unlock-deals"
            >
              Unlock Local Deals
            </Button>
          ) : (
            <Link href="/auth">
              <Button
                size="lg"
                variant="secondary"
                data-testid="button-unlock-deals"
              >
                Unlock Local Deals
              </Button>
            </Link>
          )}
          
          {/* Trust Line */}
          <p className="text-meta text-white/70 mt-4">
            Supporting SWFL businesses
          </p>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-6 bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-body text-muted-foreground mb-3">
            Supporting 50+ local businesses across Southwest Florida
          </p>
          <div className="flex flex-wrap justify-center items-center gap-2 text-meta text-muted-foreground/80">
            <span className="px-3 py-1 rounded-full bg-muted">Food</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="px-3 py-1 rounded-full bg-muted">Shopping</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="px-3 py-1 rounded-full bg-muted">Wellness</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="px-3 py-1 rounded-full bg-muted">Services</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="px-3 py-1 rounded-full bg-muted">Events</span>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section id="deals-filters" className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3">
            {/* Top row: Search and filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search deals, businesses, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-deals"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-category">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Show City dropdown when Near Me is not active */}
              {!nearMeEnabled && (
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-city">
                    <MapPin className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Bottom row: Near Me toggle and radius */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={nearMeEnabled ? "default" : "outline"}
                size="sm"
                onClick={handleNearMeToggle}
                disabled={location.status === "requesting"}
                data-testid="button-near-me"
              >
                <Navigation className="w-4 h-4 mr-2" />
                {location.status === "requesting" ? "Getting location..." : "Near Me"}
              </Button>

              {nearMeEnabled && location.status === "granted" && (
                <Select value={radiusMiles} onValueChange={setRadiusMiles}>
                  <SelectTrigger className="w-[120px]" data-testid="select-radius">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RADIUS_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}


              {nearMeEnabled && (
                <Badge variant="secondary" className="text-xs">
                  Showing deals within {radiusMiles} miles
                </Badge>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Deals Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {dealsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : filteredDeals && filteredDeals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                vendor={vendorMap[deal.vendorId]}
                isPremiumUser={isPassMember}
                distanceMiles={deal.distanceMiles}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-section-header mb-2">No deals found</h3>
            <p className="text-body text-muted-foreground mb-4">
              {nearMeEnabled
                ? `No deals found within ${radiusMiles} miles. Try increasing the radius or switching to city-based search.`
                : hasActiveFilters
                ? "Try adjusting your filters to find more deals."
                : "Check back soon for new deals from local businesses!"}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearAllFilters}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </section>

      {/* How it Works Section */}
      <section className="py-10 md:py-12 bg-muted/30 border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl md:text-2xl font-heading font-semibold text-center mb-8 text-foreground">
            How it Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-deal-title text-foreground mb-1">Join Rise Local</h3>
              <p className="text-body text-muted-foreground">
                Get instant access to SWFL local deals
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Ticket className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-deal-title text-foreground mb-1">Show the Deal</h3>
              <p className="text-body text-muted-foreground">
                Redeem in-store or directly with the business
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-deal-title text-foreground mb-1">Feel Good Spending Local</h3>
              <p className="text-body text-muted-foreground">
                Save money while supporting your community
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
