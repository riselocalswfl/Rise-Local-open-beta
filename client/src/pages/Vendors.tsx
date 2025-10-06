import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import VendorCard from "@/components/VendorCard";

export default function Vendors() {
  // todo: remove mock functionality
  const vendors = [
    {
      id: "v1",
      name: "Artisan Bakery",
      bio: "Handcrafted sourdough and pastries made with locally sourced organic ingredients. Baking fresh daily since 2020.",
      city: "Fort Myers",
      categories: ["Bakery", "Organic", "Artisan"],
      isVerified: true,
      followerCount: 245,
    },
    {
      id: "v2",
      name: "Tropical Kombucha Co.",
      bio: "Small-batch fermented beverages with tropical flavors. Probiotic-rich and locally brewed.",
      city: "Fort Myers",
      categories: ["Beverages", "Health", "Organic"],
      isVerified: true,
      followerCount: 189,
    },
    {
      id: "v3",
      name: "Green Thumb Gardens",
      bio: "Sustainable plants and gardening supplies. From succulents to herb kits, we help you grow.",
      city: "Fort Myers",
      categories: ["Plants", "Home & Garden", "Sustainable"],
      isVerified: false,
      followerCount: 156,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <FilterBar type="vendors" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold mb-8">Local Vendors</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {vendors.map((vendor) => (
            <VendorCard key={vendor.id} {...vendor} />
          ))}
        </div>
      </main>
    </div>
  );
}
