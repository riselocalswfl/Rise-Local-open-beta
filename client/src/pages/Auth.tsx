import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";

export default function Auth() {
  const returnTo = typeof window !== 'undefined' ? sessionStorage.getItem("returnTo") : null;
  
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
    <div className="min-h-screen flex flex-col bg-white">
      <header className="px-4 py-3 border-b border-border/50">
        <BrandLogo size="sm" linkDisabled />
      </header>

      <main className="flex-1 flex flex-col justify-center px-6 py-8">
        <div className="max-w-md mx-auto w-full text-center space-y-6">
          <div className="space-y-2">
            <h1 
              className="text-2xl md:text-3xl font-bold text-foreground leading-tight"
              data-testid="heading-auth-hero"
            >
              Shop local. Sell local.
            </h1>
            <p className="text-base text-muted-foreground" data-testid="text-auth-subheadline">
              Southwest Florida's local marketplace
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Button 
              size="lg"
              className="w-full h-14 text-lg font-semibold"
              onClick={handleBuyerSignup}
              data-testid="button-shop-local"
            >
              Shop Local
            </Button>
            
            <Button 
              size="lg"
              variant="outline"
              className="w-full h-14 text-lg font-semibold border-2"
              onClick={handleStartSelling}
              data-testid="button-sell-with-us"
            >
              Sell With Us
            </Button>
          </div>

          <p className="text-sm text-muted-foreground pt-4">
            Join local shops, restaurants & service providers
          </p>
        </div>
      </main>
    </div>
  );
}
