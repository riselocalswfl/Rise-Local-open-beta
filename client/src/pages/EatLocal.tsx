import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Leaf, MapPin, Sprout } from "lucide-react";
import type { Vendor } from "@shared/schema";

export default function EatLocal() {
  const { data: allVendors, isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });
  
  // Filter for Food & Beverage restaurants only
  const restaurants = useMemo(() => {
    if (!allVendors) return [];
    return allVendors.filter(vendor => {
      return vendor.category === "Food & Beverage";
    });
  }, [allVendors]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-16" aria-hidden="true" />
      
      {/* Hero Section */}
      <div className="bg-primary/5 border-b">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Leaf className="w-10 h-10 text-primary" strokeWidth={1.75} />
            <h1 className="text-4xl font-semibold text-text" data-testid="heading-eat-local">
              Eat Local
            </h1>
          </div>
          <p className="text-lg text-text/70 max-w-3xl">
            Discover Fort Myers restaurants partnering with local farms and makers. Every meal supports our farming community and brings you the freshest, locally-sourced ingredients.
          </p>
        </div>
      </div>

      {/* Restaurant List */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No restaurants currently listed. Check back soon!</p>
            </div>
          ) : (
            restaurants.map((restaurant) => (
              <Card key={restaurant.id} data-testid={`card-restaurant-${restaurant.id}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold mb-2" data-testid={`text-restaurant-name-${restaurant.id}`}>
                        {restaurant.displayName || restaurant.businessName}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                        <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span data-testid={`text-restaurant-city-${restaurant.id}`}>{restaurant.city}</span>
                      </div>
                      
                      <p className="text-sm text-text/70 mb-3 line-clamp-2" data-testid={`text-restaurant-bio-${restaurant.id}`}>
                        {restaurant.bio}
                      </p>
                      
                      {restaurant.restaurantSources && (
                        <p className="text-sm text-muted-foreground mb-2" data-testid={`text-restaurant-partners-${restaurant.id}`}>
                          <span className="font-medium">Partners with:</span> {restaurant.restaurantSources}
                        </p>
                      )}
                    </div>
                    
                    {restaurant.localMenuPercent != null && (
                      <div className="flex-shrink-0 text-right">
                        <div className="flex items-center gap-2 text-primary" data-testid={`text-local-percent-${restaurant.id}`}>
                          <Sprout className="w-5 h-5" strokeWidth={1.75} />
                          <div>
                            <div className="text-2xl font-semibold">~{restaurant.localMenuPercent}%</div>
                            <div className="text-xs text-muted-foreground">locally sourced</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
