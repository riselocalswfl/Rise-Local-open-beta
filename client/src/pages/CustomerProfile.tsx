import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LogOut, Edit2, Save, X, ChevronRight, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function CustomerProfile() {
  const [, setLocation] = useLocation();
  const { user, isLoading: userLoading } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState("");
  const [editedLastName, setEditedLastName] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const isVendor = user?.role === "vendor" || user?.role === "restaurant" || user?.role === "service_provider";

  // Redirect vendors to the dedicated account page
  useEffect(() => {
    if (isVendor) {
      setLocation("/account");
    }
  }, [isVendor, setLocation]);

  // Fetch unread message + notification count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/b2c/unread-count"],
    refetchInterval: 10000,
  });
  const { data: notificationData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 10000,
  });
  const totalUnread = (unreadData?.count || 0) + (notificationData?.count || 0);

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
          {/* Messages Section */}
          <Card data-testid="card-messages">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Messages
                    {totalUnread > 0 && (
                      <Badge variant="destructive" className="ml-2" data-testid="badge-messages-count">
                        {totalUnread}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Your conversations with local businesses
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link 
                href="/messages"
                className="inline-flex items-center justify-between gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 min-h-9 px-4 py-2 w-full"
                data-testid="button-view-messages"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  View Messages
                </span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

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
