import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Store, Package, Calendar, HelpCircle, Settings } from "lucide-react";
import type { Vendor, Product, Event, VendorFAQ } from "@shared/schema";

export default function VendorDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  // Fetch the authenticated user's vendor
  const { data: vendor, isLoading: vendorLoading, isError } = useQuery<Vendor>({
    queryKey: ["/api/auth/my-vendor"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products", { vendorId: vendor?.id }],
    enabled: !!vendor?.id,
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/vendors", vendor?.id, "events"],
    enabled: !!vendor?.id,
  });

  const { data: faqs = [] } = useQuery<VendorFAQ[]>({
    queryKey: ["/api/vendors", vendor?.id, "faqs"],
    enabled: !!vendor?.id,
  });

  // Profile Edit Mutation
  const updateVendorMutation = useMutation({
    mutationFn: async (data: Partial<Vendor>) => {
      if (!vendor?.id) throw new Error("No vendor ID");
      return await apiRequest(`/api/vendors/${vendor.id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/my-vendor"] });
      toast({ title: "Profile updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  // Product Mutations
  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!vendor?.id) throw new Error("No vendor ID");
      return await apiRequest("/api/products", "POST", { ...data, vendorId: vendor.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product created successfully" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/products/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product updated successfully" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/products/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product deleted successfully" });
    },
  });

  // Event Mutations
  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!vendor?.id) throw new Error("No vendor ID");
      return await apiRequest("/api/events", "POST", { ...data, vendorId: vendor.id });
    },
    onSuccess: () => {
      if (vendor?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendor.id, "events"] });
      }
      toast({ title: "Event created successfully" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/events/${id}`, "DELETE");
    },
    onSuccess: () => {
      if (vendor?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendor.id, "events"] });
      }
      toast({ title: "Event deleted successfully" });
    },
  });

  // FAQ Mutations
  const createFAQMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!vendor?.id) throw new Error("No vendor ID");
      return await apiRequest("/api/vendor-faqs", "POST", { ...data, vendorId: vendor.id });
    },
    onSuccess: () => {
      if (vendor?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendor.id, "faqs"] });
      }
      toast({ title: "FAQ created successfully" });
    },
  });

  const deleteFAQMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/vendor-faqs/${id}`, "DELETE");
    },
    onSuccess: () => {
      if (vendor?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendor.id, "faqs"] });
      }
      toast({ title: "FAQ deleted successfully" });
    },
  });

  if (vendorLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (isError || !vendor) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>No Vendor Profile Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You don't have a vendor profile yet. Please sign up as a vendor to create your profile.
            </p>
            <p className="text-sm text-muted-foreground">
              For demo purposes, you can use one of the seeded vendor owner accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="heading-dashboard">Vendor Dashboard</h1>
          <p className="text-muted-foreground">{vendor.businessName}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="gap-2" data-testid="tab-profile">
              <Store className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2" data-testid="tab-products">
              <Package className="w-4 h-4" />
              Products ({products.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2" data-testid="tab-events">
              <Calendar className="w-4 h-4" />
              Events ({events.length})
            </TabsTrigger>
            <TabsTrigger value="faqs" className="gap-2" data-testid="tab-faqs">
              <HelpCircle className="w-4 h-4" />
              FAQs ({faqs.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    defaultValue={vendor.tagline || ""}
                    placeholder="e.g., Seasonal produce grown with regenerative practices"
                    data-testid="input-tagline"
                    onBlur={(e) => {
                      if (e.target.value !== vendor.tagline) {
                        updateVendorMutation.mutate({ tagline: e.target.value });
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    defaultValue={vendor.bio}
                    rows={6}
                    placeholder="Tell your story..."
                    data-testid="input-bio"
                    onBlur={(e) => {
                      if (e.target.value !== vendor.bio) {
                        updateVendorMutation.mutate({ bio: e.target.value });
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="localSourcing">Local Sourcing %</Label>
                  <Input
                    id="localSourcing"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={vendor.localSourcingPercent || 0}
                    data-testid="input-local-sourcing"
                    onBlur={(e) => {
                      const value = parseInt(e.target.value);
                      if (value !== vendor.localSourcingPercent) {
                        updateVendorMutation.mutate({ localSourcingPercent: value });
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Current Badges</Label>
                  <div className="flex flex-wrap gap-2">
                    {vendor.badges && vendor.badges.map((badge, i) => (
                      <Badge key={i} variant="secondary" data-testid={`badge-${i}`}>{badge}</Badge>
                    ))}
                    {(!vendor.badges || vendor.badges.length === 0) && (
                      <p className="text-sm text-muted-foreground">No badges added yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Manage Products</CardTitle>
                <Button size="sm" data-testid="button-add-product">Add Product</Button>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No products yet. Add your first product to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center justify-between border rounded-md p-4" data-testid={`product-${product.id}`}>
                        <div className="flex-1">
                          <h3 className="font-semibold">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">{product.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm font-medium">${((product.priceCents || 0) / 100).toFixed(2)}</span>
                            <span className="text-sm text-muted-foreground">Stock: {product.stock}</span>
                            <Badge variant="secondary">{product.category}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" data-testid={`button-edit-${product.id}`}>Edit</Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteProductMutation.mutate(product.id)}
                            data-testid={`button-delete-${product.id}`}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Manage Events</CardTitle>
                <Button size="sm" data-testid="button-add-event">Add Event</Button>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No events yet. Create your first event to engage with customers!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {events.map((event) => (
                      <div key={event.id} className="flex items-center justify-between border rounded-md p-4" data-testid={`event-${event.id}`}>
                        <div className="flex-1">
                          <h3 className="font-semibold">{event.title}</h3>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{new Date(event.dateTime).toLocaleDateString()}</span>
                            <span>{event.location}</span>
                            <span>{event.rsvpCount} RSVPs</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" data-testid={`button-edit-event-${event.id}`}>Edit</Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteEventMutation.mutate(event.id)}
                            data-testid={`button-delete-event-${event.id}`}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQs Tab */}
          <TabsContent value="faqs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Manage FAQs</CardTitle>
                <Button size="sm" data-testid="button-add-faq">Add FAQ</Button>
              </CardHeader>
              <CardContent>
                {faqs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No FAQs yet. Add frequently asked questions to help customers!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {faqs.map((faq) => (
                      <div key={faq.id} className="border rounded-md p-4" data-testid={`faq-${faq.id}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-2">{faq.question}</h3>
                            <p className="text-sm text-muted-foreground">{faq.answer}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" data-testid={`button-edit-faq-${faq.id}`}>Edit</Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => deleteFAQMutation.mutate(faq.id)}
                              data-testid={`button-delete-faq-${faq.id}`}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    defaultValue={vendor.logoUrl || ""}
                    placeholder="https://example.com/logo.png"
                    data-testid="input-logo-url"
                    onBlur={(e) => {
                      if (e.target.value !== vendor.logoUrl) {
                        updateVendorMutation.mutate({ logoUrl: e.target.value });
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heroImageUrl">Hero Image URL</Label>
                  <Input
                    id="heroImageUrl"
                    defaultValue={vendor.heroImageUrl || ""}
                    placeholder="https://example.com/hero.jpg"
                    data-testid="input-hero-url"
                    onBlur={(e) => {
                      if (e.target.value !== vendor.heroImageUrl) {
                        updateVendorMutation.mutate({ heroImageUrl: e.target.value });
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    defaultValue={vendor.website || ""}
                    placeholder="https://yourwebsite.com"
                    data-testid="input-website"
                    onBlur={(e) => {
                      if (e.target.value !== vendor.website) {
                        updateVendorMutation.mutate({ website: e.target.value });
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram Handle</Label>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
