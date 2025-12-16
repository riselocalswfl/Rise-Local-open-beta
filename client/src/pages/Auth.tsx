import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import heroImage from "@assets/stock_images/local_business_store_cbe9ed3c.jpg";

export default function Auth() {
  const returnTo = typeof window !== 'undefined' ? sessionStorage.getItem("returnTo") : null;
  
  const handleShopLocal = () => {
    const url = returnTo 
      ? `/api/login?intended_role=buyer&returnTo=${encodeURIComponent(returnTo)}`
      : "/api/login?intended_role=buyer";
    window.location.href = url;
  };

  const handleSellWithUs = () => {
    const url = returnTo 
      ? `/api/login?intended_role=vendor&returnTo=${encodeURIComponent(returnTo)}`
      : "/api/login?intended_role=vendor";
    window.location.href = url;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Compact Header */}
      <header className="px-4 py-3 bg-white border-b border-gray-100">
        <BrandLogo size="sm" />
      </header>

      {/* Hero Section - Mobile First */}
      <main className="flex-1 flex flex-col">
        {/* Hero Image with Overlay */}
        <div className="relative h-[45vh] min-h-[280px] max-h-[400px]">
          <img 
            src={heroImage} 
            alt="Local community shopping" 
            className="w-full h-full object-cover"
          />
          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
          
          {/* Hero Text Overlay */}
          <div className="absolute inset-0 flex flex-col justify-end p-5 pb-8">
            <h1 
              className="text-3xl md:text-4xl font-bold text-white leading-tight mb-2"
              data-testid="heading-hero"
            >
              Shop Local. Support Local.
            </h1>
            <p 
              className="text-base md:text-lg text-white/90 leading-snug"
              data-testid="text-hero-subheadline"
            >
              Southwest Florida's marketplace for local businesses
            </p>
          </div>
        </div>

        {/* CTA Section - Always Above Fold */}
        <div className="flex-1 flex flex-col justify-center px-5 py-6 bg-white">
          <div className="space-y-4 max-w-md mx-auto w-full">
            {/* Primary CTA */}
            <Button 
              size="lg"
              onClick={handleShopLocal}
              className="w-full h-14 text-lg font-semibold"
              data-testid="button-shop-local"
            >
              Shop Local
            </Button>

            {/* Secondary CTA */}
            <Button 
              size="lg"
              variant="outline"
              onClick={handleSellWithUs}
              className="w-full h-14 text-lg font-semibold border-2"
              data-testid="button-sell-with-us"
            >
              Sell With Us
            </Button>

            {/* Trust Signal */}
            <p className="text-center text-sm text-muted-foreground pt-2">
              Join local vendors and shoppers in Fort Myers
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
