import VendorCard from '../VendorCard';

export default function VendorCardExample() {
  return (
    <div className="p-6 max-w-2xl">
      <VendorCard
        id="v1"
        name="Artisan Bakery"
        bio="Handcrafted sourdough and pastries made with locally sourced organic ingredients. Baking fresh daily since 2020."
        city="SWFL"
        categories={["Bakery", "Organic", "Artisan"]}
        isVerified={true}
        followerCount={245}
      />
    </div>
  );
}
