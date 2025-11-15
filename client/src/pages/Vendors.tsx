import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import ValueFilter from "@/components/ValueFilter";
import VendorCard from "@/components/VendorCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Vendor } from "@shared/schema";

export default function Vendors() {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  const { data: vendors, isLoading} = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });
  
  // Get all unique values from both vendors and restaurants
  const { data: allValues = [] } = useQuery<string[]>({
    queryKey: ["/api/values/unique"],
  });
  
  const handleValueToggle = (value: string) => {
    setSelectedValues(prev => 
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };
  
  // Filter by values only
  let filteredVendors = vendors;
  
  if (selectedValues.length > 0) {
    filteredVendors = filteredVendors?.filter(v => {
      const vendorValues = v.values || [];
      return selectedValues.some(sv => vendorValues.includes(sv));
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {allValues.length > 0 && (
          <ValueFilter
            availableValues={allValues}
            selectedValues={selectedValues}
            onValueToggle={handleValueToggle}
          />
        )}
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
                categories={vendor.categories || []}
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
