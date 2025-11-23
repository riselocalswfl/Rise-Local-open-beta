import { Link } from "wouter";
import { Store, ArrowRight, CheckCircle2, ShoppingBag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BrandLogo from "@/components/BrandLogo";
import { useEffect } from "react";

export default function Join() {
  // Get returnTo URL from sessionStorage if user was redirected here
  const returnTo = typeof window !== 'undefined' ? sessionStorage.getItem("returnTo") : null;
  
  const handleStartSelling = () => {
    // Vendor flow: click button → authenticate → onboarding
    const url = returnTo 
      ? `/api/login?intended_role=vendor&returnTo=${encodeURIComponent(returnTo)}`
      : "/api/login?intended_role=vendor";
    window.location.href = url;
  };

  const handleBuyerSignup = () => {
    // Buyer flow: simple authentication for browsing/shopping
    const url = returnTo 
      ? `/api/login?intended_role=buyer&returnTo=${encodeURIComponent(returnTo)}`
      : "/api/login?intended_role=buyer";
    window.location.href = url;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-muted/30 to-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <BrandLogo />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          <div className="text-center space-y-8">
            {/* Hero Section */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-playfair font-bold">
                Welcome to Rise Local
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Fort Myers' marketplace connecting local vendors with community members who value local goods and services
              </p>
            </div>

            {/* Dual CTAs */}
            <div className="grid md:grid-cols-2 gap-6 my-12 max-w-4xl mx-auto">
              {/* Buyer Card */}
              <Card className="hover-elevate active-elevate-2 cursor-pointer" onClick={handleBuyerSignup} data-testid="card-buyer-signup">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                    <ShoppingBag className="w-8 h-8 text-primary" />
                  </div>
                  
                  <h2 className="text-2xl font-semibold">I want to shop</h2>
                  
                  <p className="text-muted-foreground">
                    Discover and support local Fort Myers businesses, products, and services
                  </p>
                  
                  <div className="space-y-2 text-sm text-muted-foreground text-left">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Browse local shops, restaurants & services</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Track orders and favorites</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Connect with local vendors</span>
                    </div>
                  </div>
                  
                  <Button 
                    size="lg"
                    className="w-full"
                    data-testid="button-buyer-signup"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBuyerSignup();
                    }}
                  >
                    Sign up to Shop
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </CardContent>
              </Card>

              {/* Vendor Card */}
              <Card className="hover-elevate active-elevate-2 cursor-pointer border-primary/50" onClick={handleStartSelling} data-testid="card-vendor-signup">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                    <Store className="w-8 h-8 text-primary" />
                  </div>
                  
                  <h2 className="text-2xl font-semibold">I want to sell</h2>
                  
                  <p className="text-muted-foreground">
                    Join Fort Myers' premier marketplace and grow your local business
                  </p>
                  
                  <div className="space-y-2 text-sm text-muted-foreground text-left">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Simple 5-minute setup</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>No transaction fees</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Reach local Fort Myers customers</span>
                    </div>
                  </div>
                  
                  <Button 
                    size="lg"
                    className="w-full"
                    data-testid="button-start-selling"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartSelling();
                    }}
                  >
                    Start Selling
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Footer Info */}
            <div className="pt-8 border-t max-w-2xl mx-auto">
              <p className="text-sm text-muted-foreground">
                Perfect for Fort Myers shops, restaurants, food vendors, and service providers
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
