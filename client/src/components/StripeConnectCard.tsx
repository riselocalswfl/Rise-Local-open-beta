import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StripeAccountStatus {
  connected: boolean;
  onboardingComplete: boolean;
  chargesEnabled?: boolean;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
  requirements?: {
    currently_due?: string[];
    eventually_due?: string[];
    past_due?: string[];
  };
}

export default function StripeConnectCard() {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  // Fetch Stripe account status
  const { data: status, isLoading, refetch } = useQuery<StripeAccountStatus>({
    queryKey: ["/api/stripe/account-status"],
    refetchInterval: (query) => {
      // Poll more frequently if onboarding is in progress
      if (query.state.data?.connected && !query.state.data?.onboardingComplete) {
        return 5000; // 5 seconds
      }
      return false; // Don't poll if not connected or fully onboarded
    },
  });

  // Create Stripe Connect account mutation
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/stripe/create-connect-account", {});
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Stripe account created successfully",
      });
      await refetch();
      // Automatically start onboarding after account creation
      onboardMutation.mutate();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Stripe account",
        variant: "destructive",
      });
    },
  });

  // Generate onboarding link mutation
  const onboardMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/stripe/account-link", {});
    },
    onSuccess: (data: any) => {
      // Redirect to Stripe onboarding
      window.location.href = data.url;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate onboarding link",
        variant: "destructive",
      });
    },
  });

  // Handle query parameters on return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('stripe_success') === 'true') {
      toast({
        title: "Stripe Connected!",
        description: "Your bank account has been successfully connected.",
      });
      // Clear query params
      window.history.replaceState({}, '', window.location.pathname);
      refetch();
    } else if (params.get('stripe_refresh') === 'true') {
      toast({
        title: "Please Complete Setup",
        description: "Complete your Stripe onboarding to start receiving payments.",
        variant: "default",
      });
      // Clear query params and restart onboarding
      window.history.replaceState({}, '', window.location.pathname);
      onboardMutation.mutate();
    }
  }, []);

  const handleConnect = async () => {
    setIsCreating(true);
    try {
      if (!status?.connected) {
        // Create account first, then onboard (handled in mutation onSuccess)
        await createAccountMutation.mutateAsync();
      } else {
        // Account exists, just need to complete onboarding
        onboardMutation.mutate();
      }
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isFullyConnected = status?.connected && status?.onboardingComplete;
  const needsAction = status?.requirements?.currently_due && status.requirements.currently_due.length > 0;
  const isPending = status?.connected && !status?.onboardingComplete;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Stripe Connect Payment Setup
              {isFullyConnected && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
              {isPending && (
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
              {!status?.connected && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Coming Next Week
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-2">
              {!status?.connected 
                ? "Credit card payments launching soon! Use Venmo, CashApp, Zelle, and other payment methods in the meantime."
                : "Connect your bank account to receive credit card payments from customers"
              }
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isFullyConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!status?.connected && "Stripe Connect will be available next week. Your customers can currently pay via Venmo, CashApp, Zelle, PayPal, and cash."}
              {isPending && "Complete your Stripe verification to start receiving payments."}
              {needsAction && "Action required: Additional information needed to complete your Stripe setup."}
            </AlertDescription>
          </Alert>
        )}

        {isFullyConnected && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your Stripe account is fully set up. You can now accept payments and receive funds directly to your bank account.
            </AlertDescription>
          </Alert>
        )}

        {status?.connected && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Charges enabled:</span>
              <span className="font-medium">
                {status.chargesEnabled ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Yes
                  </span>
                ) : (
                  <span className="text-yellow-600 flex items-center gap-1">
                    <XCircle className="h-4 w-4" /> No
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Payouts enabled:</span>
              <span className="font-medium">
                {status.payoutsEnabled ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Yes
                  </span>
                ) : (
                  <span className="text-yellow-600 flex items-center gap-1">
                    <XCircle className="h-4 w-4" /> No
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isFullyConnected && (
            <Button
              onClick={handleConnect}
              disabled={true}
              variant="outline"
              className="flex-1"
              data-testid="button-connect-stripe"
            >
              Available Next Week
            </Button>
          )}
          {isPending && (
            <Button
              variant="outline"
              onClick={() => refetch()}
              data-testid="button-refresh-status"
            >
              <Loader2 className="mr-2 h-4 w-4" />
              Refresh Status
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Powered by Stripe Connect</p>
          <p>• Funds deposited directly to your bank account</p>
          <p>• You receive 100% of product price + sales tax collected</p>
          <p>• Platform revenue from $89/month vendor memberships (waived during beta)</p>
        </div>
      </CardContent>
    </Card>
  );
}
