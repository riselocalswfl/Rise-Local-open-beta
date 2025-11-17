import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import HomeHero from "@/components/HomeHero";
import ProductCard from "@/components/ProductCard";
import VendorCard from "@/components/VendorCard";
import EventCard from "@/components/EventCard";
import ServiceProviderCard from "@/components/ServiceProviderCard";
import MobileCategoryNav from "@/components/MobileCategoryNav";
import { Skeleton } from "@/components/ui/skeleton";
import { getProductsWithVendors, getEventsWithOrganizers } from "@/lib/api";
import type { Vendor, ServiceProvider } from "@shared/schema";

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

  const { data: vendors, isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors/verified"],
  });

  const { data: serviceProviders, isLoading: servicesLoading } = useQuery<ServiceProvider[]>({
    queryKey: ["/api/services"],
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events-with-organizers"],
    queryFn: getEventsWithOrganizers,
  });

  const featuredProducts = products?.slice(0, 3) || [];
  const featuredVendors = vendors?.slice(0, 2) || [];
  const featuredServices = serviceProviders?.slice(0, 3) || [];
  const upcomingEvents =
    events?.filter((e) => new Date(e.dateTime) > new Date()).slice(0, 2) || [];

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main>
        <section className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <HomeHero />
        </section>

        <section className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading text-3xl text-text">Featured Nearby Goods</h2>
              <p className="text-text/70 mt-1">
                Discover products from local artisans and makers
              </p>
            </div>
            <Link href="/products" data-testid="link-view-all-products">
              <button className="hidden md:flex text-sm text-primary hover:text-primary/80 items-center gap-1 transition">
                View All
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </Link>
          </div>
          
          <MobileCategoryNav
            categories={["Bakery", "Beverages", "Plants", "Organic", "Artisan"]}
            baseUrl="/products"
            title="Shop by Category"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productsLoading ? (
              <>
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
              </>
            ) : (
              featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price ? parseFloat(product.price) : 0}
                  vendorName={product.vendorName || "Unknown Vendor"}
                  vendorId={product.vendorId}
                  inventory={product.inventory}
                  isVerifiedVendor={product.isVerifiedVendor}
                />
              ))
            )}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading text-3xl text-text">Meet Local Makers</h2>
              <p className="text-text/70 mt-1">
                Connect with verified vendors in your community
              </p>
            </div>
            <Link href="/vendors" data-testid="link-view-all-vendors">
              <button className="hidden md:flex text-sm text-primary hover:text-primary/80 items-center gap-1 transition">
                View All
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </Link>
          </div>
          
          <MobileCategoryNav
            categories={["Food", "Beverages", "Home & Garden", "Crafts"]}
            baseUrl="/vendors"
            title="Browse Vendors"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {vendorsLoading ? (
              <>
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
              </>
            ) : (
              featuredVendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  id={vendor.id}
                  name={vendor.businessName}
                  bio={vendor.bio || ""}
                  city={vendor.city}
                  categories={vendor.categories as string[] || []}
                  values={vendor.values as string[] || undefined}
                  isVerified={vendor.isVerified}
                  followerCount={vendor.followerCount}
                />
              ))
            )}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading text-3xl text-text">Local Services</h2>
              <p className="text-text/70 mt-1">
                Find trusted professionals for your needs
              </p>
            </div>
            <Link href="/services" data-testid="link-view-all-services">
              <button className="hidden md:flex text-sm text-primary hover:text-primary/80 items-center gap-1 transition">
                View All
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </Link>
          </div>
          
          <MobileCategoryNav
            categories={["Personal & Wellness", "Home & Property", "Events & Creative", "Professional"]}
            baseUrl="/services"
            title="Browse Services"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicesLoading ? (
              <>
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
              </>
            ) : (
              featuredServices.map((provider) => (
                <ServiceProviderCard
                  key={provider.id}
                  provider={provider}
                />
              ))
            )}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 md:px-6 py-12 pb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading text-3xl text-text">Upcoming Events</h2>
              <p className="text-text/70 mt-1">
                Join workshops, markets, and community gatherings
              </p>
            </div>
            <Link href="/events" data-testid="link-view-all-events">
              <button className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition">
                View All
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {eventsLoading ? (
              <>
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </>
            ) : (
              upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  dateTime={event.dateTime.toString()}
                  location={event.location}
                  description={event.description}
                  ticketsAvailable={event.ticketsAvailable}
                  rsvpCount={event.rsvpCount}
                  organizerName={event.organizerName}
                />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
