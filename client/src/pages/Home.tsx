import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import HomeHero from "@/components/HomeHero";
import ProductCard from "@/components/ProductCard";
import RestaurantCard from "@/components/RestaurantCard";
import EventCard from "@/components/EventCard";
import ServiceProviderCard from "@/components/ServiceProviderCard";
import HorizontalCarousel from "@/components/HorizontalCarousel";
import { Skeleton } from "@/components/ui/skeleton";
import { getProductsWithVendors, getEventsWithOrganizers } from "@/lib/api";
import type { ServiceProvider, Restaurant } from "@shared/schema";

export default function Home() {
  const [, setLocation] = useLocation();

  // Check for returnTo path after auth redirect
  useEffect(() => {
    const returnTo = sessionStorage.getItem("returnTo");
    if (returnTo) {
      sessionStorage.removeItem("returnTo");
      setLocation(returnTo);
    }
  }, [setLocation]);
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products-with-vendors"],
    queryFn: getProductsWithVendors,
  });

  const { data: restaurants, isLoading: restaurantsLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: serviceProviders, isLoading: servicesLoading } = useQuery<ServiceProvider[]>({
    queryKey: ["/api/services"],
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events-with-organizers"],
    queryFn: getEventsWithOrganizers,
  });

  const featuredProducts = products?.slice(0, 8) || [];
  const featuredRestaurants = restaurants?.slice(0, 6) || [];
  const featuredServices = serviceProviders?.slice(0, 8) || [];
  const upcomingEvents =
    events?.filter((e) => new Date(e.dateTime) > new Date()).slice(0, 6) || [];

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="pb-8">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <HomeHero />
        </section>

        {/* Shop Goods Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-text font-bold">Shop Goods</h2>
              <p className="text-text/70 mt-1 text-sm sm:text-base">
                Discover products from local artisans and makers
              </p>
            </div>
            <Link href="/products" data-testid="link-view-all-products">
              <button className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition font-medium">
                View All
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </Link>
          </div>
          
          {productsLoading ? (
            <div className="flex gap-6 overflow-hidden">
              <Skeleton className="h-80 w-72 flex-none" />
              <Skeleton className="h-80 w-72 flex-none" />
              <Skeleton className="h-80 w-72 flex-none" />
            </div>
          ) : (
            <HorizontalCarousel>
              {featuredProducts.map((product) => (
                <div key={product.id} className="w-72">
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    price={product.price ? parseFloat(product.price) : 0}
                    vendorName={product.vendorName || "Unknown Vendor"}
                    vendorId={product.vendorId}
                    inventory={product.inventory}
                    isVerifiedVendor={product.isVerifiedVendor}
                  />
                </div>
              ))}
            </HorizontalCarousel>
          )}
        </section>

        {/* Dine Local Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-text font-bold">Dine Local</h2>
              <p className="text-text/70 mt-1 text-sm sm:text-base">
                Explore Fort Myers restaurants with locally-sourced ingredients
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

        {/* Local Services Section */}
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
              <Skeleton className="h-64 w-80 flex-none" />
              <Skeleton className="h-64 w-80 flex-none" />
              <Skeleton className="h-64 w-80 flex-none" />
            </div>
          ) : (
            <HorizontalCarousel>
              {featuredServices.map((provider) => (
                <div key={provider.id} className="w-80">
                  <ServiceProviderCard provider={provider} />
                </div>
              ))}
            </HorizontalCarousel>
          )}
        </section>

        {/* Upcoming Events Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-text font-bold">Upcoming Events</h2>
              <p className="text-text/70 mt-1 text-sm sm:text-base">
                Join workshops, markets, and community gatherings
              </p>
            </div>
            <Link href="/events" data-testid="link-view-all-events">
              <button className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition font-medium">
                View All
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </Link>
          </div>
          {eventsLoading ? (
            <div className="flex gap-6 overflow-hidden">
              <Skeleton className="h-48 w-96 flex-none" />
              <Skeleton className="h-48 w-96 flex-none" />
            </div>
          ) : (
            <HorizontalCarousel>
              {upcomingEvents.map((event) => (
                <div key={event.id} className="w-96">
                  <EventCard
                    id={event.id}
                    title={event.title}
                    dateTime={event.dateTime.toString()}
                    location={event.location}
                    description={event.description}
                    ticketsAvailable={event.ticketsAvailable}
                    rsvpCount={event.rsvpCount}
                    organizerName={event.organizerName}
                  />
                </div>
              ))}
            </HorizontalCarousel>
          )}
        </section>
      </main>
    </div>
  );
}
