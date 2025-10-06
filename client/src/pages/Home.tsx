import { Link } from "wouter";
import { ArrowRight, ShoppingBag, Users, Calendar } from "lucide-react";
import Header from "@/components/Header";
import SpotlightBanner from "@/components/SpotlightBanner";
import ProductCard from "@/components/ProductCard";
import VendorCard from "@/components/VendorCard";
import EventCard from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  // todo: remove mock functionality
  const spotlightData = {
    title: "Discover Fort Myers Local Treasures",
    body: "Explore the vibrant community of local artisans, farmers, and makers bringing fresh, sustainable products to your neighborhood. From farm-fresh produce to handcrafted goods, experience the best of Fort Myers.",
    city: "Fort Myers",
  };

  const featuredProducts = [
    {
      id: "1",
      name: "Sourdough Bread",
      price: 8.99,
      vendorName: "Artisan Bakery",
      vendorId: "v1",
      category: "Bakery",
      inventory: 12,
      isVerifiedVendor: true,
    },
    {
      id: "2",
      name: "Ginger Kombucha",
      price: 6.50,
      vendorName: "Tropical Kombucha Co.",
      vendorId: "v2",
      category: "Beverages",
      inventory: 8,
      isVerifiedVendor: true,
    },
    {
      id: "3",
      name: "Succulent Collection",
      price: 24.99,
      vendorName: "Green Thumb Gardens",
      vendorId: "v3",
      category: "Plants",
      inventory: 5,
      isVerifiedVendor: false,
    },
  ];

  const featuredVendors = [
    {
      id: "v1",
      name: "Artisan Bakery",
      bio: "Handcrafted sourdough and pastries made with locally sourced organic ingredients.",
      city: "Fort Myers",
      categories: ["Bakery", "Organic"],
      isVerified: true,
      followerCount: 245,
    },
  ];

  const upcomingEvents = [
    {
      id: "e1",
      title: "Kombucha Brewing Workshop",
      dateTime: "2025-10-15T14:00:00",
      location: "Community Center",
      category: "Workshop",
      description: "Learn the art of brewing kombucha from scratch.",
      ticketsAvailable: 15,
      rsvpCount: 28,
      organizerName: "Tropical Kombucha Co.",
    },
  ];

  const categories = [
    { name: "Bakery", icon: ShoppingBag, count: 45 },
    { name: "Beverages", icon: ShoppingBag, count: 32 },
    { name: "Plants", icon: ShoppingBag, count: 28 },
    { name: "Artisan", icon: ShoppingBag, count: 56 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero / Spotlight Section */}
        <section className="max-w-7xl mx-auto px-4 py-8">
          <SpotlightBanner {...spotlightData} />
        </section>

        {/* Quick Categories */}
        <section className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-semibold mb-6">Browse Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <Card key={category.name} className="hover-elevate cursor-pointer">
                <CardContent className="p-6 text-center">
                  <category.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <h3 className="font-medium mb-1">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.count} items</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Featured Products</h2>
            <Button variant="ghost" asChild>
              <Link href="/products">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        </section>

        {/* Featured Vendors */}
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Top Vendors</h2>
            <Button variant="ghost" asChild>
              <Link href="/vendors">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {featuredVendors.map((vendor) => (
              <VendorCard key={vendor.id} {...vendor} />
            ))}
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="max-w-7xl mx-auto px-4 py-8 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Upcoming Events</h2>
            <Button variant="ghost" asChild>
              <Link href="/events">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
