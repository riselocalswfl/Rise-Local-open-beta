import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import DealCard from "@/components/DealCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Deal, Vendor } from "@shared/schema";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "Food", label: "Food" },
  { value: "Retail", label: "Retail" },
  { value: "Beauty", label: "Beauty" },
  { value: "Fitness", label: "Fitness" },
  { value: "Services", label: "Services" },
  { value: "Experiences", label: "Experiences" },
];

const CITIES = [
  { value: "all", label: "All Cities" },
  { value: "Fort Myers", label: "Fort Myers" },
  { value: "Cape Coral", label: "Cape Coral" },
  { value: "Bonita Springs", label: "Bonita Springs" },
  { value: "Estero", label: "Estero" },
  { value: "Naples", label: "Naples" },
];

export default function DealsPage() {
  const [category, setCategory] = useState("all");
  const [city, setCity] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const queryParams = new URLSearchParams();
  if (category !== "all") queryParams.set("category", category);
  if (city !== "all") queryParams.set("city", city);
  queryParams.set("isActive", "true");

  const queryString = queryParams.toString();

  const { data: deals, isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals", { category, city }],
    queryFn: async () => {
      const res = await fetch(`/api/deals?${queryString}`);
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
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-heading font-bold text-white mb-4">
            Shop Local. Support Community. Save Money.
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            Exclusive deals from Southwest Florida small businesses.
          </p>
        </div>
      </section>

      {/* Filters Section */}
      <section className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search deals..."
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
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-city">
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
                isPremiumUser={false}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No deals found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || category !== "all" || city !== "all"
                ? "Try adjusting your filters to find more deals."
                : "Check back soon for new deals from local businesses!"}
            </p>
            {(searchTerm || category !== "all" || city !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setCategory("all");
                  setCity("all");
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
