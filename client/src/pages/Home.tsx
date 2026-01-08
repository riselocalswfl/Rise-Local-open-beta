import { Link } from "wouter";
import { ArrowRight, Award, MapPin, Leaf } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import HomeHero from "@/components/HomeHero";
import ServiceVendorCard from "@/components/ServiceVendorCard";
import HorizontalCarousel from "@/components/HorizontalCarousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Vendor, Restaurant, Deal } from "@shared/schema";

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
            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
              Featured
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-lg leading-tight">
              {restaurant.restaurantName}
            </h3>
            {restaurant.isVerified && (
              <Badge variant="outline" className="shrink-0 border-primary text-primary text-xs">
                <Award className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {restaurant.bio || restaurant.tagline}
          </p>

          {restaurant.city && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{restaurant.city}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Home() {
  const { data: restaurants, isLoading: restaurantsLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: serviceVendors, isLoading: servicesLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/service-vendors"],
  });

  const { data: deals, isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const featuredRestaurants = restaurants?.slice(0, 6) || [];
  const featuredServiceVendors = serviceVendors?.slice(0, 6) || [];
  const featuredDeals = deals?.filter(d => d.isActive && d.status === "published").slice(0, 6) || [];

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="pb-8">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <HomeHero />
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-text font-bold">Featured Deals</h2>
              <p className="text-text/70 mt-1 text-sm sm:text-base">
                Exclusive savings from local businesses
              </p>
            </div>
            <Link href="/discover" data-testid="link-view-all-deals">
              <button className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition font-medium">
                View All
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </Link>
          </div>
          
          {dealsLoading ? (
            <div className="flex gap-6 overflow-hidden">
              <Skeleton className="h-48 w-80 flex-none" />
              <Skeleton className="h-48 w-80 flex-none" />
              <Skeleton className="h-48 w-80 flex-none" />
            </div>
          ) : featuredDeals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No deals currently available. Check back soon!
              </p>
            </div>
          ) : (
            <HorizontalCarousel>
              {featuredDeals.map((deal) => (
                <div key={deal.id} className="w-80">
                  <Link href={`/deal/${deal.id}`}>
                    <Card className="hover-elevate cursor-pointer h-full">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2">{deal.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{deal.description}</p>
                        {deal.valueLabel && (
                          <Badge className="mt-2">{deal.valueLabel}</Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </HorizontalCarousel>
          )}
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-text font-bold">Dine Local</h2>
              <p className="text-text/70 mt-1 text-sm sm:text-base">
                Explore SWFL restaurants with locally-sourced ingredients
              </p>
            </div>
            <Link href="/eat-local" data-testid="link-view-all-restaurants">
              <button className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition font-medium">
                View All
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </Link>
          </div>
          
          {restaurantsLoading ? (
            <div className="flex gap-6 overflow-hidden">
              <Skeleton className="h-96 w-80 flex-none" />
              <Skeleton className="h-96 w-80 flex-none" />
              <Skeleton className="h-96 w-80 flex-none" />
            </div>
          ) : (
            <HorizontalCarousel>
              {featuredRestaurants.map((restaurant) => (
                <div key={restaurant.id} className="w-80">
                  <RestaurantCard restaurant={restaurant} />
                </div>
              ))}
            </HorizontalCarousel>
          )}
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-text font-bold">Local Services</h2>
              <p className="text-text/70 mt-1 text-sm sm:text-base">
                Find trusted professionals for your needs
              </p>
            </div>
            <Link href="/services" data-testid="link-view-all-services">
              <button className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition font-medium">
                View All
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </Link>
          </div>
          
          {servicesLoading ? (
            <div className="flex gap-6 overflow-hidden">
              <Skeleton className="h-96 w-80 flex-none" />
              <Skeleton className="h-96 w-80 flex-none" />
              <Skeleton className="h-96 w-80 flex-none" />
            </div>
          ) : featuredServiceVendors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No service providers currently listed. Check back soon!
              </p>
            </div>
          ) : (
            <HorizontalCarousel>
              {featuredServiceVendors.map((vendor) => (
                <div key={vendor.id} className="w-80">
                  <ServiceVendorCard vendor={vendor} />
                </div>
              ))}
            </HorizontalCarousel>
          )}
        </section>
      </main>
    </div>
  );
}
