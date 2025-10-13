import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import VendorCard from "@/components/VendorCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Vendor } from "@shared/schema";

export default function Vendors() {
  const searchParams = new URLSearchParams(useSearch());
  const categoryParam = searchParams.get("category");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam.toLowerCase());
    }
  }, [categoryParam]);

  const { data: vendors, isLoading} = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });
  
  const filteredVendors = selectedCategory === "all"
    ? vendors
    : vendors?.filter(v => v.category?.toLowerCase() === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <FilterBar type="vendors" onCategoryChange={setSelectedCategory} selectedCategory={selectedCategory} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold mb-8 mt-8" data-testid="heading-local-vendors">Local Vendors</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </>
          ) : filteredVendors && filteredVendors.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No vendors found matching your filters</p>
            </div>
          ) : (
            filteredVendors?.map((vendor) => (
              <VendorCard
                key={vendor.id}
                id={vendor.id}
                name={vendor.businessName}
                bio={vendor.bio}
                city={vendor.city}
                categories={vendor.category ? [vendor.category, ...(vendor.subcategories || [])] : []}
                values={vendor.values as string[] || undefined}
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
