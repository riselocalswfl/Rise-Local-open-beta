import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  role: string;
  onboardingComplete?: boolean;
}

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

    const { role, onboardingComplete } = user;

    if (!onboardingComplete) {
      if (role === "vendor" || role === "restaurant" || role === "service_provider") {
        setLocation("/onboarding");
      } else {
        setLocation("/discover");
      }
      return;
    }

    if (role === "admin") {
      setLocation("/admin");
    } else if (role === "vendor" || role === "restaurant" || role === "service_provider") {
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
