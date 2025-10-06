import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import ProductCard from "@/components/ProductCard";

export default function Products() {
  // todo: remove mock functionality
  const products = [
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
    {
      id: "4",
      name: "Croissants (6-pack)",
      price: 12.99,
      vendorName: "Artisan Bakery",
      vendorId: "v1",
      category: "Bakery",
      inventory: 20,
      isVerifiedVendor: true,
    },
    {
      id: "5",
      name: "Lavender Kombucha",
      price: 7.00,
      vendorName: "Tropical Kombucha Co.",
      vendorId: "v2",
      category: "Beverages",
      inventory: 0,
      isVerifiedVendor: true,
    },
    {
      id: "6",
      name: "Herb Garden Kit",
      price: 34.99,
      vendorName: "Green Thumb Gardens",
      vendorId: "v3",
      category: "Plants",
      inventory: 3,
      isVerifiedVendor: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <FilterBar type="products" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold mb-8">All Products</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      </main>
    </div>
  );
}
