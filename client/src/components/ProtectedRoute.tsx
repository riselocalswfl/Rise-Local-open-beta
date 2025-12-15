import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface User {
  id: string;
  role: string;
  onboardingComplete?: boolean;
  [key: string]: unknown;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ 
  children, 
  redirectTo = "/auth",
  requireOnboarding = true 
}: ProtectedRouteProps) {
  const [location, setLocation] = useLocation();
  
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
  });

  useEffect(() => {
    if (isLoading) return;

    if (error || !user) {
      console.log("[ProtectedRoute] Not authenticated, redirecting to", redirectTo);
      const currentPath = window.location.pathname;
      sessionStorage.setItem("returnTo", currentPath);
      setLocation(redirectTo);
      return;
    }

    if (requireOnboarding && !user.onboardingComplete && location !== "/welcome") {
      console.log("[ProtectedRoute] Onboarding not complete, redirecting to /welcome");
      setLocation("/welcome");
    }
  }, [isLoading, user, error, redirectTo, setLocation, requireOnboarding, location]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return null;
  }

  if (requireOnboarding && !user.onboardingComplete && location !== "/welcome") {
    return null;
  }

  return <>{children}</>;
}
