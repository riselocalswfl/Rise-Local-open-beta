import { Link } from "wouter";
import { ArrowRight, ShoppingBag, Users, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import SpotlightBanner from "@/components/SpotlightBanner";
import ProductCard from "@/components/ProductCard";
import VendorCard from "@/components/VendorCard";
import EventCard from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getProductsWithVendors, getEventsWithOrganizers } from "@/lib/api";
import type { Vendor, Spotlight } from "@shared/schema";

export default function Home() {
  const { data: spotlightData } = useQuery<Spotlight>({
    queryKey: ["/api/spotlight/active"],
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products-with-vendors"],
    queryFn: getProductsWithVendors,
  });

  const { data: vendors, isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors/verified"],
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events-with-organizers"],
    queryFn: getEventsWithOrganizers,
  });

  const categories = [
    { name: "Bakery", icon: ShoppingBag, count: products?.filter(p => p.category === "Bakery").length || 0 },
    { name: "Beverages", icon: ShoppingBag, count: products?.filter(p => p.category === "Beverages").length || 0 },
    { name: "Plants", icon: ShoppingBag, count: products?.filter(p => p.category === "Plants").length || 0 },
    { name: "Artisan", icon: ShoppingBag, count: products?.filter(p => p.category === "Artisan").length || 0 },
  ];

  const featuredProducts = products?.slice(0, 3) || [];
  const featuredVendors = vendors?.slice(0, 2) || [];
  const upcomingEvents = events?.filter(e => new Date(e.dateTime) > new Date()).slice(0, 2) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {spotlightData && (
          <section className="max-w-7xl mx-auto px-4 py-8">
            <SpotlightBanner {...spotlightData} />
          </section>
        )}

        <section className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="text-3xl font-serif font-bold mb-2">Browse Categories</h2>
          <div className="h-0.5 w-20 mb-6" style={{ background: 'var(--le-wheat)' }} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Card key={category.name} className="le-card cursor-pointer transition-all duration-200">
                <CardContent className="p-6 text-center">
                  <category.icon className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--le-green)' }} strokeWidth={1.75} />
                  <h3 className="font-semibold mb-1">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.count} items</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-serif font-bold mb-2">Featured Products</h2>
              <div className="h-0.5 w-20" style={{ background: 'var(--le-wheat)' }} />
            </div>
            <Button variant="ghost" asChild className="rounded-pill">
              <Link href="/products" data-testid="link-view-all-products">
                View All
                <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.75} />
              </Link>
            </Button>
          </div>
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
                  price={parseFloat(product.price)}
                  vendorName={product.vendorName}
                  vendorId={product.vendorId}
                  category={product.category}
                  inventory={product.inventory}
                  isVerifiedVendor={product.isVerifiedVendor}
                />
              ))
            )}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-serif font-bold mb-2">Top Vendors</h2>
              <div className="h-0.5 w-20" style={{ background: 'var(--le-wheat)' }} />
            </div>
            <Button variant="ghost" asChild className="rounded-pill">
              <Link href="/vendors" data-testid="link-view-all-vendors">
                View All
                <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.75} />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {vendorsLoading ? (
              <>
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
              </>
            ) : (
              featuredVendors.map((vendor) => (
                <VendorCard key={vendor.id} {...vendor} />
              ))
            )}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-8 pb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-serif font-bold mb-2">Upcoming Events</h2>
              <div className="h-0.5 w-20" style={{ background: 'var(--le-wheat)' }} />
            </div>
            <Button variant="ghost" asChild className="rounded-pill">
              <Link href="/events" data-testid="link-view-all-events">
                View All
                <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.75} />
              </Link>
            </Button>
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
                  category={event.category}
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
