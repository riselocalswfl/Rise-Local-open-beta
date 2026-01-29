import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import type { Vendor } from "@shared/schema";
import VendorDashboard from "./VendorDashboard";

interface AuthUser {
  id: string;
  role: string;
  accountType?: string | null;
  isVendor?: boolean;
  isAdmin?: boolean;
}

const BUSINESS_ROLES = new Set(["vendor", "restaurant", "service_provider"]);

export default function BusinessDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
  });

  const isBusinessRole = !!user && BUSINESS_ROLES.has(user.role);
  const isBusinessUser = !!user && (isBusinessRole || user.accountType === "business");
  const isRoleKnown = !!user && (isBusinessRole || user.role === "buyer" || user.role === "admin");
  const isAccountTypeKnown = !!user && (user.accountType === "business" || user.accountType === "user");

  const { data: vendor, isLoading: vendorLoading } = useQuery<Vendor>({
    queryKey: ["/api/auth/my-vendor"],
    retry: false,
    enabled: isBusinessUser,
  });

  useEffect(() => {
    if (userLoading || !user) return;

    if (user.role === "admin") {
      setLocation("/admin");
      return;
    }

    if (!isRoleKnown && !isAccountTypeKnown) {
      setLocation("/choose-account-type");
      return;
    }

    if (!isBusinessUser) {
      setLocation("/discover");
    }
  }, [user, userLoading, isRoleKnown, isAccountTypeKnown, isBusinessUser, setLocation]);

  const switchToBuyerMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/welcome/complete", { role: "buyer" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/my-vendor"] });
      sessionStorage.removeItem("returnTo");
      sessionStorage.removeItem("onboardingDraftId");
      setLocation("/discover");
    },
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      sessionStorage.removeItem("returnTo");
      sessionStorage.removeItem("onboardingDraftId");
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/auth");
    }
  };

  if (userLoading || vendorLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your business...</p>
        </div>
      </div>
    );
  }

  if (vendor) {
    return <VendorDashboard />;
  }

  if (!user || !isBusinessUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Finish Business Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            We couldn’t find a business profile for this account. Choose how you’d like to continue.
          </p>
          <div className="space-y-2">
            <Button
              onClick={() => setLocation("/onboarding")}
              className="w-full"
              data-testid="button-create-business-profile"
            >
              Create Business Profile
            </Button>
            <Button
              variant="outline"
              onClick={() => switchToBuyerMutation.mutate()}
              disabled={switchToBuyerMutation.isPending}
              className="w-full"
              data-testid="button-switch-to-buyer"
            >
              Switch to Buyer
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full"
              data-testid="button-logout-from-business-setup"
            >
              Log out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
