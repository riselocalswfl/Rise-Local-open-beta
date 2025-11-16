import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Store, Package, Calendar, HelpCircle, Settings, Plus, Eye, Upload, Image as ImageIcon, Trash2, Edit, AlertCircle, LogOut, ShoppingCart } from "lucide-react";
import type { Vendor, Product, Event, VendorFAQ, FulfillmentOptions } from "@shared/schema";
import { insertProductSchema, insertEventSchema, insertVendorFAQSchema } from "@shared/schema";
import { TagInput } from "@/components/TagInput";
import { HierarchicalCategorySelector } from "@/components/HierarchicalCategorySelector";
import { FulfillmentEditor } from "@/components/FulfillmentEditor";
import { ImageUpload } from "@/components/ImageUpload";
import { z } from "zod";
import { SHOP_CATEGORIES, EVENTS_CATEGORIES, type CategoryGroup } from "@shared/categories";

// Helper function to filter categories based on vendor's selected categories
function filterVendorCategories(vendorCategories: string[]): CategoryGroup[] {
  if (!vendorCategories || vendorCategories.length === 0) {
    return [];
  }
  
  return SHOP_CATEGORIES
    .map((group) => {
      // If vendor selected the parent, include all children
      if (vendorCategories.includes(group.parent)) {
        return group;
      }
      
      // Otherwise, filter children to only show ones vendor selected
      const selectedChildren = group.children.filter((child) => 
        vendorCategories.includes(child)
      );
      
      // Only include group if vendor selected at least one child
      if (selectedChildren.length > 0) {
        return {
          parent: group.parent,
          children: selectedChildren,
        };
      }
      
      return null;
    })
    .filter((group): group is CategoryGroup => group !== null);
}

// Form schemas for validation
const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  price: z.number().min(0, "Price must be positive"), // In dollars for the form
  stock: z.number().int().min(0, "Stock must be a positive number"),
  categories: z.array(z.string()).default([]),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  unitType: z.string().default("per item"),
  status: z.string().default("active"),
  isFeatured: z.boolean().default(false),
  valueTags: z.array(z.string()).default([]),
  sourceFarm: z.string().optional(),
  harvestDate: z.string().optional(),
  leadTimeDays: z.number().int().default(0),
  inventoryStatus: z.string().default("in_stock"),
});

const eventFormSchema = insertEventSchema.omit({ vendorId: true, restaurantId: true }).extend({
  dateTime: z.string().min(1, "Date is required"),
  ticketsAvailable: z.number().int().min(0, "Tickets must be a positive number"),
  bannerImageUrl: z.string().optional(),
});

const faqFormSchema = insertVendorFAQSchema.omit({ vendorId: true });

