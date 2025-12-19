import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { User, LogOut, Edit2, Save, X, Store, ChevronRight, MessageSquare, Tag, Settings, Eye, CreditCard, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ImageUpload } from "@/components/ImageUpload";
import type { Vendor, Deal } from "@shared/schema";

export default function CustomerProfile() {
  const [, setLocation] = useLocation();
  const { user, isLoading: userLoading } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState("");
  const [editedLastName, setEditedLastName] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const [activeTab, setActiveTab] = useState("account");
  
  const isVendor = user?.role === "vendor" || user?.role === "restaurant" || user?.role === "service_provider";

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

  // Fetch vendor data if user is a business owner
  const { data: vendor, isLoading: vendorLoading } = useQuery<Vendor>({
    queryKey: ["/api/auth/my-vendor"],
    enabled: isVendor,
  });

  // Fetch deals for business owners
  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: [`/api/deals?vendorId=${vendor?.id}`],
    enabled: !!vendor?.id,
  });

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

  // Vendor profile update mutation
  const updateVendorMutation = useMutation({
    mutationFn: async (data: Partial<Vendor>) => {
      if (!vendor?.id) throw new Error("No vendor ID");
      return await apiRequest("PATCH", `/api/vendors/${vendor.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/my-vendor"] });
      toast({ title: "Business profile updated" });
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
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

  // Business owner account page with tabbed navigation
  if (isVendor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold mb-2" data-testid="heading-my-account">
              My Account
            </h1>
            <p className="text-muted-foreground">
              Manage your personal and business settings
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-4">
              <TabsTrigger value="account" className="flex items-center gap-2" data-testid="tab-account">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
              </TabsTrigger>
              <TabsTrigger value="business" className="flex items-center gap-2" data-testid="tab-business">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Business</span>
              </TabsTrigger>
              <TabsTrigger value="deals" className="flex items-center gap-2" data-testid="tab-deals">
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">Deals</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2" data-testid="tab-settings">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
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
                        View and respond to customer inquiries
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

              <Card data-testid="card-account-info">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>Your personal account details</CardDescription>
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
            </TabsContent>

            {/* Business Profile Tab */}
            <TabsContent value="business" className="space-y-6">
              {vendorLoading ? (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">Loading business profile...</p>
                  </CardContent>
                </Card>
              ) : vendor ? (
                <>
                  <Card data-testid="card-business-profile">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Store className="h-5 w-5" />
                        Business Profile
                      </CardTitle>
                      <CardDescription>
                        Your public business information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="businessName">Business Name</Label>
                          <Input
                            id="businessName"
                            defaultValue={vendor.businessName || ""}
                            placeholder="Your business name"
                            data-testid="input-business-name"
                            onBlur={(e) => {
                              if (e.target.value !== vendor.businessName) {
                                updateVendorMutation.mutate({ businessName: e.target.value });
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactName">Contact Name</Label>
                          <Input
                            id="contactName"
                            defaultValue={vendor.contactName || ""}
                            placeholder="Primary contact"
                            data-testid="input-contact-name"
                            onBlur={(e) => {
                              if (e.target.value !== vendor.contactName) {
                                updateVendorMutation.mutate({ contactName: e.target.value });
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tagline">Tagline</Label>
                        <Input
                          id="tagline"
                          defaultValue={vendor.tagline || ""}
                          placeholder="A short tagline for your business"
                          data-testid="input-tagline"
                          onBlur={(e) => {
                            if (e.target.value !== vendor.tagline) {
                              updateVendorMutation.mutate({ tagline: e.target.value });
                            }
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio">About Your Business</Label>
                        <Textarea
                          id="bio"
                          defaultValue={vendor.bio || ""}
                          placeholder="Tell customers about your business..."
                          rows={4}
                          data-testid="input-bio"
                          onBlur={(e) => {
                            if (e.target.value !== vendor.bio) {
                              updateVendorMutation.mutate({ bio: e.target.value });
                            }
                          }}
                        />
                      </div>

                      <Separator />

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="address">Street Address</Label>
                          <Input
                            id="address"
                            defaultValue={vendor.address || ""}
                            placeholder="123 Main St"
                            data-testid="input-address"
                            onBlur={(e) => {
                              if (e.target.value !== vendor.address) {
                                updateVendorMutation.mutate({ address: e.target.value });
                              }
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input
                              id="city"
                              defaultValue={vendor.city || ""}
                              placeholder="Fort Myers"
                              data-testid="input-city"
                              onBlur={(e) => {
                                if (e.target.value !== vendor.city) {
                                  updateVendorMutation.mutate({ city: e.target.value });
                                }
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="zipCode">Zip Code</Label>
                            <Input
                              id="zipCode"
                              defaultValue={vendor.zipCode || ""}
                              placeholder="33901"
                              data-testid="input-zip"
                              onBlur={(e) => {
                                if (e.target.value !== vendor.zipCode) {
                                  updateVendorMutation.mutate({ zipCode: e.target.value });
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="email">Business Email</Label>
                          <Input
                            id="email"
                            type="email"
                            defaultValue={vendor.contactEmail || ""}
                            placeholder="contact@yourbusiness.com"
                            data-testid="input-business-email"
                            onBlur={(e) => {
                              if (e.target.value !== vendor.contactEmail) {
                                updateVendorMutation.mutate({ contactEmail: e.target.value });
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website">Website</Label>
                          <Input
                            id="website"
                            defaultValue={vendor.website || ""}
                            placeholder="https://yourbusiness.com"
                            data-testid="input-website"
                            onBlur={(e) => {
                              if (e.target.value !== vendor.website) {
                                updateVendorMutation.mutate({ website: e.target.value });
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="instagram">Instagram</Label>
                          <Input
                            id="instagram"
                            defaultValue={vendor.instagram || ""}
                            placeholder="@yourhandle"
                            data-testid="input-instagram"
                            onBlur={(e) => {
                              if (e.target.value !== vendor.instagram) {
                                updateVendorMutation.mutate({ instagram: e.target.value });
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="facebook">Facebook</Label>
                          <Input
                            id="facebook"
                            defaultValue={vendor.facebook || ""}
                            placeholder="facebook.com/yourbusiness"
                            data-testid="input-facebook"
                            onBlur={(e) => {
                              if (e.target.value !== vendor.facebook) {
                                updateVendorMutation.mutate({ facebook: e.target.value });
                              }
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-business-images">
                    <CardHeader>
                      <CardTitle>Business Images</CardTitle>
                      <CardDescription>Upload your logo and cover image</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Profile Logo</Label>
                          <ImageUpload
                            currentImageUrl={vendor.logoUrl}
                            onUploadComplete={(imageUrl: string) => {
                              updateVendorMutation.mutate({ logoUrl: imageUrl });
                            }}
                            onRemove={() => {
                              updateVendorMutation.mutate({ logoUrl: null });
                            }}
                            disabled={updateVendorMutation.isPending}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cover Banner</Label>
                          <ImageUpload
                            currentImageUrl={vendor.bannerUrl}
                            onUploadComplete={(imageUrl: string) => {
                              updateVendorMutation.mutate({ bannerUrl: imageUrl });
                            }}
                            onRemove={() => {
                              updateVendorMutation.mutate({ bannerUrl: null });
                            }}
                            disabled={updateVendorMutation.isPending}
                            aspectRatio="landscape"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Advanced Settings</CardTitle>
                      <CardDescription>Access full dashboard for products, menu, and more</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link 
                        href="/dashboard"
                        className="inline-flex items-center justify-between gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground min-h-9 px-4 py-2 w-full"
                        data-testid="button-advanced-dashboard"
                      >
                        <span className="flex items-center gap-2">
                          <Store className="h-4 w-4" />
                          Open Full Dashboard
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">No business profile found.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Deals Tab */}
            <TabsContent value="deals" className="space-y-6">
              <Card data-testid="card-deals-overview">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Your Deals
                      </CardTitle>
                      <CardDescription>
                        Manage deals and promotions for your business
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" data-testid="badge-deals-count">
                      {deals.length} {deals.length === 1 ? "deal" : "deals"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {deals.length === 0 ? (
                    <div className="text-center py-8">
                      <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">No deals created yet</p>
                      <Button onClick={() => setLocation("/dashboard?tab=deals")} data-testid="button-create-deal">
                        Create Your First Deal
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {deals.slice(0, 3).map((deal) => (
                          <div 
                            key={deal.id} 
                            className="flex items-center justify-between p-3 border rounded-lg"
                            data-testid={`deal-item-${deal.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{deal.title}</h4>
                              <p className="text-sm text-muted-foreground truncate">{deal.description}</p>
                            </div>
                            <Badge variant={deal.isActive ? "default" : "secondary"}>
                              {deal.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <Link 
                        href="/dashboard?tab=deals"
                        className="inline-flex items-center justify-between gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 min-h-9 px-4 py-2 w-full"
                        data-testid="button-manage-deals"
                      >
                        <span className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Manage All Deals
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              {vendor && (
                <>
                  <Card data-testid="card-visibility">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Profile Visibility
                      </CardTitle>
                      <CardDescription>
                        Control whether your business appears in search results
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium">Public Profile</p>
                          <p className="text-sm text-muted-foreground">
                            {vendor.isProfileVisible !== false 
                              ? "Your business is visible to customers" 
                              : "Your business is hidden from customers"}
                          </p>
                        </div>
                        <Switch
                          checked={vendor.isProfileVisible !== false}
                          onCheckedChange={(checked) => {
                            updateVendorMutation.mutate({ isProfileVisible: checked });
                          }}
                          disabled={updateVendorMutation.isPending}
                          data-testid="switch-profile-visibility"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-billing">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Billing & Subscription
                      </CardTitle>
                      <CardDescription>
                        Manage your Rise Local business subscription
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">Business Plan</p>
                          <Badge variant="default">$89/month</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Full access to all Rise Local business features including deals, messaging, and analytics.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <Card data-testid="card-account-actions">
                <CardHeader>
                  <CardTitle>Account Actions</CardTitle>
                  <CardDescription>Manage your account</CardDescription>
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
            </TabsContent>
          </Tabs>
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
                            Customer
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
