import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag } from "lucide-react";
import type { Deal } from "@shared/schema";

export default function Products() {
  const { data: deals, isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const productDeals = deals?.filter(d => d.isActive && d.status === "published" && d.category === "retail") || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-16" aria-hidden="true" />
      
      <div className="bg-primary/5 border-b">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingBag className="w-10 h-10 text-primary" strokeWidth={1.75} />
            <h1 className="text-4xl font-semibold text-text" data-testid="heading-all-products">
              Shop
            </h1>
          </div>
          <p className="text-lg text-text/70 max-w-3xl">
            Discover unique products from SWFL makers, farmers, and artisans. Every purchase supports local businesses and keeps our community thriving.
          </p>
        </div>
      </div>

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
          ) : productDeals && productDeals.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">
                No products currently listed. Check back soon!
              </p>
            </div>
          ) : (
            productDeals?.map((deal) => (
              <Link key={deal.id} href={`/deal/${deal.id}`}>
                <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-deal-${deal.id}`}>
                  {deal.heroImageUrl && (
                    <div className="aspect-video relative overflow-hidden rounded-t-md">
                      <img 
                        src={deal.heroImageUrl} 
                        alt={deal.title}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2" data-testid={`text-deal-title-${deal.id}`}>
                      {deal.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {deal.description}
                    </p>
                    {deal.valueLabel && (
                      <Badge>{deal.valueLabel}</Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
