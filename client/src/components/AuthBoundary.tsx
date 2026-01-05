import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface User {
  id: string;
  role: string;
  isAdmin?: boolean;
  isVendor?: boolean;
  onboardingComplete?: boolean;
  [key: string]: unknown;
}

const PUBLIC_ROUTES = ["/auth"];
const GATE_ROUTES = ["/start", "/onboarding", "/welcome"];

interface AuthBoundaryProps {
  children: React.ReactNode;
}

export function AuthBoundary({ children }: AuthBoundaryProps) {
  const [location, setLocation] = useLocation();
  
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 30000,
  });

  const isPublicRoute = PUBLIC_ROUTES.some(route => location === route || location.startsWith(route + "/"));
  const isGateRoute = GATE_ROUTES.some(route => location === route || location.startsWith(route + "/"));

  useEffect(() => {
    if (isLoading) return;

    if (!isPublicRoute && !isGateRoute && !user) {
      console.log("[AuthBoundary] Not authenticated, redirecting to /auth");
      const currentPath = window.location.pathname;
      sessionStorage.setItem("returnTo", currentPath);
      setLocation("/auth");
      return;
    }

    // Admins bypass onboarding requirements (check both isAdmin flag and legacy role)
    const isAdmin = user?.isAdmin === true || user?.role === "admin";
    if (user && !isGateRoute && !isPublicRoute && !user.onboardingComplete && !isAdmin) {
      console.log("[AuthBoundary] Authenticated but onboarding incomplete, redirecting to /start");
      setLocation("/start");
    }
  }, [isLoading, user, setLocation, isPublicRoute, isGateRoute, location]);

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

  if (!user) {
    return null;
  }

  // Admins bypass onboarding requirements (check both isAdmin flag and legacy role)
  const userIsAdmin = user.isAdmin === true || user.role === "admin";
  if (!user.onboardingComplete && !userIsAdmin) {
    return null;
  }

  return <>{children}</>;
}
