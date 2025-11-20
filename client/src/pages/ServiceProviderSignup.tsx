import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowRight } from "lucide-react";

/**
 * DEPRECATED: This page redirects to the proper 4-step onboarding flow
 * 
 * Legacy ServiceProviderSignup bypassed required fields and used hardcoded defaults.
 * All service providers must now complete the full onboarding at /onboarding/services
 * to ensure complete vendor profiles with all required data.
 */
export default function ServiceProviderSignup() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Auto-redirect authenticated users to proper onboarding
  useEffect(() => {
    if (user) {
      toast({
        title: "Redirecting to onboarding",
        description: "Complete your service provider profile in 4 simple steps.",
      });
      setLocation("/onboarding/services");
    }
  }, [user, setLocation, toast]);

  // Auth Step: Sign in with Replit
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-playfair">Sign Up as Service Provider</CardTitle>
            <CardDescription>
              Sign in with Replit to start your service provider onboarding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => {
                sessionStorage.setItem("returnTo", "/join/service-provider");
                window.location.href = "/api/login?intended_role=service_provider";
              }}
              data-testid="button-replit-login"
              disabled={authLoading}
            >
              {authLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Continue with Replit Auth
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated: Show redirect message while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Redirecting to Onboarding</CardTitle>
          <CardDescription>
            Please wait while we redirect you to complete your service provider profile...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    </div>
  );
}
