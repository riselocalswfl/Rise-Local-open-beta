import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import VendorCard from "@/components/VendorCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Vendor } from "@shared/schema";

export default function Vendors() {
  const { data: vendors, isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <FilterBar type="vendors" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold mb-8" data-testid="heading-local-vendors">Local Vendors</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </>
          ) : (
            vendors?.map((vendor) => (
              <VendorCard key={vendor.id} {...vendor} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
