import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, 
  Building2, 
  Tag, 
  Settings, 
  ChevronRight, 
  Plus, 
  Eye, 
  Bell, 
  LogOut,
  MapPin,
  Phone,
  Globe,
  Clock,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ImageUpload } from "@/components/ImageUpload";
import type { Vendor, Deal } from "@shared/schema";

type TabValue = "profile" | "deals" | "settings";

interface AccountPageProps {
  tab?: TabValue;
}

export default function AccountPage({ tab = "profile" }: AccountPageProps) {
  const [, setLocation] = useLocation();
  const { user, isLoading: userLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabValue>(tab);

  useEffect(() => {
    setActiveTab(tab);
  }, [tab]);

  const isVendor = user?.role === "vendor" || user?.role === "restaurant" || user?.role === "service_provider";

  const { data: vendor, isLoading: vendorLoading } = useQuery<Vendor>({
    queryKey: ["/api/auth/my-vendor"],
    enabled: isVendor,
  });

  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals", vendor?.id],
    enabled: !!vendor?.id,
  });

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

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/discover");
    }
  };

  const handleTabChange = (newTab: TabValue) => {
    setActiveTab(newTab);
    setLocation(`/account/${newTab}`);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  if (!isVendor) {
    setLocation("/profile");
    return null;
  }

  const tabs: { value: TabValue; label: string; icon: typeof Building2 }[] = [
    { value: "profile", label: "Business Profile", icon: Building2 },
    { value: "deals", label: "My Deals", icon: Tag },
    { value: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center gap-3 px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold" data-testid="heading-my-account">
            My Account
          </h1>
        </div>

        <div className="flex border-b">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => handleTabChange(t.value)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-sm font-medium transition-colors relative ${
                activeTab === t.value
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${t.value}`}
            >
              <t.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(" ")[0]}</span>
              {activeTab === t.value && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {activeTab === "profile" && (
          <BusinessProfileTab 
            vendor={vendor} 
            vendorLoading={vendorLoading}
            updateVendorMutation={updateVendorMutation}
          />
        )}
        {activeTab === "deals" && (
          <MyDealsTab 
            vendor={vendor}
            deals={deals}
            setLocation={setLocation}
          />
        )}
        {activeTab === "settings" && (
          <SettingsTab 
            vendor={vendor}
            updateVendorMutation={updateVendorMutation}
            handleLogout={handleLogout}
          />
        )}
      </main>
    </div>
  );
}

interface BusinessProfileTabProps {
  vendor: Vendor | undefined;
  vendorLoading: boolean;
  updateVendorMutation: ReturnType<typeof useMutation<unknown, Error, Partial<Vendor>>>;
}

function BusinessProfileTab({ vendor, vendorLoading, updateVendorMutation }: BusinessProfileTabProps) {
  if (vendorLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading business profile...</p>
        </CardContent>
      </Card>
    );
  }

  if (!vendor) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">No business profile found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card data-testid="card-business-images">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Images
          </CardTitle>
          <CardDescription>Your profile logo and cover banner</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
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
                aspectRatio="square"
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

      <Card data-testid="card-business-info">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>Your public business details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              defaultValue={vendor.tagline || ""}
              placeholder="A short catchy phrase"
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
        </CardContent>
      </Card>

      <Card data-testid="card-business-contact">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>How customers can reach you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                defaultValue={vendor.contactEmail || ""}
                placeholder="email@business.com"
                data-testid="input-contact-email"
                onBlur={(e) => {
                  if (e.target.value !== vendor.contactEmail) {
                    updateVendorMutation.mutate({ contactEmail: e.target.value });
                  }
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              defaultValue={vendor.phone || ""}
              placeholder="(239) 555-1234"
              data-testid="input-phone"
              onBlur={(e) => {
                if (e.target.value !== vendor.phone) {
                  updateVendorMutation.mutate({ phone: e.target.value });
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-business-location">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
          <CardDescription>Where customers can find you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              defaultValue={vendor.address || ""}
              placeholder="123 Main Street"
              data-testid="input-address"
              onBlur={(e) => {
                if (e.target.value !== vendor.address) {
                  updateVendorMutation.mutate({ address: e.target.value });
                }
              }}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
                data-testid="input-zip-code"
                onBlur={(e) => {
                  if (e.target.value !== vendor.zipCode) {
                    updateVendorMutation.mutate({ zipCode: e.target.value });
                  }
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-business-web">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Web & Social
          </CardTitle>
          <CardDescription>Your online presence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                defaultValue={vendor.instagram || ""}
                placeholder="@yourbusiness"
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
    </div>
  );
}

interface MyDealsTabProps {
  vendor: Vendor | undefined;
  deals: Deal[];
  setLocation: (path: string) => void;
}

function MyDealsTab({ vendor, deals, setLocation }: MyDealsTabProps) {
  if (!vendor) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Complete your business profile first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your Deals</h2>
          <p className="text-sm text-muted-foreground">
            {deals.length} {deals.length === 1 ? "deal" : "deals"} total
          </p>
        </div>
        <Button 
          onClick={() => setLocation("/dashboard?tab=deals&action=create")}
          data-testid="button-create-deal"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Deal
        </Button>
      </div>

      {deals.length === 0 ? (
        <Card data-testid="card-no-deals">
          <CardContent className="py-12 text-center">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No deals yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first deal to attract more customers
            </p>
            <Button 
              onClick={() => setLocation("/dashboard?tab=deals&action=create")}
              data-testid="button-create-first-deal"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Deal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="deals-list">
          {deals.map((deal) => (
            <Card 
              key={deal.id} 
              className="hover-elevate cursor-pointer"
              onClick={() => setLocation(`/deals/${deal.id}`)}
              data-testid={`deal-card-${deal.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{deal.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {deal.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {deal.savingsAmount && (
                        <Badge variant="secondary">
                          Save ${deal.savingsAmount}
                        </Badge>
                      )}
                      {deal.isPassLocked && (
                        <Badge variant="outline">Member Only</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={deal.isActive ? "default" : "secondary"}>
                      {deal.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface SettingsTabProps {
  vendor: Vendor | undefined;
  updateVendorMutation: ReturnType<typeof useMutation<unknown, Error, Partial<Vendor>>>;
  handleLogout: () => void;
}

function SettingsTab({ vendor, updateVendorMutation, handleLogout }: SettingsTabProps) {
  return (
    <div className="space-y-6">
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

          <Card data-testid="card-notifications">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Manage how you receive updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about messages and deals
                  </p>
                </div>
                <Switch
                  checked={true}
                  disabled={true}
                  data-testid="switch-email-notifications"
                />
              </div>
            </CardContent>
          </Card>

        </>
      )}

      <Card data-testid="card-account-actions">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
