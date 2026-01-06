import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { ArrowLeft, Lock, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type PlanType = 'monthly' | 'annual';

const PLAN_DETAILS: Record<PlanType, { name: string; price: string; priceNum: number; period: string; savings?: string }> = {
  monthly: {
    name: "Monthly Plan",
    price: "$4.99",
    priceNum: 4.99,
    period: "/month",
  },
  annual: {
    name: "Annual Plan",
    price: "$44.91",
    priceNum: 44.91,
    period: "/year",
    savings: "Save 25%",
  },
};

export default function Checkout() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  
  const params = new URLSearchParams(searchString);
  const planParam = params.get('plan');
  const initialPlan: PlanType = planParam === 'annual' ? 'annual' : 'monthly';
  
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(initialPlan);

  useEffect(() => {
    const newParams = new URLSearchParams(window.location.search);
    newParams.set('plan', selectedPlan);
    window.history.replaceState({}, '', `/checkout?${newParams.toString()}`);
  }, [selectedPlan]);

  const checkoutMutation = useMutation({
    mutationFn: async (plan: PlanType) => {
      const response = await apiRequest("POST", "/api/billing/create-checkout-session", { plan });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Error",
          description: data.error || "Could not start checkout. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePayNow = () => {
    if (!user) {
      setLocation('/auth?returnTo=/checkout?plan=' + selectedPlan);
      return;
    }
    checkoutMutation.mutate(selectedPlan);
  };

  const plan = PLAN_DETAILS[selectedPlan];

  if (authLoading) {
    return (
      <AppShell hideTabs>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideTabs>
      <div className="min-h-screen bg-background pb-32">
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            <Link href="/membership">
              <button className="p-2 -ml-2" data-testid="button-back-checkout">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
            </Link>
            <h1 className="font-semibold text-foreground">Checkout</h1>
          </div>
        </header>

        <div className="p-4 max-w-lg mx-auto">
          <div className="text-center py-6 mb-2">
            <h2 className="text-xl font-bold text-foreground mb-2" data-testid="heading-checkout">
              Complete Your Purchase
            </h2>
            <p className="text-muted-foreground text-sm">
              Get your Rise Local Pass and start saving today.
            </p>
          </div>

          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Select Your Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex rounded-lg border border-border p-1 bg-muted/30">
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
                    selectedPlan === 'monthly'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="button-plan-monthly"
                >
                  Monthly
                </button>
                <button
                  onClick={() => setSelectedPlan('annual')}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
                    selectedPlan === 'annual'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="button-plan-annual"
                >
                  Annual
                  {selectedPlan !== 'annual' && (
                    <span className="ml-1 text-xs text-green-600 font-semibold">Save 25%</span>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-foreground">{plan.name}</span>
                <span className="font-semibold text-foreground">{plan.price}{plan.period}</span>
              </div>
              {plan.savings && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-600 font-medium">{plan.savings}</span>
                  <span className="text-muted-foreground line-through text-xs">$59.88/year</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Taxes</span>
                <span>Calculated at payment</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-bold text-lg text-foreground">{plan.price}</span>
              </div>
            </CardContent>
          </Card>

          {user && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Account</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-muted-foreground">Email</label>
                  <div className="px-3 py-2 bg-muted/50 rounded-md text-foreground text-sm" data-testid="text-user-email">
                    {user.email || 'No email on file'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
            <Shield className="w-4 h-4" />
            <span>Secure checkout powered by Stripe</span>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <p className="text-center text-sm font-medium text-foreground mb-1" data-testid="text-cancel-disclosure">
              Cancel anytime. No commitment required.
            </p>
            <p className="text-center text-xs text-muted-foreground">
              You can cancel your subscription at any time from your Profile settings. No questions asked.
            </p>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <div className="max-w-lg mx-auto">
            <Button
              className="w-full"
              size="lg"
              onClick={handlePayNow}
              disabled={checkoutMutation.isPending}
              data-testid="button-pay-now"
            >
              {checkoutMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Pay Now
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
