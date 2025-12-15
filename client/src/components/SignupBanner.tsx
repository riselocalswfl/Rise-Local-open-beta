import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export function SignupBanner() {
  const [, setLocation] = useLocation();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if user is authenticated
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Check localStorage for dismissal state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("signupBannerDismissed");
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("signupBannerDismissed", "true");
    }
  };

  const handleSignup = () => {
    setLocation("/auth");
  };

  // Don't show if user is authenticated or banner is dismissed
  if (user || isDismissed) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 bg-primary/95 backdrop-blur-sm border-t border-primary-foreground/20 shadow-lg"
      data-testid="signup-banner"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-primary-foreground/10">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-primary-foreground font-medium">
                Create a free account to save favorites, follow vendors, and get local updates
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSignup}
              variant="secondary"
              size="sm"
              className="whitespace-nowrap"
              data-testid="button-signup-banner"
            >
              Sign Up Free
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
              data-testid="button-dismiss-banner"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
