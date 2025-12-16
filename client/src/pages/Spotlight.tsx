import { Star } from "lucide-react";
import Header from "@/components/Header";
import VendorCard from "@/components/VendorCard";
import EventCard from "@/components/EventCard";
import ProductCard from "@/components/ProductCard";
import { Badge } from "@/components/ui/badge";
import heroImage from "@assets/generated_images/Fort_Myers_local_market_hero_09220f3f.png";

export default function Spotlight() {
  // todo: remove mock functionality
  const spotlightData = {
    title: "Discover Fort Myers Local Treasures",
    body: "Fort Myers is home to a thriving community of artisans, farmers, and local makers who bring passion and craftsmanship to everything they create. Our spotlight celebrates the diverse voices and talents that make our local community unique. From organic bakeries to sustainable plant nurseries, each featured business represents the heart and soul of our neighborhood. Join us in supporting local and discover deals that save you money while connecting you to your neighbors.",
    city: "Fort Myers",
  };

  const featuredVendors = [
    {
      id: "v1",
      name: "Artisan Bakery",
      bio: "Handcrafted sourdough and pastries made with locally sourced organic ingredients. Baking fresh daily since 2020.",
      city: "Fort Myers",
      values: ["Organic", "Locally Sourced"],
      isVerified: true,
      followerCount: 245,
    },
    {
      id: "v2",
      name: "Tropical Kombucha Co.",
      bio: "Small-batch fermented beverages with tropical flavors. Probiotic-rich and locally brewed.",
      city: "Fort Myers",
      values: ["Health Focused", "Organic"],
      isVerified: true,
      followerCount: 189,
    },
  ];

  const featuredEvents = [
    {
      id: "e1",
      title: "Kombucha Brewing Workshop",
      dateTime: "2025-10-15T14:00:00",
      location: "Community Center, Fort Myers",
      category: "Workshop",
      description: "Learn the art of brewing kombucha from scratch. We'll cover fermentation techniques, flavor combinations, and health benefits.",
      ticketsAvailable: 15,
      rsvpCount: 28,
      organizerName: "Tropical Kombucha Co.",
    },
  ];

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-16" aria-hidden="true" />
      <main>
        {/* Hero Banner */}
        <div className="relative h-[50vh] overflow-hidden">
          <img
            src={heroImage}
            alt="Fort Myers Spotlight"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20" />
          <div className="relative h-full flex flex-col justify-end p-6 md:p-12 max-w-7xl mx-auto">
            <Badge className="mb-4 bg-chart-3 text-white border-0 w-fit">
              <Star className="w-3 h-3 mr-1" />
              Fort Myers Spotlight
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {spotlightData.title}
            </h1>
          </div>
        </div>

        {/* Featured Content */}
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
          {/* Description */}
          <div className="max-w-3xl">
            <p className="text-lg leading-relaxed text-muted-foreground">
              {spotlightData.body}
            </p>
          </div>

          {/* Featured Vendors */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-border" />
              <h2 className="text-2xl font-semibold">Featured Vendors</h2>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {featuredVendors.map((vendor) => (
                <VendorCard key={vendor.id} {...vendor} />
              ))}
            </div>
          </section>

          {/* Featured Events */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-border" />
              <h2 className="text-2xl font-semibold">Spotlight Events</h2>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {featuredEvents.map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>
          </section>

          {/* Featured Products */}
          <section className="pb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-border" />
              <h2 className="text-2xl font-semibold">Featured Products</h2>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
