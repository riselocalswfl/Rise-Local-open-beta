import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import ValueFilterBar from "@/components/ValueFilterBar";
import VendorCard from "@/components/VendorCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useValueFilters } from "@/hooks/useValueFilters";
import { buildValueIndex, getValueCounts } from "@/data/valueIndex";
import { Leaf } from "lucide-react";
import type { Vendor } from "@shared/schema";
import type { ValueTag } from "@/../../shared/values";

export default function EatLocal() {
  const { data: allVendors, isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });
  
  const { selected, matchMode } = useValueFilters();
  
  // Filter for Food & Beverage restaurants only
  const restaurants = useMemo(() => {
    if (!allVendors) return [];
    return allVendors.filter(vendor => {
      return vendor.category === "Food & Beverage";
    });
  }, [allVendors]);
  
  const valueCounts = useMemo(() => {
    if (!restaurants) return null;
    const index = buildValueIndex(restaurants, []);
    return getValueCounts(index);
  }, [restaurants]);
  
  const filteredRestaurants = useMemo(() => {
    if (!restaurants) return [];
    if (selected.length === 0) return restaurants;
    
    return restaurants.filter(vendor => {
      const vendorValues = (vendor.values ?? []) as ValueTag[];
      
      if (matchMode === "all") {
        return selected.every(tag => vendorValues.includes(tag));
      } else {
        return selected.some(tag => vendorValues.includes(tag));
      }
    });
  }, [restaurants, selected, matchMode]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-primary/5 border-b">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Leaf className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-semibold text-text" data-testid="heading-eat-local">
              Eat Local
            </h1>
          </div>
          <p className="text-lg text-text/70 max-w-3xl">
            Discover Fort Myers restaurants partnering with local farms. Every meal supports our farming community and brings you the freshest, locally-sourced ingredients.
          </p>
        </div>
      </div>

      {/* Value Filters */}
      {valueCounts && (
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <ValueFilterBar valueCounts={valueCounts} context="vendors" />
        </div>
      )}

      {/* Restaurant Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {selected.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            Showing {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'restaurant' : 'restaurants'} matching your filters
          </p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </>
          ) : filteredRestaurants.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">
                {selected.length > 0 
                  ? "No restaurants found matching your filters" 
                  : "No restaurants currently listed. Check back soon!"}
              </p>
            </div>
          ) : (
            filteredRestaurants.map((vendor) => (
              <VendorCard 
                key={vendor.id} 
                id={vendor.id}
                name={vendor.displayName || vendor.businessName}
                bio={vendor.bio}
                city={vendor.city}
                categories={[vendor.category, ...(vendor.subcategories || [])]}
                values={vendor.values as ValueTag[]}
                isVerified={vendor.isVerified}
                followerCount={vendor.followerCount}
                avatarUrl={vendor.logoUrl || undefined}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
