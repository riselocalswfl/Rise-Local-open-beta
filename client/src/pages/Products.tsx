import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { CategoryFilter } from "@/components/CategoryFilter";
import ProductCard from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getProductsWithVendors } from "@/lib/api";
import type { Vendor } from "@shared/schema";
import { ShoppingBag, Filter } from "lucide-react";
import { SHOP_CATEGORIES, categoriesMatch } from "@shared/categories";

export default function Products() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products-with-vendors"],
    queryFn: getProductsWithVendors,
  });
  
  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });
  
  // Filter by category
  let filteredProducts = products;
  
  // Filter by hierarchical categories
  if (selectedCategories.length > 0) {
    filteredProducts = filteredProducts?.filter(p => {
      const vendor = vendors?.find(v => v.id === p.vendorId);
      if (!vendor?.categories) return false;
      // Use categoriesMatch helper to handle parent category expansion
      return categoriesMatch(vendor.categories, selectedCategories, SHOP_CATEGORIES);
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
      <div className="h-16" aria-hidden="true" />
      
      {/* Hero Section */}
      <div className="bg-primary/5 border-b">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingBag className="w-10 h-10 text-primary" strokeWidth={1.75} />
            <h1 className="text-4xl font-semibold text-text" data-testid="heading-all-products">
              Shop
            </h1>
          </div>
          <p className="text-lg text-text/70 max-w-3xl">
            Discover unique products from Fort Myers makers, farmers, and artisans. Every purchase supports local businesses and keeps our community thriving.
          </p>
        </div>
      </div>

      {/* Product List */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-4">
          <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full" data-testid="button-mobile-filter">
                <Filter className="h-4 w-4 mr-2" />
                Filter by Category
                {selectedCategories.length > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                    {selectedCategories.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Shop Categories</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <CategoryFilter
                  categories={SHOP_CATEGORIES}
                  selectedCategories={selectedCategories}
                  onChange={setSelectedCategories}
                  title=""
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        
        <div className="flex gap-6">
          {/* Sidebar with CategoryFilter (Desktop) */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <CategoryFilter
              categories={SHOP_CATEGORIES}
              selectedCategories={selectedCategories}
              onChange={setSelectedCategories}
              title="Shop Categories"
            />
          </aside>
          
          {/* Main Content */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                  <p className="text-muted-foreground">
                    {selectedCategories.length > 0
                      ? "No products found matching your selected categories. Try adjusting your filters."
                      : "No products currently listed. Check back soon!"}
                  </p>
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
                    inventory={product.inventory}
                    isVerifiedVendor={product.isVerifiedVendor}
                    valueTags={product.valueTags as string[] || []}
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
