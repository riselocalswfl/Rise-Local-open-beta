import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Leaf, MapPin, Award } from "lucide-react";
import type { Restaurant } from "@shared/schema";

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link href={`/restaurant/${restaurant.id}`}>
      <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all h-full" data-testid={`card-restaurant-${restaurant.id}`}>
        <div className="aspect-video relative overflow-hidden rounded-t-md bg-muted">
          {restaurant.heroImageUrl || restaurant.logoUrl ? (
            <img 
              src={restaurant.heroImageUrl || restaurant.logoUrl || ''} 
              alt={restaurant.restaurantName}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-muted">
              <Leaf className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          {restaurant.isFeatured && (
            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground" data-testid="badge-featured">
              Featured
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-lg leading-tight" data-testid={`text-restaurant-name-${restaurant.id}`}>
              {restaurant.restaurantName}
            </h3>
            {restaurant.isVerified && (
              <Badge variant="outline" className="shrink-0 border-primary text-primary text-xs" data-testid="badge-verified">
                <Award className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid="text-restaurant-bio">
            {restaurant.bio || restaurant.tagline}
          </p>

          <div className="space-y-2 text-sm">
            {restaurant.city && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{restaurant.city}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function EatLocal() {
  const { data: restaurants = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-16" aria-hidden="true" />
      
      <div className="bg-primary/5 border-b">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Leaf className="w-10 h-10 text-primary" strokeWidth={1.75} />
            <h1 className="text-4xl font-semibold text-text" data-testid="heading-eat-local">
              Dine
            </h1>
          </div>
          <p className="text-lg text-text/70 max-w-3xl">
            Discover SWFL restaurants partnering with local farms and makers. Every meal supports our farming community and brings you the freshest, locally-sourced ingredients.
          </p>
        </div>
      </div>

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
