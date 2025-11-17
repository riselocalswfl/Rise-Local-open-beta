import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getProductsWithVendors } from "@/lib/api";
import { ShoppingBag } from "lucide-react";

export default function Products() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products-with-vendors"],
    queryFn: getProductsWithVendors,
  });

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
          ) : products && products.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">
                No products currently listed. Check back soon!
              </p>
            </div>
          ) : (
            products?.map((product) => (
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
      </main>
    </div>
  );
}
