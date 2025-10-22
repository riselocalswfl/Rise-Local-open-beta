import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import ValueFilter from "@/components/ValueFilter";
import ProductCard from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getProductsWithVendors } from "@/lib/api";
import type { Vendor } from "@shared/schema";

export default function Products() {
  const searchParams = new URLSearchParams(useSearch());
  const categoryParam = searchParams.get("category");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<string>("newest");
  
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam.toLowerCase());
      setSelectedValues([]); // Reset value filters when category changes
    }
  }, [categoryParam]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products-with-vendors"],
    queryFn: getProductsWithVendors,
  });
  
  const { data: vendors } = useQuery<Vendor[]>({
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
  
  // Filter by category and vendor values
  let filteredProducts = products;
  
  if (selectedCategory !== "all") {
    filteredProducts = filteredProducts?.filter(p => p.category?.toLowerCase() === selectedCategory);
  }
  
  if (selectedValues.length > 0 && vendors) {
    filteredProducts = filteredProducts?.filter(p => {
      const vendor = vendors.find(v => v.id === p.vendorId);
      const vendorValues = vendor?.values || [];
      return selectedValues.some(sv => vendorValues.includes(sv));
    });
  }

  // Apply sorting
  if (filteredProducts && sortOrder !== "newest") {
    filteredProducts = [...filteredProducts].sort((a, b) => {
      switch (sortOrder) {
        case "price-low":
          // Parse price strings to numbers for comparison
          const priceA = parseFloat(a.price || "0");
          const priceB = parseFloat(b.price || "0");
          return priceA - priceB;
        case "price-high":
          const priceHighA = parseFloat(a.price || "0");
          const priceHighB = parseFloat(b.price || "0");
          return priceHighB - priceHighA;
        case "popular":
          // Lower inventory = more popular (more sold)
          return a.inventory - b.inventory;
        default:
          return 0; // newest - keep default order
      }
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <FilterBar 
        type="products" 
        onCategoryChange={setSelectedCategory} 
        selectedCategory={selectedCategory}
        onSortChange={setSortOrder}
        sortOrder={sortOrder}
      />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {allValues.length > 0 && (
          <ValueFilter
            availableValues={allValues}
            selectedValues={selectedValues}
            onValueToggle={handleValueToggle}
          />
        )}
        <h1 className="text-3xl font-semibold mb-8 mt-8" data-testid="heading-all-products">Shop Local</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </>
          ) : filteredProducts && filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No products found matching your filters</p>
            </div>
          ) : (
            filteredProducts?.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={parseFloat(product.price || "0")}
                vendorName={product.vendorName}
                vendorId={product.vendorId}
                category={product.category || ""}
                inventory={product.inventory}
                isVerifiedVendor={product.isVerifiedVendor}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
