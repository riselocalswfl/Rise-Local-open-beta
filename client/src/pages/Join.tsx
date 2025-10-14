import { Link } from "wouter";
import { ShoppingBag, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import BrandLogo from "@/components/BrandLogo";

export default function Join() {
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
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-playfair font-bold mb-4">
              Join SHOP SMALL
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
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Earn loyalty points with every purchase</span>
                  </li>
                </ul>
                <Link href="/join/buyer">
                  <Button className="w-full" size="lg" data-testid="button-join-buyer">
                    Sign Up as Buyer
                  </Button>
                </Link>
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
                <Link href="/join/vendor">
                  <Button className="w-full" size="lg" variant="default" data-testid="button-join-vendor">
                    Sign Up as Vendor
                  </Button>
                </Link>
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
        </div>
      </main>
    </div>
  );
}
