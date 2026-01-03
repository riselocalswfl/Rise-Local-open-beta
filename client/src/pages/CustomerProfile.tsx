import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, Edit2, Save, X, Ticket, Store, ChevronRight, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface RedemptionHistoryItem {
  id: string;
  dealId: string;
  dealTitle: string;
  dealImage?: string | null;
  vendorId: string;
  vendorName: string;
  vendorLogo?: string | null;
  redeemedAt: string;
  status: string;
}

export default function CustomerProfile() {
  const [, setLocation] = useLocation();
  const { user, isLoading: userLoading } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState("");
  const [editedLastName, setEditedLastName] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const isVendor = user?.role === "vendor" || user?.role === "restaurant" || user?.role === "service_provider";
  const isAdmin = user?.role === "admin";

  const { data: redemptions, isLoading: redemptionsLoading, isError: redemptionsError } = useQuery<RedemptionHistoryItem[]>({
    queryKey: ["/api/me/redemptions"],
    queryFn: async () => {
      const res = await fetch("/api/me/redemptions?limit=10", {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch redemptions");
      return res.json();
    },
    enabled: !!user && !isVendor,
  });

  // Redirect vendors to the dedicated dashboard
  useEffect(() => {
    if (isVendor) {
      setLocation("/dashboard");
    }
  }, [isVendor, setLocation]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const updateUserMutation = useMutation({
    mutationFn: async (data: { firstName?: string; lastName?: string; phone?: string }) => {
      const response = await apiRequest("PATCH", "/api/users/me", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile updated",
        description: "Your account information has been saved.",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update your profile. Please try again.",
      });
    },
  });

  const handleStartEdit = () => {
    setEditedFirstName(user?.firstName || "");
    setEditedLastName(user?.lastName || "");
    setEditedPhone(user?.phone || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedFirstName("");
    setEditedLastName("");
    setEditedPhone("");
  };

  const handleSaveEdit = () => {
    updateUserMutation.mutate({
      firstName: editedFirstName,
      lastName: editedLastName,
      phone: editedPhone,
    });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Please log in to view your profile.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // While redirecting, show loading state for vendors
  if (isVendor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Redirecting...</p>
          </div>
        </main>
      </div>
    );
  }

  // Regular customer account page (non-business owners)
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" data-testid="heading-customer-profile">
            My Account
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings
          </p>
        </div>

        <div className="space-y-6">
          {/* Account Information */}
          <Card data-testid="card-account-info">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your personal details</CardDescription>
                </div>
                {!isEditing ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleStartEdit}
                    data-testid="button-edit-profile"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleCancelEdit}
                      data-testid="button-cancel-edit"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={updateUserMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateUserMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {!isEditing ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Name</label>
                      <p className="text-base" data-testid="text-user-name">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : user.username || "No name set"}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-base" data-testid="text-user-email">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Email is managed through Replit Auth and cannot be changed here
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <p className="text-base" data-testid="text-user-phone">
                        {user.phone || "Not set"}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">First Name</label>
                      <Input
                        value={editedFirstName}
                        onChange={(e) => setEditedFirstName(e.target.value)}
                        placeholder="Enter your first name"
                        className="mt-1"
                        data-testid="input-first-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                      <Input
                        value={editedLastName}
                        onChange={(e) => setEditedLastName(e.target.value)}
                        placeholder="Enter your last name"
                        className="mt-1"
                        data-testid="input-last-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <Input
                        value={editedPhone}
                        onChange={(e) => setEditedPhone(e.target.value)}
                        placeholder="Enter your phone number"
                        className="mt-1"
                        data-testid="input-phone"
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Redemption History */}
          <Card data-testid="card-redemption-history">
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-primary" />
                    My Redemptions
                  </CardTitle>
                  <CardDescription>Deals you've redeemed</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {redemptionsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : redemptionsError ? (
                <div className="text-center py-8">
                  <Ticket className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">Unable to load redemptions</p>
                </div>
              ) : redemptions && redemptions.length > 0 ? (
                <div className="space-y-3">
                  {redemptions.map((redemption) => (
                    <Link
                      key={redemption.id}
                      href={`/deals/${redemption.dealId}`}
                      className="block"
                    >
                      <div 
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                        data-testid={`redemption-item-${redemption.id}`}
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={redemption.vendorLogo || ""} alt={redemption.vendorName} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            <Store className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" data-testid={`text-deal-title-${redemption.id}`}>
                            {redemption.dealTitle}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            {redemption.vendorName}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <Badge variant="outline" className="text-xs mb-1">
                            {redemption.status === "redeemed" ? "Used" : redemption.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(redemption.redeemedAt)}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Ticket className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No redemptions yet</p>
                  <Link href="/discover">
                    <Button variant="outline" data-testid="button-discover-deals">
                      Discover Deals
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Access */}
          {isAdmin && (
            <Card data-testid="card-admin-access">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Admin Access
                </CardTitle>
                <CardDescription>Administrative tools and management</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin">
                  <Button 
                    data-testid="button-admin-dashboard"
                    className="w-full sm:w-auto"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Account Actions */}
          <Card data-testid="card-account-actions">
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>Manage your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/api/logout'}
                data-testid="button-logout"
                className="w-full sm:w-auto"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
