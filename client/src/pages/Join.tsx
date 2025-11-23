import { Link } from "wouter";
import { Store, ArrowRight, CheckCircle2, ShoppingBag, Users, Leaf } from "lucide-react";
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
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #FDFBF7 0%, #F8F6F1 100%)'
    }}>
      {/* Subtle texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%237C9A67' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Decorative botanical accent - top right */}
      <div className="absolute top-20 right-10 opacity-[0.04] pointer-events-none hidden lg:block">
        <Leaf className="w-32 h-32 text-primary transform rotate-45" />
      </div>

      {/* Decorative botanical accent - bottom left */}
      <div className="absolute bottom-20 left-10 opacity-[0.04] pointer-events-none hidden lg:block">
        <Leaf className="w-24 h-24 text-primary transform -rotate-12" />
      </div>

      <header className="border-b bg-background/60 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 py-5">
          <BrandLogo />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-5xl">
          <div className="text-center space-y-10">
            {/* Hero Section */}
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-playfair font-bold tracking-tight leading-tight">
                Welcome to Rise Local
              </h1>
              
              {/* Subtle accent bar */}
              <div className="flex items-center justify-center gap-3">
                <div className="h-[2px] w-16 bg-gradient-to-r from-transparent to-primary/40"></div>
                <div className="h-[3px] w-24 bg-primary/60 rounded-full"></div>
                <div className="h-[2px] w-16 bg-gradient-to-l from-transparent to-primary/40"></div>
              </div>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Southwest Florida marketplace connecting local vendors with community members who value local goods and services
              </p>
            </div>

            {/* Dual CTAs */}
            <div className="grid md:grid-cols-2 gap-8 my-16 max-w-4xl mx-auto">
              {/* Buyer Card */}
              <Card 
                className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 active:-translate-y-0.5 border-muted/40 bg-card/80 backdrop-blur-sm flex flex-col" 
                onClick={handleBuyerSignup} 
                data-testid="card-buyer-signup"
                style={{
                  boxShadow: '0 2px 8px rgba(124, 154, 103, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)'
                }}
              >
                <CardContent className="p-10 text-center flex flex-col flex-1">
                  <div className="space-y-5 flex-1">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-3 transition-transform duration-300 group-hover:scale-105">
                      <ShoppingBag className="w-9 h-9 text-primary" />
                    </div>
                    
                    <h2 className="text-3xl font-semibold font-playfair">I want to shop</h2>
                    
                    <p className="text-muted-foreground text-base leading-relaxed">
                      Discover and support local Southwest Florida businesses, products, and services
                    </p>
                    
                    <div className="space-y-3 text-sm text-muted-foreground text-left pt-2">
                      <div className="flex items-start gap-3 group/item">
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0 transition-transform duration-200 group-hover/item:scale-110" />
                        <span>Browse local shops, restaurants & services</span>
                      </div>
                      <div className="flex items-start gap-3 group/item">
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0 transition-transform duration-200 group-hover/item:scale-110" />
                        <span>Track orders and favorites</span>
                      </div>
                      <div className="flex items-start gap-3 group/item">
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0 transition-transform duration-200 group-hover/item:scale-110" />
                        <span>Connect with local vendors</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    size="lg"
                    className="w-full mt-6 transition-all duration-200 hover:shadow-md"
                    data-testid="button-buyer-signup"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBuyerSignup();
                    }}
                  >
                    Sign up to Shop
                    <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>

              {/* Vendor Card */}
              <Card 
                className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:-translate-y-0.5 border-primary/30 bg-card/80 backdrop-blur-sm flex flex-col" 
                onClick={handleStartSelling} 
                data-testid="card-vendor-signup"
                style={{
                  boxShadow: '0 2px 12px rgba(124, 154, 103, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08)'
                }}
              >
                <CardContent className="p-10 text-center flex flex-col flex-1">
                  <div className="space-y-5 flex-1">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-3 transition-transform duration-300 group-hover:scale-105">
                      <Store className="w-9 h-9 text-primary" />
                    </div>
                    
                    <h2 className="text-3xl font-semibold font-playfair">I want to sell</h2>
                    
                    <p className="text-muted-foreground text-base leading-relaxed">
                      Join Southwest Florida's premier marketplace and grow your local business
                    </p>
                    
                    <div className="space-y-3 text-sm text-muted-foreground text-left pt-2">
                      <div className="flex items-start gap-3 group/item">
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0 transition-transform duration-200 group-hover/item:scale-110" />
                        <span>Simple 5-minute setup</span>
                      </div>
                      <div className="flex items-start gap-3 group/item">
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0 transition-transform duration-200 group-hover/item:scale-110" />
                        <span>No transaction fees</span>
                      </div>
                      <div className="flex items-start gap-3 group/item">
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0 transition-transform duration-200 group-hover/item:scale-110" />
                        <span>Reach local Southwest Florida customers</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    size="lg"
                    className="w-full mt-6 transition-all duration-200 hover:shadow-md"
                    data-testid="button-start-selling"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartSelling();
                    }}
                  >
                    Start Selling
                    <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Footer Info */}
            <div className="pt-10 border-t border-muted/30 max-w-2xl mx-auto">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Perfect for Southwest Florida shops, restaurants, food vendors, and service providers
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
