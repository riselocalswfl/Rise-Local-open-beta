import { Link } from "wouter";
import { Check, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppShell from "@/components/layout/AppShell";

const BENEFITS = [
  "Save at local restaurants, shops & services",
  "Exclusive members-only deals",
  "Pays for itself with one deal",
  "Discover great businesses near you",
];

export default function Membership() {
  return (
    <AppShell hideTabs>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            <Link href="/discover">
              <button className="p-2 -ml-2" data-testid="button-back">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
            </Link>
            <h1 className="font-semibold text-foreground">Rise Local Pass</h1>
          </div>
        </header>

        <div className="p-4 max-w-lg mx-auto">
          {/* Hero */}
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="heading-membership">
              Unlock Local Savings
            </h2>
            <p className="text-muted-foreground">
              One membership. Hundreds of exclusive deals across SWFL.
            </p>
          </div>

          {/* Pricing Card */}
          <Card className="mb-8">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Rise Local Pass</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-4">
                <span className="text-4xl font-bold text-foreground" data-testid="text-price">$4.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <Button className="w-full" size="lg" data-testid="button-subscribe">
                Start Saving Today
              </Button>
            </CardContent>
          </Card>

          {/* Benefits */}
          <div className="mb-6" id="benefits">
            <h3 className="font-semibold text-foreground mb-4 text-lg" data-testid="heading-benefits">
              Why You'll Love Rise Local
            </h3>
            <ul className="space-y-4">
              {BENEFITS.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-foreground" data-testid={`text-benefit-${index}`}>
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Reassurance */}
          <p className="text-center text-sm text-muted-foreground mb-8">
            Cancel anytime &bull; No commitment
          </p>

          {/* FAQ teaser */}
          <Card className="bg-muted/50">
            <CardContent className="py-4">
              <h4 className="font-medium text-foreground mb-2">Have questions?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Learn more about how Rise Local Pass works and the deals available near you.
              </p>
              <Link href="/membership/faq">
                <Button variant="outline" size="sm" data-testid="link-faq">
                  Read FAQ
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Bottom spacing */}
          <div className="h-8" />
        </div>
      </div>
    </AppShell>
  );
}
