import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  role: string;
  onboardingComplete?: boolean;
  [key: string]: unknown;
}

const PUBLIC_ROUTES = ["/auth"];
const GATE_ROUTES = ["/start", "/onboarding"];

interface AuthBoundaryProps {
  children: React.ReactNode;
}

export function AuthBoundary({ children }: AuthBoundaryProps) {
  const [location, setLocation] = useLocation();
  
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
  });

  const isPublicRoute = PUBLIC_ROUTES.some(route => location === route || location.startsWith(route + "/"));
  const isGateRoute = GATE_ROUTES.some(route => location === route || location.startsWith(route + "/"));

  useEffect(() => {
    if (isLoading) return;

    if (!isPublicRoute && !isGateRoute && (error || !user)) {
      console.log("[AuthBoundary] Not authenticated, redirecting to /auth");
      const currentPath = window.location.pathname;
      sessionStorage.setItem("returnTo", currentPath);
      setLocation("/auth");
      return;
    }

    if (user && !isGateRoute && !isPublicRoute && !user.onboardingComplete) {
      console.log("[AuthBoundary] Authenticated but onboarding incomplete, redirecting to /start");
      setLocation("/start");
    }
  }, [isLoading, user, error, setLocation, isPublicRoute, isGateRoute, location]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isPublicRoute || isGateRoute) {
    return <>{children}</>;
  }

  if (error || !user) {
    return null;
  }

  if (!user.onboardingComplete) {
    return null;
  }

  return <>{children}</>;
}
