import { useState, useMemo, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, X, Tag, MapPin, Percent, DollarSign, Gift, Lock, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import type { Deal, Vendor } from "@shared/schema";
import placeholderImage from "@assets/stock_images/local_store_shopping_d3918e51.jpg";

const DEALS_QUERY_KEY = "/api/deals";

const SWFL_DEFAULT = { lat: 26.6406, lng: -81.8723 };

const DEAL_TYPES = [
  { value: "all", label: "All Deals" },
  { value: "percent_off", label: "% Off" },
  { value: "amount_off", label: "$ Off" },
  { value: "bogo", label: "BOGO" },
  { value: "free_item", label: "Free Item" },
];

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "shop", label: "Shop" },
  { value: "dine", label: "Dine" },
  { value: "service", label: "Service" },
];

interface BrowseDealCardProps {
  deal: Deal & { vendor?: Vendor };
  isPassMember: boolean;
}

function getFrequencyLabel(frequency?: string | null, customDays?: number | null): string | null {
  switch (frequency) {
    case "once": return "1x only";
    case "weekly": return "1x/week";
    case "monthly": return "1x/month";
    case "custom": return customDays ? `1x/${customDays}d` : null;
    case "unlimited": return null;
    default: return null;
  }
}

function getSavingsLabel(savings: number, discountType?: string | null, discountValue?: number | null): string {
  if (discountType === "PERCENT" && discountValue && discountValue > 0) {
    return `Save ${Math.round(discountValue)}%`;
  }
  return `Save $${savings}`;
}

