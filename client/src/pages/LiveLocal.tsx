import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Clock, Award, Star } from "lucide-react";
import type { ServiceProvider } from "@shared/schema";

const SERVICE_CATEGORIES = [
  "All Services",
  "Home Services",
  "Property Care", 
  "Recreation",
  "Education",
  "Wellness"
];

function ServiceProviderCard({ provider }: { provider: ServiceProvider }) {
  return (
    <Link href={`/service/${provider.id}`}>
      <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all h-full" data-testid={`card-service-provider-${provider.id}`}>
        <div className="aspect-video relative overflow-hidden rounded-t-md bg-muted">
          {provider.heroImageUrl || provider.logoUrl ? (
            <img 
              src={provider.heroImageUrl || provider.logoUrl || ''} 
              alt={provider.businessName}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-muted">
              <Award className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          {provider.isFeatured && (
            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground" data-testid="badge-featured">
              Featured
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-lg leading-tight" data-testid={`text-provider-name-${provider.id}`}>
              {provider.businessName}
            </h3>
            {provider.isVerified && (
              <Badge variant="outline" className="shrink-0 border-primary text-primary text-xs" data-testid="badge-verified">
                <Award className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid="text-provider-bio">
            {provider.bio || provider.tagline}
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Badge variant="secondary" className="text-xs" data-testid="badge-category">
                {provider.category}
              </Badge>
              {provider.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {provider.city}
                </span>
              )}
            </div>

            {provider.completedBookings > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span className="text-xs">{provider.completedBookings} completed bookings</span>
              </div>
            )}

            {provider.averageRating !== null && provider.averageRating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="font-medium">{(provider.averageRating / 100).toFixed(1)}</span>
                <span className="text-muted-foreground">rating</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function LiveLocal() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All Services");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: providers, isLoading } = useQuery<ServiceProvider[]>({
    queryKey: ["/api/services"],
  });

  // Filter providers
  let filteredProviders = providers;

  if (selectedCategory !== "All Services") {
    filteredProviders = filteredProviders?.filter(
      p => p.category === selectedCategory
    );
  }

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredProviders = filteredProviders?.filter(p => 
      p.businessName.toLowerCase().includes(query) ||
      p.bio?.toLowerCase().includes(query) ||
      p.tagline?.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-semibold mb-4" data-testid="heading-live-local">
            Live Local
          </h1>
          <p className="text-xl text-primary-foreground/90 max-w-2xl" data-testid="text-hero-tagline">
            Connect with trusted Fort Myers service providers for your home, health, and lifestyle needs.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-services"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {SERVICE_CATEGORIES.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                data-testid={`button-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        {filteredProviders && (
          <p className="text-sm text-muted-foreground mb-4" data-testid="text-results-count">
            {filteredProviders.length} {filteredProviders.length === 1 ? 'service provider' : 'service providers'} found
          </p>
        )}

        {/* Service Provider Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <Skeleton className="aspect-video rounded-t-md" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProviders && filteredProviders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <ServiceProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Award className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No service providers found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try a different search term" : "Be the first to join as a service provider!"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
