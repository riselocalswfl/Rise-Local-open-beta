import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ children, redirectTo = "/join" }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!isLoading && (error || !user)) {
      console.log("[ProtectedRoute] Not authenticated, redirecting to", redirectTo);
      
      // Save the current path to return to after login
      const currentPath = window.location.pathname;
      sessionStorage.setItem("returnTo", currentPath);
      
      setLocation(redirectTo);
    }
  }, [isLoading, user, error, redirectTo, setLocation]);

  // Show loading state while checking authentication
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

  // If not authenticated, don't render children (redirect will happen via useEffect)
  if (error || !user) {
    return null;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}
