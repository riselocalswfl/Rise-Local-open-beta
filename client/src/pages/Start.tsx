import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  role: string;
  accountType?: string | null;
  onboardingComplete?: boolean;
  welcomeCompleted?: boolean;
}

const BUSINESS_ROLES = new Set(["vendor", "restaurant", "service_provider"]);

export default function Start() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
  });

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setLocation("/auth");
      return;
    }

    const { role, accountType, onboardingComplete, welcomeCompleted } = user;

    // Read returnTo early so we can manage it properly
    const returnTo = sessionStorage.getItem("returnTo");
    
    // Gate routes that should never be returnTo destinations
    // Include legacy routes that now redirect elsewhere
    const gateRoutes = ["/auth", "/start", "/onboarding", "/welcome", "/products", "/deals"];
    const isValidReturnTo = returnTo && !gateRoutes.includes(returnTo);

    // First check: Has user completed the welcome carousel?
    if (!welcomeCompleted) {
      // Clear returnTo for new users
      if (returnTo) {
        sessionStorage.removeItem("returnTo");
      }
      setLocation("/welcome");
      return;
    }

    // Admins always go directly to admin page (bypass onboarding)
    if (role === "admin") {
      if (returnTo) {
        sessionStorage.removeItem("returnTo");
      }
      setLocation("/admin");
      return;
    }

    const isBusinessRole = BUSINESS_ROLES.has(role);
    const isBuyerRole = role === "buyer";
    const isRoleKnown = isBusinessRole || isBuyerRole;
    const isAccountTypeKnown = accountType === "business" || accountType === "user";
    const isBusinessUser = isBusinessRole || accountType === "business";

    if (!isRoleKnown && !isAccountTypeKnown) {
      if (returnTo) {
        sessionStorage.removeItem("returnTo");
      }
      setLocation("/choose-account-type");
      return;
    }

    if (!onboardingComplete) {
      // Clear returnTo when user hasn't completed onboarding
      // They can't access protected routes yet
      if (returnTo) {
        sessionStorage.removeItem("returnTo");
      }
      
      if (isBusinessUser) {
        setLocation("/onboarding");
      } else {
        // Buyers don't need onboarding, mark as complete and go to discover
        setLocation("/discover");
      }
      return;
    }

    // User is fully onboarded - check for valid returnTo
    if (isValidReturnTo) {
      sessionStorage.removeItem("returnTo");
      setLocation(returnTo);
      return;
    }

    if (isBusinessUser) {
      setLocation("/dashboard");
    } else {
      setLocation("/discover");
    }
  }, [user, isLoading, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
