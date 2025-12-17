import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { User, LogOut, Edit2, Save, X, Store, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function CustomerProfile() {
  const { user, isLoading: userLoading } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState("");
  const [editedLastName, setEditedLastName] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  
  const isVendor = user?.role === "vendor" || user?.role === "restaurant" || user?.role === "service_provider";

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
          {/* Business Tools Section - Only visible for vendors */}
          {isVendor && (
            <Card data-testid="card-business-tools" className="border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="h-5 w-5" />
                      Business Tools
                    </CardTitle>
                    <CardDescription>Manage your business profile, deals, and settings</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard">
                  <Button variant="default" className="w-full justify-between" data-testid="button-open-dashboard">
                    <span className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Open Vendor Dashboard
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

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
                      <Separator />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                        <div className="mt-1">
                          <Badge variant="secondary" data-testid="badge-user-role">
                            {user.role === "buyer" ? "Customer" : user.role}
                          </Badge>
                        </div>
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
                      <Separator />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-base text-muted-foreground" data-testid="text-user-email-readonly">
                          {user.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Email is managed through Replit Auth and cannot be changed here
                        </p>
                      </div>
                      <Separator />
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

            <Card data-testid="card-account-actions">
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
                <CardDescription>Manage your account settings</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/api/logout'}
                  data-testid="button-logout-settings"
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
