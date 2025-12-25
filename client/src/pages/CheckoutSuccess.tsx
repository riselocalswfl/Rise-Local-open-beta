import { Link } from "wouter";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AppShell from "@/components/layout/AppShell";

export default function CheckoutSuccess() {
  return (
    <AppShell hideTabs>
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-3" data-testid="heading-checkout-success">
              Welcome to Rise Local Pass!
            </h1>
            
            <p className="text-muted-foreground mb-8">
              Your membership is now active. Start discovering exclusive deals from local businesses in Southwest Florida.
            </p>

            <Card className="mb-6">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-2">What's next?</h3>
                <ul className="text-sm text-muted-foreground text-left space-y-2">
                  <li>Browse exclusive member-only deals</li>
                  <li>Save at local restaurants, shops & services</li>
                  <li>Redeem deals in-store with your phone</li>
                </ul>
              </CardContent>
            </Card>

            <Link href="/discover">
              <Button size="lg" className="w-full" data-testid="button-back-to-discover">
                Start Exploring Deals
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
