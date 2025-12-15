import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import { Sparkles, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import AppShell from "@/components/layout/AppShell";

export default function WelcomePage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/complete-onboarding");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/deals");
    },
  });

  const handleContinue = () => {
    completeOnboardingMutation.mutate();
  };

  return (
    <AppShell>
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/20">
        <div className="text-center max-w-lg space-y-8">
          <div className="flex justify-center mb-6">
            <BrandLogo />
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>

            <h1 className="text-4xl md:text-5xl font-playfair font-bold tracking-tight" data-testid="text-welcome-heading">
              Welcome!
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed" data-testid="text-welcome-message">
              You're all set to explore local Southwest Florida businesses, 
              discover great deals, and support your community.
            </p>
          </div>

          <Button
            size="lg"
            onClick={handleContinue}
            disabled={completeOnboardingMutation.isPending}
            className="w-full max-w-xs mx-auto text-lg py-6"
            data-testid="button-continue"
          >
            {completeOnboardingMutation.isPending ? (
              "Loading..."
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
