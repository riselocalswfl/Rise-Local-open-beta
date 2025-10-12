import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import ValueFilterBar from "@/components/ValueFilterBar";
import VendorCard from "@/components/VendorCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useValueFilters } from "@/hooks/useValueFilters";
import { buildValueIndex, getValueCounts } from "@/data/valueIndex";
import type { Vendor } from "@shared/schema";
import type { ValueTag } from "@/../../shared/values";

export default function Vendors() {
  const { data: vendors, isLoading} = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });
  
  const { selected, matchMode } = useValueFilters();
  
  const valueCounts = useMemo(() => {
    if (!vendors) return null;
    const index = buildValueIndex(vendors, []);
    return getValueCounts(index);
  }, [vendors]);
  
  const filteredVendors = useMemo(() => {
    if (!vendors) return [];
    if (selected.length === 0) return vendors;
    
    return vendors.filter(vendor => {
      const vendorValues = vendor.values as ValueTag[];
      
      if (matchMode === "all") {
        return selected.every(tag => vendorValues.includes(tag));
      } else {
        return selected.some(tag => vendorValues.includes(tag));
      }
    });
  }, [vendors, selected, matchMode]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-16" aria-hidden="true" />
      <FilterBar type="vendors" />
      {valueCounts && (
        <div className="fixed top-[156px] left-0 right-0 z-30 bg-background pb-4 border-b">
          <div className="max-w-7xl mx-auto px-4 pt-4">
            <ValueFilterBar valueCounts={valueCounts} context="vendors" />
          </div>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 pb-8" style={{ marginTop: valueCounts ? '600px' : '280px' }}>
        <h1 className="text-3xl font-semibold mb-8 mt-8" data-testid="heading-local-vendors">Local Vendors</h1>
        {selected.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            Showing {filteredVendors.length} {filteredVendors.length === 1 ? 'vendor' : 'vendors'} matching your filters
          </p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </>
          ) : filteredVendors.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No vendors found matching your filters</p>
            </div>
          ) : (
            filteredVendors.map((vendor) => (
              <VendorCard key={vendor.id} {...vendor} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
