import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, X, Tag, MapPin, Percent, DollarSign, Gift, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import type { Deal, Vendor } from "@shared/schema";

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

export default function Browse() {
  const [pathLocation] = useLocation();
  const searchParams = new URLSearchParams(pathLocation.split("?")[1] || "");
  const section = searchParams.get("section");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDealType, setSelectedDealType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  
  const { user } = useAuth();
  const isPassMember = user?.isPassMember ?? false;

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-32 rounded-lg mb-3" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredDeals.map((deal) => {
              const DealIcon = getDealTypeIcon(deal.dealType);
              const businessName = deal.vendor?.businessName || "Local Business";
              const vendorType = deal.vendor?.vendorType || "shop";
              
              return (
                <Link key={deal.id} href={`/deals/${deal.id}`}>
                  <Card className="hover-elevate active-elevate-2 h-full" data-testid={`card-deal-${deal.id}`}>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <DealIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate" data-testid={`deal-title-${deal.id}`}>
                              {deal.title}
                            </h3>
                            {deal.isPassLocked && !isPassMember && (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2" data-testid={`deal-description-${deal.id}`}>
                            {deal.description}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {deal.savingsAmount && deal.savingsAmount > 0 && (
                              <Badge variant="secondary" className="text-xs" data-testid={`deal-savings-${deal.id}`}>
                                Save ${deal.savingsAmount}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {vendorType === "shop" ? "Shop" : vendorType === "dine" ? "Dine" : "Service"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={deal.vendor?.logoUrl || undefined} alt={businessName} />
                          <AvatarFallback className="text-xs">
                            {businessName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate" data-testid={`deal-vendor-${deal.id}`}>
                          {businessName}
                        </span>
                        {deal.vendor?.city && (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span>{deal.vendor.city}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
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
