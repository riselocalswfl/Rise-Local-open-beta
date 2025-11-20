import { Link } from "wouter";
import { Store, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";

export default function Join() {
  const handleStartSelling = () => {
    // Vendor flow: click button → authenticate → onboarding
    window.location.href = "/api/login?intended_role=vendor";
  };

  const handleBuyerSignup = () => {
    // Buyer flow: simple authentication for checkout/orders
    window.location.href = "/api/login?intended_role=buyer";
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-muted/30 to-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" data-testid="link-home">
            <BrandLogo />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center space-y-8">
            {/* Hero Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                <Store className="w-10 h-10 text-primary" />
              </div>
              
              <h1 className="text-4xl md:text-6xl font-playfair font-bold">
                Start Selling Locally
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Join Fort Myers' premier marketplace and connect with local customers who value what you offer
              </p>
            </div>

            {/* Benefits */}
            <div className="grid md:grid-cols-3 gap-6 my-12 max-w-3xl mx-auto">
              <div className="flex flex-col items-center text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-primary mb-2" />
                <h3 className="font-semibold">Simple Setup</h3>
                <p className="text-sm text-muted-foreground">
                  Create your profile in minutes
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-primary mb-2" />
                <h3 className="font-semibold">No Transaction Fees</h3>
                <p className="text-sm text-muted-foreground">
                  Keep more of what you earn
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-primary mb-2" />
                <h3 className="font-semibold">Local Community</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with Fort Myers customers
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-4">
              <Button 
                size="lg"
                className="text-lg px-8 py-6 h-auto"
                data-testid="button-start-selling"
                onClick={handleStartSelling}
              >
                Start Selling on Rise Local
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              
              <p className="text-sm text-muted-foreground">
                Takes less than 5 minutes to get started
              </p>
            </div>

            {/* Secondary Info */}
            <div className="pt-8 border-t max-w-2xl mx-auto space-y-4">
              <p className="text-sm text-muted-foreground">
                Perfect for shops, restaurants, food vendors, and service providers in Fort Myers, FL
              </p>
              
              <div className="flex flex-col items-center gap-3">
                <Link href="/" className="text-sm text-primary hover:underline inline-flex items-center" data-testid="link-browse">
                  Just browsing? Explore our marketplace
                  <ArrowRight className="ml-1 w-4 h-4" />
                </Link>
                
                <div className="text-sm text-muted-foreground">
                  Need an account to track orders?{" "}
                  <button 
                    onClick={handleBuyerSignup}
                    className="text-primary hover:underline"
                    data-testid="button-buyer-signup"
                  >
                    Sign up as a customer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
