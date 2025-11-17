import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Store, Utensils, Wrench, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import BrandLogo from "@/components/BrandLogo";

export default function Join() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"role" | "vendor-type">("role");

  const handleVendorTypeSelect = (vendorType: string) => {
    // Store normalized vendor type in sessionStorage before auth
    // vendorType is already normalized: "shop" | "restaurant" | "service"
    sessionStorage.setItem("vendorType", vendorType);
    
    // Map vendor type to role for auth callback
    const roleMap: Record<string, string> = {
      shop: "vendor",
      restaurant: "restaurant",
      service: "service_provider"
    };
    const intendedRole = roleMap[vendorType] || "vendor";
    
    // Redirect to Replit Auth (don't store intendedRole to avoid confusion)
    window.location.href = `/api/login?intended_role=${intendedRole}`;
  };

  const handleBuyerSelect = () => {
    sessionStorage.setItem("vendorType", "buyer");
    window.location.href = "/api/login?intended_role=buyer";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" data-testid="link-home">
            <BrandLogo />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          {step === "role" && (
            <>
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-playfair font-bold mb-4">
                  Join Rise Local
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Choose how you'd like to join our community of local buyers and vendors in Fort Myers
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
            <Card className="hover-elevate transition-all">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">I'm a Buyer</CardTitle>
                <CardDescription className="text-base">
                  Shop local products and support Fort Myers vendors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Discover local vendors and artisans</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Filter by values that matter to you</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Support sustainable local businesses</span>
                  </li>
                </ul>
                <Button 
                  className="w-full" 
                  size="lg" 
                  data-testid="button-join-buyer"
                  onClick={handleBuyerSelect}
                >
                  Sign Up as Buyer
                </Button>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all border-primary/20">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Store className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">I'm a Vendor</CardTitle>
                <CardDescription className="text-base">
                  Sell your products to the local community
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Reach local customers actively seeking your products</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>No transaction fees for vendors</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Showcase your business values and story</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Host events and build community</span>
                  </li>
                </ul>
                <Button 
                  className="w-full" 
                  size="lg" 
                  variant="default" 
                  data-testid="button-join-vendor"
                  onClick={() => setStep("vendor-type")}
                >
                  Sign Up as Vendor
                </Button>
              </CardContent>
            </Card>
              </div>

              <div className="text-center mt-8">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                    Log in
                  </Link>
                </p>
              </div>
            </>
          )}

          {step === "vendor-type" && (
            <>
              <div className="mb-8">
                <Button 
                  variant="ghost" 
                  onClick={() => setStep("role")}
                  className="gap-2"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </div>

              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-playfair font-bold mb-4">
                  What Type of Vendor?
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Choose the category that best describes your business
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <Card className="hover-elevate transition-all">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <ShoppingBag className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Shop</CardTitle>
                    <CardDescription>
                      Sell products, goods, and artisan items
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                      <li className="flex items-start">
                        <span className="mr-2">✓</span>
                        <span>List products with inventory</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">✓</span>
                        <span>Multiple fulfillment options</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">✓</span>
                        <span>Host events and workshops</span>
                      </li>
                    </ul>
                    <Button 
                      className="w-full" 
                      data-testid="button-vendor-type-shop"
                      onClick={() => handleVendorTypeSelect("shop")}
                    >
                      Continue as Shop
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover-elevate transition-all border-primary/20">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Utensils className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Dine</CardTitle>
                    <CardDescription>
                      Restaurant, cafe, or food service
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                      <li className="flex items-start">
                        <span className="mr-2">✓</span>
                        <span>Display your menu items</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">✓</span>
                        <span>Showcase your cuisine</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">✓</span>
                        <span>Connect with local diners</span>
                      </li>
                    </ul>
                    <Button 
                      className="w-full"
                      data-testid="button-vendor-type-restaurant"
                      onClick={() => handleVendorTypeSelect("restaurant")}
                    >
                      Continue as Dine
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover-elevate transition-all">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Wrench className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Services</CardTitle>
                    <CardDescription>
                      Offer professional services
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                      <li className="flex items-start">
                        <span className="mr-2">✓</span>
                        <span>List your services</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">✓</span>
                        <span>Accept booking requests</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">✓</span>
                        <span>Build your client base</span>
                      </li>
                    </ul>
                    <Button 
                      className="w-full"
                      data-testid="button-vendor-type-service"
                      onClick={() => handleVendorTypeSelect("service")}
                    >
                      Continue as Services
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center mt-8">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                    Log in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
