import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AppShell from "@/components/layout/AppShell";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { hasRiseLocalPass } from "@shared/dealAccess";

const REDIRECT_DELAY_SECONDS = 3;
const MAX_RETRY_ATTEMPTS = 6; // Retry for up to 30 seconds (6 attempts x 5 seconds)
const RETRY_INTERVAL_MS = 5000;

export default function CheckoutSuccess() {
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [countdown, setCountdown] = useState(REDIRECT_DELAY_SECONDS);
  const [retryCount, setRetryCount] = useState(0);
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const isMemberActive = hasRiseLocalPass(user);

  const refreshUserData = useCallback(async () => {
    try {
      // Refetch user data to get the latest membership status
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  }, []);

  useEffect(() => {
    // Initial refresh
    refreshUserData();
  }, [refreshUserData]);

  // Retry logic if membership isn't active yet (webhook delay)
  useEffect(() => {
    // If already active or max retries reached, stop retrying
    if (isMemberActive || retryCount >= MAX_RETRY_ATTEMPTS) {
      setIsRefreshing(false);
      return;
    }

    const retryTimer = setTimeout(async () => {
      console.log(`[CheckoutSuccess] Retry ${retryCount + 1}/${MAX_RETRY_ATTEMPTS} - checking membership status`);
      await refreshUserData();
      setRetryCount(prev => prev + 1);
    }, RETRY_INTERVAL_MS);

    return () => clearTimeout(retryTimer);
  }, [isMemberActive, retryCount, refreshUserData]);

  // Countdown and auto-redirect after data is refreshed
  useEffect(() => {
    if (isRefreshing) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setLocation("/discover");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRefreshing, setLocation]);

  // Show loading state while refreshing user data
  if (isRefreshing) {
    return (
      <AppShell hideTabs>
        <div className="min-h-screen bg-background flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Activating your membership...</p>
              {retryCount > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Checking status... ({retryCount}/{MAX_RETRY_ATTEMPTS})
                </p>
              )}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

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
              {isMemberActive 
                ? "Your membership is now active. Start discovering exclusive deals from local businesses in Southwest Florida."
                : "Your payment was successful! Your membership will be activated shortly."}
            </p>

            {isMemberActive ? (
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
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mb-6"
                onClick={refreshUserData}
                data-testid="button-refresh-status"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check membership status
              </Button>
            )}

            <Button 
              size="lg" 
              className="w-full" 
              onClick={() => setLocation("/discover")}
              data-testid="button-back-to-discover"
            >
              {countdown > 0 
                ? `Redirecting in ${countdown}...` 
                : "Start Exploring Deals"}
            </Button>
            
            <p className="text-xs text-muted-foreground mt-3">
              Taking you to discover deals automatically
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
