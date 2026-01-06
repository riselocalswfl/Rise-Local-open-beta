import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Check, Sparkles, ArrowLeft, Loader2, Crown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { hasRiseLocalPass } from "@shared/dealAccess";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const BENEFITS = [
  "Save at local restaurants, shops & services",
  "Exclusive members-only deals",
  "Pays for itself with one deal",
  "Discover great businesses near you",
];

type PlanType = 'monthly' | 'annual';

export default function Membership() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('monthly');

  const isPassMember = hasRiseLocalPass(user);

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

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/create-portal-session");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Error",
          description: "Could not open billing portal. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Portal Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      toast({
        title: "Welcome to Rise Local Pass!",
        description: "Your membership is now active. Start saving today!",
      });
      window.history.replaceState({}, '', '/membership');
    } else if (params.get('checkout') === 'cancel') {
      toast({
        title: "Checkout Cancelled",
        description: "No worries! Come back when you're ready.",
      });
      window.history.replaceState({}, '', '/membership');
    }
  }, [toast]);

  const handleSubscribe = () => {
    if (!user) {
      window.location.href = '/auth?returnTo=/membership';
      return;
    }
    checkoutMutation.mutate(selectedPlan);
  };

  const handleManageSubscription = () => {
    portalMutation.mutate();
  };

  return (
    <AppShell hideTabs>
      <div className="min-h-screen bg-background">
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
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              {isPassMember ? (
                <Crown className="w-8 h-8 text-primary" />
              ) : (
                <Sparkles className="w-8 h-8 text-primary" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="heading-membership">
              {isPassMember ? "You're a Member!" : "Unlock Local Savings"}
            </h2>
            <p className="text-muted-foreground">
              {isPassMember 
                ? "Enjoy exclusive deals across SWFL." 
                : "One membership. Hundreds of exclusive deals across SWFL."}
            </p>
          </div>

          {isPassMember ? (
            <Card className="mb-8">
              <CardHeader className="text-center pb-2">
                <div className="flex items-center justify-center gap-2">
                  <CardTitle className="text-lg">Rise Local Pass</CardTitle>
                  <Badge variant="default" className="bg-primary">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4" data-testid="text-member-status">
                  Your membership is active
                  {user?.passExpiresAt && (
                    <span className="block text-sm mt-1">
                      Renews: {new Date(user.passExpiresAt).toLocaleDateString()}
                    </span>
                  )}
                </p>
                <Button 
                  className="w-full" 
                  size="lg" 
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={portalMutation.isPending}
                  data-testid="button-manage-subscription"
                >
                  {portalMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4 mr-2" />
                      Manage or Cancel Subscription
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-3" data-testid="text-cancel-guidance">
                  Cancel anytime. No questions asked.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    selectedPlan === 'monthly'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover-elevate'
                  }`}
                  data-testid="plan-monthly"
                >
                  <div className="text-sm font-medium text-muted-foreground mb-1">Monthly</div>
                  <div className="text-2xl font-bold text-foreground">$4.99</div>
                  <div className="text-sm text-muted-foreground">/month</div>
                </button>
                
                <button
                  onClick={() => setSelectedPlan('annual')}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    selectedPlan === 'annual'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover-elevate'
                  }`}
                  data-testid="plan-annual"
                >
                  <Badge className="absolute -top-2 right-2 bg-primary text-xs">Save 25%</Badge>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Annual</div>
                  <div className="text-2xl font-bold text-foreground">$44.91</div>
                  <div className="text-sm text-muted-foreground">/year</div>
                  <div className="text-xs text-primary mt-1">$3.74/mo</div>
                </button>
              </div>

              <Button 
                className="w-full mb-8" 
                size="lg" 
                onClick={handleSubscribe}
                disabled={checkoutMutation.isPending || authLoading}
                data-testid="button-subscribe"
              >
                {checkoutMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting Checkout...
                  </>
                ) : (
                  `Start Saving Today - ${selectedPlan === 'annual' ? '$44.91/year' : '$4.99/month'}`
                )}
              </Button>
            </>
          )}

          {!isPassMember && (
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
          )}

          {!isPassMember && (
            <div className="text-center mb-8">
              <p className="text-sm font-medium text-foreground mb-1" data-testid="text-cancel-policy">
                Cancel anytime. No commitment.
              </p>
              <p className="text-xs text-muted-foreground">
                Manage or cancel your subscription anytime from your Profile.
              </p>
            </div>
          )}

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

          <div className="h-8" />
        </div>
      </div>
    </AppShell>
  );
}
