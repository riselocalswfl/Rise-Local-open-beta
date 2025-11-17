import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Leaf } from "lucide-react";
import RestaurantCard from "@/components/RestaurantCard";
import type { Restaurant } from "@shared/schema";

export default function EatLocal() {
  const { data: restaurants = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

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
              Dine
            </h1>
          </div>
          <p className="text-lg text-text/70 max-w-3xl">
            Discover Fort Myers restaurants partnering with local farms and makers. Every meal supports our farming community and brings you the freshest, locally-sourced ingredients.
          </p>
        </div>
      </div>

      {/* Restaurant List */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No restaurants currently listed. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="restaurant-grid">
            {restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
