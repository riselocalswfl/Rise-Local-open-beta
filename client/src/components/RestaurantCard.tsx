import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Utensils, DollarSign } from "lucide-react";
import type { Restaurant } from "@shared/schema";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`restaurant-card-${restaurant.id}`}>
      {restaurant.heroImageUrl && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={restaurant.heroImageUrl}
            alt={restaurant.restaurantName}
            className="w-full h-full object-cover"
            data-testid={`img-restaurant-${restaurant.id}`}
          />
        </div>
      )}
      
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate" data-testid={`text-restaurant-name-${restaurant.id}`}>
              {restaurant.restaurantName}
            </h3>
            {restaurant.tagline && (
              <p className="text-sm text-muted-foreground line-clamp-1" data-testid={`text-tagline-${restaurant.id}`}>
                {restaurant.tagline}
              </p>
            )}
          </div>
          {restaurant.isVerified && (
            <Badge variant="default" className="shrink-0" data-testid={`badge-verified-${restaurant.id}`}>
              Verified
            </Badge>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {restaurant.cuisineType && (
            <Badge variant="outline" className="gap-1" data-testid={`badge-cuisine-${restaurant.id}`}>
              <Utensils className="w-3 h-3" />
              {restaurant.cuisineType}
            </Badge>
          )}
          {restaurant.priceRange && (
            <Badge variant="outline" className="gap-1" data-testid={`badge-price-${restaurant.id}`}>
              <DollarSign className="w-3 h-3" />
              {restaurant.priceRange}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {restaurant.bio && (
          <p className="text-sm line-clamp-3" data-testid={`text-bio-${restaurant.id}`}>
            {restaurant.bio}
          </p>
        )}

        {/* Dietary Options */}
        {restaurant.dietaryOptions && restaurant.dietaryOptions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {restaurant.dietaryOptions.slice(0, 3).map((option, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {option}
              </Badge>
            ))}
            {restaurant.dietaryOptions.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{restaurant.dietaryOptions.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Location */}
        {restaurant.city && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{restaurant.city}, {restaurant.state}</span>
          </div>
        )}

        {/* Badges */}
        {restaurant.badges && restaurant.badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {restaurant.badges.slice(0, 3).map((badge, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {badge}
              </Badge>
            ))}
            {restaurant.badges.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{restaurant.badges.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Link href={`/restaurant/${restaurant.id}`}>
          <Button variant="default" className="w-full" data-testid={`button-view-${restaurant.id}`}>
            View Restaurant
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
