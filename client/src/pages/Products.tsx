import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import ValuesFilterDialog from "@/components/filters/ValuesFilterDialog";
import { CategoryFilter } from "@/components/CategoryFilter";
import ProductCard from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProductsWithVendors } from "@/lib/api";
import type { Vendor } from "@shared/schema";
import { X } from "lucide-react";
import { SHOP_CATEGORIES } from "@shared/categories";

export default function Products() {
  const searchParams = new URLSearchParams(useSearch());
  const categoryParam = searchParams.get("category");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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
  
  // Filter by category and vendor values
  let filteredProducts = products;
  
  // Filter by hierarchical categories
  if (selectedCategories.length > 0) {
    filteredProducts = filteredProducts?.filter(p => {
      const vendor = vendors?.find(v => v.id === p.vendorId);
      if (!vendor?.categories) return false;
      // Match if ANY selected category is in the vendor's categories
      return selectedCategories.some(sc => vendor.categories?.includes(sc));
    });
  } else if (selectedCategory !== "all") {
    // Fallback to old category param for backward compatibility
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
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-3xl font-semibold" data-testid="heading-all-products">Shop</h1>
          {allValues.length > 0 && (
            <ValuesFilterDialog
              allValues={allValues}
              selected={selectedValues}
              onChange={setSelectedValues}
            />
          )}
        </div>

        {selectedValues.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {selectedValues.map(v => (
              <Badge 
                key={v} 
                variant="outline" 
                role="button"
                tabIndex={0}
                className="cursor-pointer hover-elevate active-elevate-2 pr-1 border-primary text-primary"
                onClick={() => {
                  const next = selectedValues.filter(x => x !== v);
                  setSelectedValues(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const next = selectedValues.filter(x => x !== v);
                    setSelectedValues(next);
                  }
                }}
                data-testid={`badge-active-filter-${v}`}
              >
                {v}
                <X className="w-3 h-3 ml-1.5" strokeWidth={2} />
              </Badge>
            ))}
            <Button 
              variant="ghost" 
              className="px-2 h-auto py-0.5 text-sm" 
              onClick={() => setSelectedValues([])}
              data-testid="button-clear-all-filters"
            >
              Clear all
            </Button>
          </div>
        )}
        
        <div className="flex gap-6">
          {/* Sidebar with CategoryFilter */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <CategoryFilter
              categories={SHOP_CATEGORIES}
              selectedCategories={selectedCategories}
              onChange={setSelectedCategories}
              title="Shop Categories"
            />
          </aside>
          
          {/* Product Grid */}
          <div className="flex-1">
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
          </div>
        </div>
      </main>
    </div>
  );
}
