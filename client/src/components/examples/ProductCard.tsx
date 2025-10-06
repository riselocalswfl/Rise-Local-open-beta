import ProductCard from '../ProductCard';

export default function ProductCardExample() {
  return (
    <div className="p-6 max-w-sm">
      <ProductCard
        id="1"
        name="Sourdough Bread"
        price={8.99}
        vendorName="Artisan Bakery"
        vendorId="v1"
        category="Bakery"
        inventory={12}
        isVerifiedVendor={true}
      />
    </div>
  );
}
