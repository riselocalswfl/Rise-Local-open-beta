import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import ProductCard from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getProductsWithVendors } from "@/lib/api";

export default function Products() {
  const searchParams = new URLSearchParams(useSearch());
  const categoryParam = searchParams.get("category");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam.toLowerCase());
    }
  }, [categoryParam]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products-with-vendors"],
    queryFn: getProductsWithVendors,
  });
  
  const filteredProducts = selectedCategory === "all"
    ? products
    : products?.filter(p => p.category.toLowerCase() === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <FilterBar type="products" onCategoryChange={setSelectedCategory} selectedCategory={selectedCategory} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold mb-8 mt-8" data-testid="heading-all-products">All Products</h1>
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
                price={parseFloat(product.price)}
                vendorName={product.vendorName}
                vendorId={product.vendorId}
                category={product.category}
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
