import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import ValueFilterBar from "@/components/ValueFilterBar";
import ProductCard from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getProductsWithVendors } from "@/lib/api";
import { useValueFilters } from "@/hooks/useValueFilters";
import { buildValueIndex, getValueCounts } from "@/data/valueIndex";
import type { Vendor, Product } from "@shared/schema";
import type { ValueTag } from "@/../../shared/values";

export default function Products() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products-with-vendors"],
    queryFn: getProductsWithVendors,
  });
  
  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });
  
  const { selected, matchMode, includeVendorValuesForProducts } = useValueFilters();
  
  const valueCounts = useMemo(() => {
    if (!vendors || !products) return null;
    const productData = products.map(p => ({
      ...p,
      values: p.values || []
    })) as Product[];
    const index = buildValueIndex(vendors, productData);
    return getValueCounts(index);
  }, [vendors, products]);
  
  const categoryFilteredProducts = selectedCategory === "all"
    ? products
    : products?.filter(p => p.category.toLowerCase() === selectedCategory);
  
  const filteredProducts = useMemo(() => {
    if (!categoryFilteredProducts || !vendors) return [];
    if (selected.length === 0) return categoryFilteredProducts;
    
    return categoryFilteredProducts.filter(product => {
      let productValues = (product.values as ValueTag[]) || [];
      
      if (includeVendorValuesForProducts) {
        const vendor = vendors.find(v => v.id === product.vendorId);
        if (vendor) {
          const vendorValues = vendor.values as ValueTag[];
          const combined = [...productValues, ...vendorValues];
          productValues = Array.from(new Set(combined));
        }
      }
      
      if (matchMode === "all") {
        return selected.every(tag => productValues.includes(tag));
      } else {
        return selected.some(tag => productValues.includes(tag));
      }
    });
  }, [categoryFilteredProducts, vendors, selected, matchMode, includeVendorValuesForProducts]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-16" aria-hidden="true" />
      <FilterBar type="products" onCategoryChange={setSelectedCategory} />
      {valueCounts && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <ValueFilterBar valueCounts={valueCounts} context="products" />
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold mb-8" data-testid="heading-all-products">All Products</h1>
        {selected.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} matching your filters
          </p>
        )}
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
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No products found matching your filters</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              let displayValues = (product.values as ValueTag[]) || [];
              
              if (includeVendorValuesForProducts) {
                const vendor = vendors?.find(v => v.id === product.vendorId);
                if (vendor) {
                  const vendorValues = vendor.values as ValueTag[];
                  const combined = [...displayValues, ...vendorValues];
                  displayValues = Array.from(new Set(combined));
                }
              }
              
              return (
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
                  values={displayValues}
                />
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
