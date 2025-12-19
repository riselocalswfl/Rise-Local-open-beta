import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@assets/ChatGPT_Image_Dec_17,_2025,_03_54_36_PM_1766004883576.png";

export default function Auth() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const returnTo = typeof window !== 'undefined' ? sessionStorage.getItem("returnTo") : null;

  // If user is already authenticated, redirect to discover
  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/discover");
    }
  }, [user, isLoading, setLocation]);
  
  const handleStartSelling = () => {
    const url = returnTo 
      ? `/api/login?intended_role=vendor&returnTo=${encodeURIComponent(returnTo)}`
      : "/api/login?intended_role=vendor";
    window.location.href = url;
  };

  const handleBuyerSignup = () => {
    const url = returnTo 
      ? `/api/login?intended_role=buyer&returnTo=${encodeURIComponent(returnTo)}`
      : "/api/login?intended_role=buyer";
    window.location.href = url;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div 
        className="relative flex-1 flex flex-col"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70" />
        
        <header className="relative z-10 px-4 py-3">
          <BrandLogo size="sm" />
        </header>

        <main className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-12 pt-8">
          <div className="max-w-md mx-auto w-full text-center space-y-6">
            <div className="space-y-2">
              <h1 
                className="text-3xl md:text-4xl font-bold text-white leading-tight drop-shadow-lg"
                data-testid="heading-auth-hero"
              >
                Shop local. Sell local.
              </h1>
              <p className="text-lg text-white/90 drop-shadow" data-testid="text-auth-subheadline">
                Deals from Fort Myers businesses
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Button 
                size="lg"
                className="w-full h-14 text-lg font-semibold bg-white text-foreground hover:bg-white/90"
                onClick={handleBuyerSignup}
                data-testid="button-shop-local"
              >
                Shop Local
              </Button>
              
              <Button 
                size="lg"
                variant="outline"
                className="w-full h-14 text-lg font-semibold border-2 border-white text-white bg-white/10 backdrop-blur-sm hover:bg-white/20"
                onClick={handleStartSelling}
                data-testid="button-sell-with-us"
              >
                Sell With Us
              </Button>
            </div>

            <p className="text-sm text-white/80 pt-4 drop-shadow">
              Join local shops, restaurants & service providers
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