export default function VendorDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [localValues, setLocalValues] = useState<string[]>([]);
  const [localSourcingPercent, setLocalSourcingPercent] = useState<number>(0);
  const [productPreviewDialogOpen, setProductPreviewDialogOpen] = useState(false);
  const [previewProductData, setPreviewProductData] = useState<any>(null);
  
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
      setLocalSourcingPercent(vendor.localSourcingPercent || 0);
    }
  }, [vendor]);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: [`/api/products?vendorId=${vendor?.id}`],
    enabled: !!vendor?.id,
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: [`/api/vendors/${vendor?.id}/events`],
    enabled: !!vendor?.id,
  });

  const { data: faqs = [] } = useQuery<VendorFAQ[]>({
    queryKey: [`/api/vendors/${vendor?.id}/faqs`],
    enabled: !!vendor?.id,
  });

  // Fetch vendor orders
  const { data: vendorOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/vendor-orders/my"],
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
        queryClient.invalidateQueries({ queryKey: [`/api/vendors/${vendor.id}/events`] });
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
        queryClient.invalidateQueries({ queryKey: [`/api/vendors/${vendor.id}/events`] });
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
        queryClient.invalidateQueries({ queryKey: [`/api/vendors/${vendor.id}/faqs`] });
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
        queryClient.invalidateQueries({ queryKey: [`/api/vendors/${vendor.id}/faqs`] });
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile" className="gap-2" data-testid="tab-profile">
              <Store className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2" data-testid="tab-products">
              <Package className="w-4 h-4" />
              Products ({products.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2" data-testid="tab-orders">
              <ShoppingCart className="w-4 h-4" />
              Orders ({vendorOrders.length})
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
          <TabsContent value="profile" className="space-y-6">
            {/* Business Info Section */}
            <Card>
              <CardHeader>
                <CardTitle>Business Info</CardTitle>
                <CardDescription>Tell customers about your business</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name <span className="text-destructive">*</span></Label>
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

                <HierarchicalCategorySelector
                  categories={SHOP_CATEGORIES}
                  selectedCategories={vendor.categories || []}
                  onChange={(categories) => {
                    updateVendorMutation.mutate({ categories });
                  }}
                  label="Shop Categories"
                  required
                />

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
                  <Label htmlFor="bio">Bio (max 300 characters)</Label>
                  <Textarea
                    id="bio"
                    defaultValue={vendor.bio}
                    maxLength={300}
                    rows={4}
                    placeholder="Tell your story..."
                    data-testid="input-bio"
                    onBlur={(e) => {
                      if (e.target.value !== vendor.bio) {
                        updateVendorMutation.mutate({ bio: e.target.value });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">{vendor.bio?.length || 0}/300 characters</p>
                </div>
              </CardContent>
            </Card>

            {/* Location & Contact Section */}
            <Card>
              <CardHeader>
                <CardTitle>Location & Contact</CardTitle>
                <CardDescription>Help customers reach and find you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      defaultValue={vendor.city || "Fort Myers"}
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

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email (optional)</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    defaultValue={vendor.contactEmail || ""}
                    placeholder="contact@example.com"
                    data-testid="input-contact-email"
                    onBlur={(e) => {
                      if (e.target.value !== vendor.contactEmail) {
                        updateVendorMutation.mutate({ contactEmail: e.target.value });
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website Link (optional)</Label>
                  <Input
                    id="website"
                    type="url"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram (optional)</Label>
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
                    <Label htmlFor="facebook">Facebook (optional)</Label>
                    <Input
                      id="facebook"
                      defaultValue={vendor.facebook || ""}
                      placeholder="YourBusinessPage"
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

            {/* Business Values Section */}
            <Card>
              <CardHeader>
                <CardTitle>Business Values</CardTitle>
                <CardDescription>Show your commitment to the local community</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label htmlFor="localSourcing">Local Sourcing: {localSourcingPercent}%</Label>
                  <Slider
                    id="localSourcing"
                    min={0}
                    max={100}
                    step={5}
                    value={[localSourcingPercent]}
                    onValueChange={([value]) => setLocalSourcingPercent(value)}
                    onValueCommit={([value]) => {
                      if (value !== vendor.localSourcingPercent) {
                        updateVendorMutation.mutate({ localSourcingPercent: value });
                      }
                    }}
                    data-testid="slider-local-sourcing"
                  />
                  <p className="text-sm text-muted-foreground">
                    Percentage of products sourced locally
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Value Tags</Label>
                  <TagInput
                    tags={localValues}
                    onChange={(values) => {
                      const previousValues = localValues;
                      setLocalValues(values);
                      updateVendorMutation.mutate(
                        { values },
                        {
                          onError: () => {
                            setLocalValues(previousValues);
                          },
                        }
                      );
                    }}
                    placeholder="Add value tags (e.g., organic, sustainable, fair-trade)"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods Section */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Configure which payment methods you accept</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="font-semibold">Standard Payment Methods</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select all payment methods you accept
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {["Direct", "Venmo", "Zelle", "CashApp", "PayPal", "Cash"].map((method) => {
                      const currentPreferences = vendor.paymentPreferences || [];
                      const isChecked = currentPreferences.includes(method);
                      
                      return (
                        <div key={method} className="flex items-center gap-2">
                          <Checkbox
                            id={`payment-${method}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const newPreferences = checked
                                ? [...currentPreferences, method]
                                : currentPreferences.filter(m => m !== method);
                              updateVendorMutation.mutate({ paymentPreferences: newPreferences });
                            }}
                            data-testid={`checkbox-payment-${method}`}
                          />
                          <Label htmlFor={`payment-${method}`} className="cursor-pointer text-sm">
                            {method}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
                  
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Custom Payment Methods</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    Add any other payment methods you accept (e.g., "Square", "Stripe", "Bitcoin")
                  </p>
                  <TagInput
                    tags={(vendor.paymentPreferences || []).filter(
                      p => !["Direct", "Venmo", "Zelle", "CashApp", "PayPal", "Cash"].includes(p)
                    )}
                    onChange={(customMethods) => {
                      const standardMethods = (vendor.paymentPreferences || []).filter(
                        p => ["Direct", "Venmo", "Zelle", "CashApp", "PayPal", "Cash"].includes(p)
                      );
                      const newPreferences = [...standardMethods, ...customMethods];
                      updateVendorMutation.mutate({ paymentPreferences: newPreferences });
                    }}
                    placeholder="Type a payment method and press Enter..."
                    maxTags={5}
                    testId="input-custom-payment-methods"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Fulfillment Methods Section */}
            <Card>
              <CardHeader>
                <CardTitle>Fulfillment Methods</CardTitle>
                <CardDescription>Configure how customers can receive their orders</CardDescription>
              </CardHeader>
              <CardContent>
                <FulfillmentEditor
                  value={vendor.fulfillmentOptions as FulfillmentOptions || {}}
                  onChange={(fulfillmentOptions) => {
                    updateVendorMutation.mutate({ fulfillmentOptions });
                  }}
                />
              </CardContent>
            </Card>

            {/* Profile Photo/Logo Section */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Photo/Logo</CardTitle>
                <CardDescription>Add a logo or profile photo to represent your business</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ImageUpload
                  currentImageUrl={vendor.logoUrl}
                  onUploadComplete={(imageUrl) => {
                    updateVendorMutation.mutate({ logoUrl: imageUrl });
                  }}
                  onRemove={() => {
                    updateVendorMutation.mutate({ logoUrl: null });
                  }}
                  maxSizeMB={5}
                  aspectRatio="square"
                  disabled={updateVendorMutation.isPending}
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
                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-[#222]">
                    <DialogHeader>
                      <DialogTitle className="text-[#222]">Add New Product</DialogTitle>
                    </DialogHeader>
                    <AddProductForm 
                      onSubmit={createProductMutation.mutate}
                      isPending={createProductMutation.isPending}
                      onPreview={(data) => {
                        setPreviewProductData(data);
                        setProductPreviewDialogOpen(true);
                      }}
                      availableCategories={filterVendorCategories(vendor?.categories || [])}
                    />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="mx-auto w-24 h-24 mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">No Products Yet</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Add your first product and start reaching your local customers!
                    </p>
                    <Button 
                      variant="default" 
                      onClick={() => setProductDialogOpen(true)}
                      data-testid="button-add-first-product"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Product
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product) => (
                      <Card key={product.id} className="overflow-hidden" data-testid={`product-card-${product.id}`}>
                        {product.imageUrl && (
                          <div className="aspect-square overflow-hidden bg-muted">
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {!product.imageUrl && (
                          <div className="aspect-square bg-muted flex items-center justify-center">
                            <Package className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-semibold line-clamp-1" data-testid={`product-name-${product.id}`}>{product.name}</h3>
                              {product.isFeatured && (
                                <Badge variant="default" className="shrink-0">Featured</Badge>
                              )}
                            </div>
                            {product.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                            )}
                          </div>
                          
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold" data-testid={`product-price-${product.id}`}>
                              ${((product.priceCents || 0) / 100).toFixed(2)}
                            </span>
                            {product.unitType && product.unitType !== "per item" && (
                              <span className="text-sm text-muted-foreground">/ {product.unitType.replace('per ', '')}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm" data-testid={`product-stock-${product.id}`}>
                              Stock: {product.stock}
                            </span>
                            {product.stock < 5 && product.stock > 0 && (
                              <Badge variant="outline" className="gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Low Stock
                              </Badge>
                            )}
                            {product.stock === 0 && (
                              <Badge variant="destructive">Out of Stock</Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Status:</span>
                              <Switch
                                checked={product.status === "active"}
                                onCheckedChange={(checked) => {
                                  updateProductMutation.mutate({
                                    id: product.id,
                                    data: { status: checked ? "active" : "hidden" }
                                  });
                                }}
                                data-testid={`switch-status-${product.id}`}
                              />
                              <span className="text-xs">{product.status === "active" ? "Active" : "Hidden"}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              data-testid={`button-edit-${product.id}`}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => deleteProductMutation.mutate(product.id)}
                              data-testid={`button-delete-${product.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Incoming Orders</CardTitle>
                <CardDescription>Manage customer orders and fulfillment</CardDescription>
              </CardHeader>
              <CardContent>
                {vendorOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No orders yet. Orders will appear here when customers purchase your products.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {vendorOrders.map((order: any) => (
                      <Card key={order.id} className="border-muted" data-testid={`card-order-${order.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">Order #{order.id.substring(0, 8).toUpperCase()}</CardTitle>
                              <CardDescription className="mt-1">
                                {order.buyerName} • {order.buyerEmail}
                              </CardDescription>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              <Badge variant="secondary" data-testid={`badge-status-${order.id}`}>
                                {order.status}
                              </Badge>
                              <Badge 
                                variant={order.paymentStatus === 'paid' ? 'default' : 'outline'}
                                data-testid={`badge-payment-${order.id}`}
                              >
                                {order.paymentStatus}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Items</h4>
                            {order.itemsJson?.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  {item.image && (
                                    <img src={item.image} alt={item.productName} className="w-8 h-8 object-cover rounded" />
                                  )}
                                  <span>{item.productName} (x{item.quantity})</span>
                                </div>
                                <span className="font-medium">${(item.priceCents * item.quantity / 100).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          <Separator />

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Subtotal</p>
                              <p className="font-medium">${(order.subtotalCents / 100).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Tax</p>
                              <p className="font-medium">${(order.taxCents / 100).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Fees</p>
                              <p className="font-medium">${(order.feesCents / 100).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total</p>
                              <p className="font-semibold text-lg">${(order.totalCents / 100).toFixed(2)}</p>
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-muted-foreground">Fulfillment</p>
                              <p className="font-medium capitalize">{order.fulfillmentType}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-muted-foreground">Contact</p>
                              <p className="text-sm">{order.buyerPhone}</p>
                            </div>

                            <div className="flex gap-2">
                              <Select
                                value={order.status}
                                onValueChange={async (value) => {
                                  try {
                                    await apiRequest("PATCH", `/api/vendor-orders/${order.id}/status`, { status: value });
                                    queryClient.invalidateQueries({ queryKey: ["/api/vendor-orders/my"] });
                                    toast({ title: "Order status updated" });
                                  } catch (error) {
                                    toast({ title: "Failed to update status", variant: "destructive" });
                                  }
                                }}
                              >
                                <SelectTrigger className="flex-1" data-testid={`select-status-${order.id}`}>
                                  <SelectValue placeholder="Update status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="processing">Processing</SelectItem>
                                  <SelectItem value="ready">Ready for Pickup</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select
                                value={order.paymentStatus}
                                onValueChange={async (value) => {
                                  try {
                                    await apiRequest("PATCH", `/api/vendor-orders/${order.id}/payment`, { paymentStatus: value });
                                    queryClient.invalidateQueries({ queryKey: ["/api/vendor-orders/my"] });
                                    toast({ title: "Payment status updated" });
                                  } catch (error) {
                                    toast({ title: "Failed to update payment status", variant: "destructive" });
                                  }
                                }}
                              >
                                <SelectTrigger className="flex-1" data-testid={`select-payment-${order.id}`}>
                                  <SelectValue placeholder="Payment status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Payment Pending</SelectItem>
                                  <SelectItem value="paid">Paid</SelectItem>
                                  <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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
                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-[#222]">
                    <DialogHeader>
                      <DialogTitle className="text-[#222]">Add New Event</DialogTitle>
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
                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-[#222]">
                    <DialogHeader>
                      <DialogTitle className="text-[#222]">Add New FAQ</DialogTitle>
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

                <Separator className="my-6" />

                <div className="space-y-2">
                  <Label>Account Actions</Label>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/api/logout'}
                    data-testid="button-logout-settings"
                    className="w-full sm:w-auto"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Product Preview Dialog */}
        <Dialog open={productPreviewDialogOpen} onOpenChange={setProductPreviewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-[#222]">
            <DialogHeader>
              <DialogTitle className="text-[#222]">Product Preview</DialogTitle>
            </DialogHeader>
            <div className="bg-white rounded-md shadow-md border border-gray-200 p-6">
              {previewProductData && <ProductPreview product={previewProductData} vendor={vendor} />}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ========== FORM COMPONENTS ==========

function AddProductForm({ 
  onSubmit, 
  isPending, 
  onPreview,
  availableCategories 
}: { 
  onSubmit: (data: any) => void; 
  isPending: boolean; 
  onPreview: (data: any) => void;
  availableCategories: CategoryGroup[];
}) {
  const [productTags, setProductTags] = useState<string[]>([]);
  
  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      stock: 0,
      categories: [],
      description: "",
      imageUrl: "",
      unitType: "per item",
      status: "active",
      isFeatured: false,
      valueTags: [],
      sourceFarm: "",
      harvestDate: "",
      leadTimeDays: 0,
      inventoryStatus: "in_stock",
    },
  });

  const handleSubmit = (data: z.infer<typeof productFormSchema>) => {
    const { price, categories, ...rest } = data;
    
    // Clean up optional fields - remove empty strings and zero values for optional fields
    const cleanData: any = {
      name: rest.name,
      stock: rest.stock,
      priceCents: Math.round(price * 100),
      valueTags: productTags,
      categories: categories || [],
      unitType: rest.unitType || "per item",
      status: rest.status || "active",
      isFeatured: rest.isFeatured || false,
    };
    
    // Only include optional fields if they have values
    if (rest.description) cleanData.description = rest.description;
    if (rest.imageUrl) cleanData.imageUrl = rest.imageUrl;
    if (rest.sourceFarm) cleanData.sourceFarm = rest.sourceFarm;
    if (rest.harvestDate) cleanData.harvestDate = rest.harvestDate;
    if (rest.leadTimeDays && rest.leadTimeDays > 0) cleanData.leadTimeDays = rest.leadTimeDays;
    if (rest.inventoryStatus) cleanData.inventoryStatus = rest.inventoryStatus;
    
    onSubmit(cleanData);
  };

  const handlePreview = () => {
    const data = form.getValues();
    const previewData = {
      ...data,
      priceCents: Math.round(data.price * 100),
      valueTags: productTags,
      categories: data.categories || [],
    };
    onPreview(previewData);
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
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price ($) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="5.99"
                    value={field.value || ""}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    data-testid="input-product-price"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unitType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-unit-type">
                      <SelectValue placeholder="Select unit type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="per item">Per Item</SelectItem>
                    <SelectItem value="per lb">Per Pound</SelectItem>
                    <SelectItem value="per dozen">Per Dozen</SelectItem>
                    <SelectItem value="per bunch">Per Bunch</SelectItem>
                    <SelectItem value="per pint">Per Pint</SelectItem>
                    <SelectItem value="per quart">Per Quart</SelectItem>
                    <SelectItem value="per gallon">Per Gallon</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                  value={field.value || ""}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  data-testid="input-product-stock"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Product Categories - filtered to vendor's categories */}
        <FormField
          control={form.control}
          name="categories"
          render={({ field }) => (
            <FormItem>
              <div className="space-y-2">
                <HierarchicalCategorySelector
                  categories={availableCategories}
                  selectedCategories={field.value || []}
                  onChange={field.onChange}
                  label="Product Categories"
                  required={false}
                />
                {availableCategories.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Please select your shop categories in the Profile tab first to categorize products.
                  </p>
                )}
              </div>
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
              <FormLabel>Product Image (optional)</FormLabel>
              <FormControl>
                <ImageUpload
                  currentImageUrl={field.value}
                  onUploadComplete={(imageUrl) => {
                    field.onChange(imageUrl);
                  }}
                  onRemove={() => {
                    field.onChange("");
                  }}
                  maxSizeMB={5}
                  aspectRatio="square"
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Label>Product Tags (optional)</Label>
          <TagInput
            tags={productTags}
            onChange={setProductTags}
            placeholder="Add tags (e.g., organic, local, fresh)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Product Status</FormLabel>
                  <FormDescription>Show or hide this product</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value === "active"}
                    onCheckedChange={(checked) => field.onChange(checked ? "active" : "hidden")}
                    data-testid="switch-product-status"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isFeatured"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Featured Product</FormLabel>
                  <FormDescription>Highlight on your profile</FormDescription>
                </div>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-product-featured"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-between gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handlePreview} data-testid="button-preview-product">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
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
      categories: [],
      ticketsAvailable: 0,
      bannerImageUrl: "",
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
          name="bannerImageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Banner (optional)</FormLabel>
              <FormControl>
                <ImageUpload
                  currentImageUrl={field.value}
                  onUploadComplete={(imageUrl) => {
                    field.onChange(imageUrl);
                  }}
                  onRemove={() => {
                    field.onChange("");
                  }}
                  maxSizeMB={5}
                  aspectRatio="landscape"
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categories"
          render={({ field }) => (
            <FormItem>
              <HierarchicalCategorySelector
                categories={EVENTS_CATEGORIES}
                selectedCategories={field.value || []}
                onChange={field.onChange}
                label="Event Categories"
                required
              />
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

// Product Preview Component
function ProductPreview({ product, vendor }: { product: any; vendor: Vendor }) {
  return (
    <div className="space-y-6 text-[#222]">
      {/* Product Image */}
      <div className="aspect-square overflow-hidden rounded-md bg-gray-100 flex items-center justify-center">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="w-24 h-24 text-gray-400" />
        )}
      </div>

      {/* Product Details */}
      <div className="space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h2 className="text-2xl font-bold text-[#222]">{product.name}</h2>
            {product.isFeatured && (
              <Badge variant="default">Featured</Badge>
            )}
          </div>
          {product.description && (
            <p className="text-gray-600">{product.description}</p>
          )}
        </div>

        {/* Price and Unit */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-[#222]">${((product.priceCents || 0) / 100).toFixed(2)}</span>
          {product.unitType && product.unitType !== "per item" && (
            <span className="text-lg text-gray-600">/ {product.unitType.replace('per ', '')}</span>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white">
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-xl font-bold text-[#222]">{product.stock || 0}</div>
                <div className="text-xs text-gray-600">In Stock</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-sm font-medium text-[#222]">{product.category || 'Uncategorized'}</div>
                <div className="text-xs text-gray-600">Category</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tags */}
        {product.valueTags && product.valueTags.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 text-[#222]">Product Tags</h3>
            <div className="flex flex-wrap gap-2">
              {product.valueTags.map((tag: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[#222]">{tag}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Vendor Info */}
        <div className="border-t border-gray-300 pt-4">
          <h3 className="font-semibold mb-2 text-[#222]">Sold By</h3>
          <div className="flex items-center gap-3">
            {vendor.logoUrl && (
              <img 
                src={vendor.logoUrl}
                alt={vendor.businessName}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-300"
              />
            )}
            <div>
              <div className="font-medium text-[#222]">{vendor.businessName}</div>
              {vendor.city && vendor.state && (
                <div className="text-sm text-gray-600">{vendor.city}, {vendor.state}</div>
              )}
            </div>
          </div>
        </div>

        {/* Status Info */}
        <div className="border-t border-gray-300 pt-4 text-sm text-gray-600">
          Status: {product.status === "active" ? "Active (Visible to customers)" : "Hidden (Not visible to customers)"}
        </div>
      </div>
    </div>
  );
}
