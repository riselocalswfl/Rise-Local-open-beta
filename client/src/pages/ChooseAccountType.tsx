import { useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, User } from "lucide-react";

interface AuthUser {
  id: string;
  role?: string | null;
  accountType?: string | null;
}

const BUSINESS_ROLES = new Set(["vendor", "restaurant", "service_provider"]);

export default function ChooseAccountType() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
  });

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setLocation("/auth");
      return;
    }

    if (user.role === "admin") {
      setLocation("/admin");
      return;
    }

    if (user.role && !BUSINESS_ROLES.has(user.role) && user.role !== "buyer") {
      return;
    }

    if (user.role === "buyer" || user.accountType === "user") {
      setLocation("/discover");
      return;
    }

    if (BUSINESS_ROLES.has(user.role) || user.accountType === "business") {
      setLocation("/onboarding");
    }
  }, [user, isLoading, setLocation]);

  const selectAccountTypeMutation = useMutation({
    mutationFn: async (role: "buyer" | "vendor") => {
      return apiRequest("POST", "/api/welcome/complete", { role });
    },
    onSuccess: async (_res, role) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      sessionStorage.removeItem("returnTo");
      sessionStorage.removeItem("onboardingDraftId");
      if (role === "vendor") {
        setLocation("/onboarding");
      } else {
        setLocation("/discover");
      }
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Choose Account Type</CardTitle>
          <CardDescription>
            Tell us how you want to use Rise Local so we can guide you correctly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full h-14 justify-start gap-3"
            variant="outline"
            onClick={() => selectAccountTypeMutation.mutate("buyer")}
            disabled={selectAccountTypeMutation.isPending}
            data-testid="button-choose-buyer"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-semibold">I’m a Customer</div>
              <div className="text-sm text-muted-foreground">Find deals from local businesses</div>
            </div>
          </Button>
          <Button
            className="w-full h-14 justify-start gap-3"
            variant="outline"
            onClick={() => selectAccountTypeMutation.mutate("vendor")}
            disabled={selectAccountTypeMutation.isPending}
            data-testid="button-choose-business"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-semibold">I’m a Business</div>
              <div className="text-sm text-muted-foreground">Create a profile and list deals</div>
            </div>
          </Button>
          <Button
            className="w-full"
            variant="ghost"
            onClick={handleLogout}
            data-testid="button-choose-logout"
          >
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