function BrowseDealCard({ deal, isPassMember }: BrowseDealCardProps) {
  const [, setLocation] = useLocation();
  const [imageIndex, setImageIndex] = useState(0);
  const isLocked = deal.isPassLocked && !isPassMember;
  
  const imageFallbackChain = [
    deal.imageUrl,
    deal.vendor?.bannerUrl,
    deal.vendor?.logoUrl,
    placeholderImage,
  ].filter((url): url is string => Boolean(url));
  
  const currentImage = imageFallbackChain[imageIndex] || placeholderImage;
  
  const handleImageError = useCallback(() => {
    if (imageIndex < imageFallbackChain.length - 1) {
      setImageIndex(prev => prev + 1);
    }
  }, [imageIndex, imageFallbackChain.length]);

  const handleUnlockClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocation("/membership");
  }, [setLocation]);
  
  const businessName = deal.vendor?.businessName || "Local Business";
  const savings = deal.savingsAmount || 0;
  
  const cardContent = (
    <Card className="hover-elevate active-elevate-2 h-full relative overflow-hidden" data-testid={`card-deal-${deal.id}`}>
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        <img
          src={currentImage}
          alt={deal.title}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isLocked ? 'blur-[3px]' : ''}`}
          onError={handleImageError}
          data-testid={`img-deal-${deal.id}`}
        />
        {savings > 0 && !isLocked && (
          <div className="absolute bottom-1.5 left-1.5">
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0.5 bg-background/90 backdrop-blur-sm border-primary/20 text-foreground font-semibold"
              data-testid={`badge-savings-${deal.id}`}
            >
              {getSavingsLabel(savings, deal.discountType, deal.discountValue)}
            </Badge>
          </div>
        )}
        {isLocked && (
          <div className="absolute inset-0 bg-background/40 flex flex-col items-center justify-between py-2">
            <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-sm rounded-full px-2.5 py-1">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-medium text-foreground">Rise Local Pass</span>
              <Button 
                size="sm" 
                className="text-[9px] h-5 px-2 ml-0.5" 
                onClick={handleUnlockClick}
                data-testid={`button-unlock-${deal.id}`}
              >
                Join
              </Button>
            </div>
            {savings > 0 && (
              <Badge 
                variant="outline" 
                className="text-[10px] px-1.5 py-0.5 bg-background/90 backdrop-blur-sm border-primary/20 text-foreground font-semibold"
                data-testid={`badge-savings-locked-${deal.id}`}
              >
                {getSavingsLabel(savings, deal.discountType, deal.discountValue)}
              </Badge>
            )}
          </div>
        )}
      </div>
      
      <CardContent className="p-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Avatar className="w-5 h-5 flex-shrink-0" data-testid={`avatar-vendor-${deal.id}`}>
            <AvatarImage src={deal.vendor?.logoUrl || undefined} alt={businessName} />
            <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-semibold">
              {businessName?.charAt(0)?.toUpperCase() || "B"}
            </AvatarFallback>
          </Avatar>
          <p className="text-xs font-semibold text-foreground truncate" data-testid={`deal-vendor-${deal.id}`}>
            {businessName}
          </p>
        </div>
        <h3 className="text-xs text-muted-foreground line-clamp-2 mb-1.5" data-testid={`deal-title-${deal.id}`}>
          {deal.title}
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-0.5 max-w-full">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{deal.city || deal.vendor?.city || "SWFL"}</span>
          </span>
          {getFrequencyLabel(deal.redemptionFrequency, deal.customRedemptionDays) && (
            <span className="flex items-center gap-0.5" data-testid={`text-frequency-${deal.id}`}>
              <RefreshCw className="w-2.5 h-2.5 flex-shrink-0" />
              <span>{getFrequencyLabel(deal.redemptionFrequency, deal.customRedemptionDays)}</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
  
  if (isLocked) {
    return cardContent;
  }
  
  return (
    <Link href={`/deals/${deal.id}`} data-testid={`link-deal-${deal.id}`}>
      {cardContent}
    </Link>
  );
}

export default function Browse() {
  const [pathLocation] = useLocation();
  const searchParams = new URLSearchParams(pathLocation.split("?")[1] || "");
  const section = searchParams.get("section");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDealType, setSelectedDealType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  
  const { user } = useAuth();
  // Use centralized membership check that accounts for expiration
  const isPassMember = user?.isPassMember === true && 
    (!user?.passExpiresAt || new Date(user.passExpiresAt) > new Date());

  const getTitle = () => {
    switch (section) {
      case "top-picks":
        return "Top picks near you";
      case "pickup-now":
        return "Pick up now";
      case "best-value":
        return "Best Value Deals";
      case "use-today":
        return "Use Today";
      case "new-businesses":
        return "New Local Businesses";
      case "popular":
        return "Popular With Locals";
      default:
        return "Browse All Deals";
    }
  };

  const { data: dealsData, isLoading } = useQuery<(Deal & { vendor?: Vendor })[]>({
    queryKey: [DEALS_QUERY_KEY, "browse"],
    queryFn: async () => {
      const res = await fetch(`/api/deals?lat=${SWFL_DEFAULT.lat}&lng=${SWFL_DEFAULT.lng}&radiusMiles=50`, { 
        credentials: "include" 
      });
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

  const filteredDeals = useMemo(() => {
    if (!dealsData) return [];
    
    let deals = dealsData;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      deals = deals.filter(deal => 
        deal.title.toLowerCase().includes(query) ||
        deal.description.toLowerCase().includes(query) ||
        deal.vendor?.businessName?.toLowerCase().includes(query)
      );
    }
    
    if (selectedCategory !== "all") {
      deals = deals.filter(deal => deal.vendor?.vendorType === selectedCategory);
    }
    
    if (selectedDealType !== "all") {
      deals = deals.filter(deal => deal.dealType === selectedDealType);
    }
    
    return deals.sort((a, b) => {
      if ((b.savingsAmount || 0) !== (a.savingsAmount || 0)) {
        return (b.savingsAmount || 0) - (a.savingsAmount || 0);
      }
      return 0;
    });
  }, [dealsData, searchQuery, selectedCategory, selectedDealType]);

  const getDealTypeIcon = (dealType: string) => {
    switch (dealType) {
      case "percent_off": return Percent;
      case "amount_off": return DollarSign;
      case "bogo": return Gift;
      case "free_item": return Gift;
      default: return Tag;
    }
  };

  const activeFiltersCount = (selectedCategory !== "all" ? 1 : 0) + (selectedDealType !== "all" ? 1 : 0);

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedDealType("all");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="px-4 py-3">
          <h1 className="text-xl font-semibold text-foreground mb-3" data-testid="heading-browse">
            {getTitle()}
          </h1>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-browse"
              />
            </div>
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative" data-testid="button-filter">
                  <Filter className="w-4 h-4" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Filter Deals</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Category</h3>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => (
                        <Button
                          key={cat.value}
                          variant={selectedCategory === cat.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCategory(cat.value)}
                          data-testid={`filter-category-${cat.value}`}
                        >
                          {cat.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-3">Deal Type</h3>
                    <div className="flex flex-wrap gap-2">
                      {DEAL_TYPES.map((type) => (
                        <Button
                          key={type.value}
                          variant={selectedDealType === type.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedDealType(type.value)}
                          data-testid={`filter-dealtype-${type.value}`}
                        >
                          {type.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" onClick={clearFilters} className="w-full" data-testid="button-clear-filters">
                      <X className="w-4 h-4 mr-2" />
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        
        {/* Category Pills */}
        <ScrollArea className="w-full pb-3">
          <div className="flex gap-2 px-4">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.value)}
                className="flex-shrink-0"
                data-testid={`pill-category-${cat.value}`}
              >
                {cat.label}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </header>

      {/* Content */}
      <main className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="w-full aspect-[16/9]" />
                <CardContent className="p-3">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Tag className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium text-foreground mb-2">
              No deals found
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              {searchQuery || activeFiltersCount > 0 
                ? "Try adjusting your search or filters"
                : "Check back soon for new deals from local businesses"}
            </p>
            {(searchQuery || activeFiltersCount > 0) && (
              <Button variant="outline" onClick={clearFilters} data-testid="button-clear-all">
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredDeals.map((deal) => (
              <BrowseDealCard key={deal.id} deal={deal} isPassMember={isPassMember} />
            ))}
          </div>
        )}
        
        {/* Results count */}
        {!isLoading && filteredDeals.length > 0 && (
          <p className="text-sm text-muted-foreground text-center mt-6" data-testid="text-results-count">
            Showing {filteredDeals.length} deal{filteredDeals.length !== 1 ? "s" : ""}
          </p>
        )}
      </main>
    </div>
  );
}
