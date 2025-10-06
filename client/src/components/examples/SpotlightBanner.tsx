import SpotlightBanner from '../SpotlightBanner';

export default function SpotlightBannerExample() {
  return (
    <div className="p-6">
      <SpotlightBanner
        title="Discover Fort Myers Local Treasures"
        body="Explore the vibrant community of local artisans, farmers, and makers bringing fresh, sustainable products to your neighborhood. From farm-fresh produce to handcrafted goods, experience the best of Fort Myers."
        city="Fort Myers"
      />
    </div>
  );
}
