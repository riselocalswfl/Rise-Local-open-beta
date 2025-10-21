import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Store, Package, Calendar, HelpCircle, Settings, Plus } from "lucide-react";
import type { Vendor, Product, Event, VendorFAQ } from "@shared/schema";
import { insertProductSchema, insertEventSchema, insertVendorFAQSchema } from "@shared/schema";
import { TagInput } from "@/components/TagInput";
import { z } from "zod";

// Form schemas for validation
const productFormSchema = insertProductSchema.omit({ vendorId: true }).extend({
  priceCents: z.number().min(0, "Price must be positive"),
  stock: z.number().int().min(0, "Stock must be a positive number"),
});

const eventFormSchema = insertEventSchema.omit({ vendorId: true, restaurantId: true }).extend({
  dateTime: z.string().min(1, "Date is required"),
  ticketsAvailable: z.number().int().min(0, "Tickets must be a positive number"),
});

const faqFormSchema = insertVendorFAQSchema.omit({ vendorId: true });

export default function VendorDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [localValues, setLocalValues] = useState<string[]>([]);
  
  // Dialog states
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);

  // Fetch the authenticated user's vendor
  const { data: vendor, isLoading: vendorLoading, isError } = useQuery<Vendor>({
    queryKey: ["/api/auth/my-vendor"],
  });

  // Sync local values when vendor data loads
  useEffect(() => {
    if (vendor) {
      setLocalValues(vendor.values || []);
    }
  }, [vendor]);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: [`/api/products?vendorId=${vendor?.id}`],
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
      return await apiRequest("PATCH", `/api/vendors/${vendor.id}`, data);
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
      return await apiRequest("POST", "/api/products", { ...data, vendorId: vendor.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/products');
        }
      });
      setProductDialogOpen(false);
      toast({ title: "Product created successfully" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/products');
        }
      });
      toast({ title: "Product updated successfully" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/products');
        }
      });
      toast({ title: "Product deleted successfully" });
    },
  });

  // Event Mutations
  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!vendor?.id) throw new Error("No vendor ID");
      return await apiRequest("POST", "/api/events", { 
        ...data, 
        vendorId: vendor.id, 
        restaurantId: null  // Explicitly set to satisfy CHECK constraint
      });
    },
    onSuccess: () => {
      if (vendor?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendor.id, "events"] });
      }
      setEventDialogOpen(false);
      toast({ title: "Event created successfully" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/events/${id}`);
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
      return await apiRequest("POST", "/api/vendor-faqs", { ...data, vendorId: vendor.id });
    },
    onSuccess: () => {
      if (vendor?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendor.id, "faqs"] });
      }
      setFaqDialogOpen(false);
      toast({ title: "FAQ created successfully" });
    },
  });

  const deleteFAQMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/vendor-faqs/${id}`);
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
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    defaultValue={vendor.businessName || ""}
                    placeholder="e.g., Sunshine Grove Farm"
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

                <TagInput
                  tags={localValues}
                  onChange={(values) => {
                    const previousValues = localValues;
                    setLocalValues(values); // Optimistic update
                    updateVendorMutation.mutate(
                      { values },
                      {
                        onError: () => {
                          setLocalValues(previousValues); // Rollback on error
                        },
                      }
                    );
                  }}
                  placeholder="Add a value tag and press Enter (e.g., organic, local, sustainable)"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Manage Products</CardTitle>
                <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-product">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Product</DialogTitle>
                    </DialogHeader>
                    <AddProductForm 
                      onSubmit={createProductMutation.mutate}
                      isPending={createProductMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
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
                <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-event">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Event</DialogTitle>
                    </DialogHeader>
                    <AddEventForm 
                      onSubmit={createEventMutation.mutate}
                      isPending={createEventMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
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
                <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-faq">
                      <Plus className="w-4 h-4 mr-1" />
                      Add FAQ
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New FAQ</DialogTitle>
                    </DialogHeader>
                    <AddFAQForm 
                      onSubmit={createFAQMutation.mutate}
                      isPending={createFAQMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
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

// ========== FORM COMPONENTS ==========

function AddProductForm({ onSubmit, isPending }: { onSubmit: (data: any) => void; isPending: boolean }) {
  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      priceCents: 0,
      stock: 0,
      category: "",
      description: "",
      imageUrl: "",
      valueTags: [],
      sourceFarm: "",
      harvestDate: undefined,
      leadTimeDays: 0,
      inventoryStatus: "in_stock",
    },
  });

  const handleSubmit = (data: z.infer<typeof productFormSchema>) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Heirloom Tomato Mix" {...field} data-testid="input-product-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="priceCents"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (cents) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="599 = $5.99"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-product-price"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="50"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-product-stock"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                <FormControl>
                  <SelectTrigger data-testid="select-product-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Produce">Produce</SelectItem>
                  <SelectItem value="Dairy">Dairy</SelectItem>
                  <SelectItem value="Meat">Meat</SelectItem>
                  <SelectItem value="Baked Goods">Baked Goods</SelectItem>
                  <SelectItem value="Preserves">Preserves</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your product..."
                  rows={3}
                  {...field}
                  value={field.value || ""}
                  data-testid="input-product-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://example.com/image.jpg" 
                  {...field} 
                  value={field.value || ""}
                  data-testid="input-product-image" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isPending} data-testid="button-submit-product">
            {isPending ? "Creating..." : "Create Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function AddEventForm({ onSubmit, isPending }: { onSubmit: (data: any) => void; isPending: boolean }) {
  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      dateTime: "",
      location: "",
      category: "",
      ticketsAvailable: 0,
    },
  });

  const handleSubmit = (data: z.infer<typeof eventFormSchema>) => {
    onSubmit({
      ...data,
      dateTime: new Date(data.dateTime).toISOString(),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Title *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Farm Tour & Tasting" {...field} data-testid="input-event-title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your event..."
                  rows={3}
                  {...field}
                  data-testid="input-event-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dateTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date & Time *</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} data-testid="input-event-datetime" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ticketsAvailable"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tickets Available *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="20"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-event-tickets"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 123 Farm Road, Fort Myers, FL" {...field} data-testid="input-event-location" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-event-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Workshop">Workshop</SelectItem>
                  <SelectItem value="Tour">Tour</SelectItem>
                  <SelectItem value="Tasting">Tasting</SelectItem>
                  <SelectItem value="Market">Market</SelectItem>
                  <SelectItem value="Festival">Festival</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isPending} data-testid="button-submit-event">
            {isPending ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function AddFAQForm({ onSubmit, isPending }: { onSubmit: (data: any) => void; isPending: boolean }) {
  const form = useForm<z.infer<typeof faqFormSchema>>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: {
      question: "",
      answer: "",
      displayOrder: 0,
    },
  });

  const handleSubmit = (data: z.infer<typeof faqFormSchema>) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="question"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Do you offer delivery?" {...field} data-testid="input-faq-question" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="answer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Answer *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide a detailed answer..."
                  rows={4}
                  {...field}
                  data-testid="input-faq-answer"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isPending} data-testid="button-submit-faq">
            {isPending ? "Creating..." : "Create FAQ"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
