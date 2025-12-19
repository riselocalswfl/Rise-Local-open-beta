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
import { Store, Package, HelpCircle, Settings, Plus, Eye, Upload, Image as ImageIcon, Trash2, Edit, AlertCircle, LogOut, UtensilsCrossed, Tag, MessageSquare, Lock, Send, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Vendor, Product, Event, VendorFAQ, MenuItem, ServiceOffering, Deal } from "@shared/schema";
import { insertProductSchema, insertEventSchema, insertVendorFAQSchema, insertMenuItemSchema, insertServiceOfferingSchema, insertDealSchema } from "@shared/schema";
import { TagInput } from "@/components/TagInput";
import { ImageUpload } from "@/components/ImageUpload";
import Header from "@/components/Header";
import { z } from "zod";

// Form schemas for validation
const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  price: z.number().min(0, "Price must be positive"), // In dollars for the form
  stock: z.number().int().min(0, "Stock must be a positive number"),
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

const menuItemFormSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  price: z.number().min(0, "Price must be positive"), // In dollars for the form
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  imageUrl: z.string().optional(),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  dietaryTags: z.array(z.string()).default([]),
  valueTags: z.array(z.string()).default([]),
  ingredients: z.string().optional(),
  allergens: z.array(z.string()).default([]),
  isLocallySourced: z.boolean().default(false),
  sourceFarm: z.string().optional(),
});

const serviceFormSchema = z.object({
  offeringName: z.string().min(1, "Service name is required"),
  description: z.string().min(1, "Description is required"),
  pricingModel: z.enum(["fixed", "hourly", "quote"]),
  price: z.number().min(0, "Price must be 0 or greater").optional(),
  hourlyRate: z.number().min(0, "Hourly rate must be 0 or greater").optional(),
  durationMinutes: z.number().int().min(0, "Duration must be positive").optional(),
  tags: z.array(z.string()).default([]),
  requirements: z.string().optional(),
  includes: z.string().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
}).refine(
  (data) => {
    if (data.pricingModel === "fixed") {
      return data.price !== undefined;
    }
    return true;
  },
  {
    message: "Price is required for fixed pricing",
    path: ["price"],
  }
).refine(
  (data) => {
    if (data.pricingModel === "hourly") {
      return data.hourlyRate !== undefined;
    }
    return true;
  },
  {
    message: "Hourly rate is required for hourly pricing",
    path: ["hourlyRate"],
  }
);

const dealFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().optional(),
  city: z.string().default("Fort Myers"),
  tier: z.enum(["free", "premium"]).default("free"),
  dealType: z.enum(["bogo", "percent", "addon"]),
  isActive: z.boolean().default(true),
});

const DEAL_CATEGORIES = ["Food & Drink", "Retail", "Beauty", "Fitness", "Services", "Experiences"];
const DEAL_CITIES = ["Fort Myers", "Cape Coral", "Bonita Springs", "Estero", "Naples"];

export default function VendorDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [localValues, setLocalValues] = useState<string[]>([]);
  const [localSourcingPercent, setLocalSourcingPercent] = useState<number>(0);
  const [showLocalSourcing, setShowLocalSourcing] = useState<boolean>(false);
  const [localHours, setLocalHours] = useState<Record<string, string>>({});
  const [productPreviewDialogOpen, setProductPreviewDialogOpen] = useState(false);
  const [previewProductData, setPreviewProductData] = useState<any>(null);
  
  // Dialog states
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [menuItemDialogOpen, setMenuItemDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  // Fetch the authenticated user's vendor
  const { data: vendor, isLoading: vendorLoading, isError } = useQuery<Vendor>({
    queryKey: ["/api/auth/my-vendor"],
  });

  // Sync local values when vendor data loads
  useEffect(() => {
    if (vendor) {
      setLocalValues(vendor.values || []);
      setLocalSourcingPercent(vendor.localSourcingPercent || 0);
      setShowLocalSourcing(vendor.showLocalSourcing || false);
      setLocalHours((vendor.hours as Record<string, string>) || {});
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

  // Fetch menu items
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: [`/api/menu-items?vendorId=${vendor?.id}`],
    enabled: !!vendor?.id,
  });

  // Fetch service offerings
  const { data: serviceOfferings = [] } = useQuery<ServiceOffering[]>({
    queryKey: [`/api/vendors/${vendor?.id}/service-offerings`],
    enabled: !!vendor?.id,
  });

  // Fetch deals
  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: [`/api/deals?vendorId=${vendor?.id}`],
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

  // Menu Item Mutations
  const createMenuItemMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!vendor?.id) throw new Error("No vendor ID");
      return await apiRequest("POST", "/api/menu-items", { ...data, vendorId: vendor.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/menu-items');
        }
      });
      setMenuItemDialogOpen(false);
      toast({ title: "Menu item created successfully" });
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/menu-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/menu-items');
        }
      });
      toast({ title: "Menu item updated successfully" });
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/menu-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/menu-items');
        }
      });
      toast({ title: "Menu item deleted successfully" });
    },
  });

  // Service Offering Mutations
  const createServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!vendor?.id) throw new Error("No vendor ID");
      return await apiRequest("POST", "/api/service-offerings", { ...data, vendorId: vendor.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (
            key.startsWith('/api/service-offerings') ||
            key.includes('/service-offerings')
          );
        }
      });
      setServiceDialogOpen(false);
      toast({ title: "Service created successfully" });
    },
    onError: (error: any) => {
      console.error("Service creation error:", error);
      toast({ 
        title: "Failed to create service", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/service-offerings/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (
            key.startsWith('/api/service-offerings') ||
            key.includes('/service-offerings')
          );
        }
      });
      toast({ title: "Service updated successfully" });
    },
    onError: (error: any) => {
      console.error("Service update error:", error);
      toast({ 
        title: "Failed to update service", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/service-offerings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (
            key.startsWith('/api/service-offerings') ||
            key.includes('/service-offerings')
          );
        }
      });
      toast({ title: "Service deleted successfully" });
    },
    onError: (error: any) => {
      console.error("Service deletion error:", error);
      toast({ 
        title: "Failed to delete service", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  // Deal Mutations
  const createDealMutation = useMutation({
    mutationFn: async (data: z.infer<typeof dealFormSchema>) => {
      if (!vendor?.id) throw new Error("No vendor ID");
      return await apiRequest("POST", "/api/deals", { ...data, vendorId: vendor.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/deals');
        }
      });
      setDealDialogOpen(false);
      setEditingDeal(null);
      toast({ title: "Deal created successfully" });
    },
    onError: (error: any) => {
      console.error("Deal creation error:", error);
      toast({ 
        title: "Failed to create deal", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const updateDealMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof dealFormSchema>> }) => {
      return await apiRequest("PUT", `/api/deals/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/deals');
        }
      });
      setDealDialogOpen(false);
      setEditingDeal(null);
      toast({ title: "Deal updated successfully" });
    },
    onError: (error: any) => {
      console.error("Deal update error:", error);
      toast({ 
        title: "Failed to update deal", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const toggleDealMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PUT", `/api/deals/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/deals');
        }
      });
      toast({ title: "Deal status updated" });
    },
    onError: (error: any) => {
      console.error("Deal toggle error:", error);
      toast({ 
        title: "Failed to update deal status", 
        variant: "destructive" 
      });
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
            <CardTitle>Setting Up Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Loading your vendor profile...
            </p>
            <p className="text-sm text-muted-foreground">
              If this persists, please contact support or complete the vendor onboarding process.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" data-testid="heading-dashboard">Vendor Dashboard</h1>
            <p className="text-muted-foreground">{vendor.businessName}</p>
          </div>


        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Mobile Select Dropdown */}
          <div className="md:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full" data-testid="select-dashboard-section">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profile" data-testid="select-option-profile">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    <span>Profile</span>
                  </div>
                </SelectItem>
                {(vendor.capabilities as any)?.products && (
                  <SelectItem value="products" data-testid="select-option-products">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      <span>Products ({products.length})</span>
                    </div>
                  </SelectItem>
                )}
                {(vendor.capabilities as any)?.menu && (
                  <SelectItem value="menu" data-testid="select-option-menu">
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4" />
                      <span>Menu ({menuItems.length})</span>
                    </div>
                  </SelectItem>
                )}
                <SelectItem value="deals" data-testid="select-option-deals">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <span>Deals ({deals.length})</span>
                  </div>
                </SelectItem>
                <SelectItem value="faqs" data-testid="select-option-faqs">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    <span>FAQs ({faqs.length})</span>
                  </div>
                </SelectItem>
                <SelectItem value="settings" data-testid="select-option-settings">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </div>
                </SelectItem>
                <SelectItem value="messages" data-testid="select-option-messages">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Messages</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop TabsList */}
          <TabsList className="hidden md:inline-flex w-full">
            <TabsTrigger value="profile" className="gap-2" data-testid="tab-profile">
              <Store className="w-4 h-4" />
              Profile
            </TabsTrigger>
            {(vendor.capabilities as any)?.products && (
              <TabsTrigger value="products" className="gap-2" data-testid="tab-products">
                <Package className="w-4 h-4" />
                Products ({products.length})
              </TabsTrigger>
            )}
            {(vendor.capabilities as any)?.menu && (
              <TabsTrigger value="menu" className="gap-2" data-testid="tab-menu">
                <UtensilsCrossed className="w-4 h-4" />
                Menu ({menuItems.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="deals" className="gap-2" data-testid="tab-deals">
              <Tag className="w-4 h-4" />
              Deals ({deals.length})
            </TabsTrigger>
            <TabsTrigger value="faqs" className="gap-2" data-testid="tab-faqs">
              <HelpCircle className="w-4 h-4" />
              FAQs ({faqs.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2" data-testid="tab-messages">
              <MessageSquare className="w-4 h-4" />
              Messages
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

                <div className="space-y-2">
                  <Label htmlFor="contactName">Owner / Contact Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="contactName"
                    defaultValue={vendor.contactName || ""}
                    placeholder="e.g., Jane Smith"
                    data-testid="input-contact-name"
                    required
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (!value) {
                        toast({
                          title: "Contact name required",
                          description: "Please enter an owner or contact name for your business",
                          variant: "destructive",
                        });
                        return;
                      }
                      if (value !== vendor.contactName) {
                        updateVendorMutation.mutate({ contactName: value });
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
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address (optional)</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2 (optional)</Label>
                  <Input
                    id="addressLine2"
                    defaultValue={(vendor as any).addressLine2 || ""}
                    placeholder="Suite, Apt, Floor"
                    data-testid="input-address-line-2"
                    onBlur={(e) => {
                      if (e.target.value !== (vendor as any).addressLine2) {
                        updateVendorMutation.mutate({ addressLine2: e.target.value });
                      }
                    }}
                  />
                </div>

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label htmlFor="contactPhone">Phone Number</Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      defaultValue={
                        typeof vendor.contact === 'object' && vendor.contact !== null && 'phone' in vendor.contact
                          ? (vendor.contact as any).phone || ""
                          : ""
                      }
                      placeholder="(239) 555-0123"
                      data-testid="input-contact-phone"
                      onBlur={(e) => {
                        const currentContact = typeof vendor.contact === 'object' && vendor.contact !== null 
                          ? vendor.contact as any 
                          : {};
                        const updatedContact = { ...currentContact, phone: e.target.value };
                        updateVendorMutation.mutate({ contact: updatedContact });
                      }}
                    />
                  </div>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tiktok">TikTok (optional)</Label>
                    <Input
                      id="tiktok"
                      defaultValue={vendor.tiktok || ""}
                      placeholder="@yourbusiness"
                      data-testid="input-tiktok"
                      onBlur={(e) => {
                        if (e.target.value !== vendor.tiktok) {
                          updateVendorMutation.mutate({ tiktok: e.target.value });
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="youtube">YouTube (optional)</Label>
                    <Input
                      id="youtube"
                      defaultValue={vendor.youtube || ""}
                      placeholder="@yourchannel"
                      data-testid="input-youtube"
                      onBlur={(e) => {
                        if (e.target.value !== vendor.youtube) {
                          updateVendorMutation.mutate({ youtube: e.target.value });
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter/X (optional)</Label>
                    <Input
                      id="twitter"
                      defaultValue={vendor.twitter || ""}
                      placeholder="@yourbusiness"
                      data-testid="input-twitter"
                      onBlur={(e) => {
                        if (e.target.value !== vendor.twitter) {
                          updateVendorMutation.mutate({ twitter: e.target.value });
                        }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Menu Options Section - Only for dine vendors */}
            {vendor.vendorType === "dine" && (
              <Card>
                <CardHeader>
                  <CardTitle>Menu Options</CardTitle>
                  <CardDescription>Share your menu with customers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="menuUrl">Menu Link (optional)</Label>
                    <Input
                      id="menuUrl"
                      type="url"
                      defaultValue={vendor.menuUrl || ""}
                      placeholder="https://yourmenu.com or ToastTab link"
                      data-testid="input-menu-url"
                      onBlur={(e) => {
                        if (e.target.value !== vendor.menuUrl) {
                          updateVendorMutation.mutate({ 
                            menuUrl: e.target.value,
                            menuType: e.target.value ? "link" : null
                          });
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Link to your online menu (ToastTab, Square, PDF, or your website)
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Business Hours Section */}
            <Card>
              <CardHeader>
                <CardTitle>Business Hours</CardTitle>
                <CardDescription>Let customers know when you're available</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
                  return (
                    <div key={day} className="grid grid-cols-[120px_1fr] gap-4 items-center">
                      <Label htmlFor={`hours-${day}`} className="capitalize">{day}</Label>
                      <Input
                        id={`hours-${day}`}
                        value={localHours[day] || ""}
                        placeholder="e.g., 9:00 AM - 5:00 PM or Closed"
                        data-testid={`input-hours-${day}`}
                        onChange={(e) => {
                          const updatedHours = { ...localHours, [day]: e.target.value };
                          setLocalHours(updatedHours);
                        }}
                        onBlur={(e) => {
                          const updatedHours = { ...localHours, [day]: e.target.value };
                          if (e.target.value !== ((vendor.hours as any) || {})[day]) {
                            updateVendorMutation.mutate(
                              { hours: updatedHours },
                              {
                                onSuccess: () => {
                                  toast({
                                    title: "Hours updated",
                                    description: `Business hours for ${day} have been saved`,
                                  });
                                },
                                onError: () => {
                                  setLocalHours((vendor.hours as Record<string, string>) || {});
                                },
                              }
                            );
                          }
                        }}
                      />
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground pt-2">
                  Enter your operating hours for each day, or type "Closed" for days you're not open
                </p>
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
                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox
                      id="showLocalSourcing"
                      checked={showLocalSourcing}
                      onCheckedChange={(checked) => {
                        const newValue = checked === true;
                        setShowLocalSourcing(newValue);
                        updateVendorMutation.mutate({ showLocalSourcing: newValue });
                      }}
                      data-testid="checkbox-show-local-sourcing"
                    />
                    <Label htmlFor="showLocalSourcing" className="text-sm font-normal cursor-pointer">
                      Display local sourcing percentage on my public profile
                    </Label>
                  </div>
                  
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

            {/* Profile Photo/Logo & Banner Section */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Photo/Logo & Cover Banner</CardTitle>
                <CardDescription>Add visual branding to represent your business</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Profile Photo/Logo</Label>
                  <p className="text-sm text-muted-foreground mb-2">Square logo for profile display</p>
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
                </div>

                <div className="space-y-2">
                  <Label>Cover Photo/Banner</Label>
                  <p className="text-sm text-muted-foreground mb-2">Wide banner image for profile header</p>
                  <ImageUpload
                    currentImageUrl={vendor.bannerUrl}
                    onUploadComplete={(imageUrl) => {
                      updateVendorMutation.mutate({ bannerUrl: imageUrl });
                    }}
                    onRemove={() => {
                      updateVendorMutation.mutate({ bannerUrl: null });
                    }}
                    maxSizeMB={5}
                    aspectRatio="landscape"
                    disabled={updateVendorMutation.isPending}
                  />
                </div>
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

          {/* Menu Tab */}
          <TabsContent value="menu">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Menu Items</CardTitle>
                  <CardDescription>Manage your menu items and pricing</CardDescription>
                </div>
                <Dialog open={menuItemDialogOpen} onOpenChange={setMenuItemDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-menu-item">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Menu Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-[#222]">
                    <DialogHeader>
                      <DialogTitle className="text-[#222]">Add New Menu Item</DialogTitle>
                    </DialogHeader>
                    <AddMenuItemForm 
                      onSubmit={createMenuItemMutation.mutate}
                      isPending={createMenuItemMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {menuItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No menu items yet. Add your first menu item to showcase your offerings!</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {menuItems.map((item) => (
                      <Card key={item.id} className="border-muted" data-testid={`menu-item-${item.id}`}>
                        <CardContent className="p-4 space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold line-clamp-1">{item.name}</h3>
                              {item.isFeatured && (
                                <Badge variant="default" className="shrink-0">Featured</Badge>
                              )}
                            </div>
                            {item.category && (
                              <Badge variant="outline" className="text-xs">{item.category}</Badge>
                            )}
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                            )}
                          </div>
                          
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold" data-testid={`menu-item-price-${item.id}`}>
                              ${((item.priceCents || 0) / 100).toFixed(2)}
                            </span>
                          </div>

                          {item.dietaryTags && item.dietaryTags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.dietaryTags.map((tag: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Status:</span>
                              <Switch
                                checked={item.isAvailable === true}
                                onCheckedChange={(checked) => {
                                  updateMenuItemMutation.mutate({
                                    id: item.id,
                                    data: { isAvailable: checked }
                                  });
                                }}
                                data-testid={`switch-menu-item-status-${item.id}`}
                              />
                              <span className="text-xs">{item.isAvailable ? "Available" : "Unavailable"}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              data-testid={`button-edit-menu-item-${item.id}`}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => deleteMenuItemMutation.mutate(item.id)}
                              data-testid={`button-delete-menu-item-${item.id}`}
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

          {/* Deals Tab */}
          <TabsContent value="deals">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>Manage Deals</CardTitle>
                  <CardDescription>Create and manage special offers for your customers</CardDescription>
                </div>
                <Dialog open={dealDialogOpen} onOpenChange={(open) => {
                  setDealDialogOpen(open);
                  if (!open) setEditingDeal(null);
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-deal">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Deal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-[#222]">
                    <DialogHeader>
                      <DialogTitle className="text-[#222]">
                        {editingDeal ? "Edit Deal" : "Add New Deal"}
                      </DialogTitle>
                    </DialogHeader>
                    <DealForm 
                      onSubmit={(data) => {
                        if (editingDeal) {
                          updateDealMutation.mutate({ id: editingDeal.id, data });
                        } else {
                          createDealMutation.mutate(data);
                        }
                      }}
                      isPending={createDealMutation.isPending || updateDealMutation.isPending}
                      defaultValues={editingDeal || undefined}
                    />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {deals.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No deals yet. Create your first deal to attract more customers!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deals.map((deal) => (
                      <div key={deal.id} className="flex items-center justify-between border rounded-md p-4" data-testid={`deal-${deal.id}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{deal.title}</h3>
                            <Badge variant={deal.isActive ? "default" : "secondary"}>
                              {deal.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline">{deal.tier === "premium" ? "Premium" : "Free"}</Badge>
                            <Badge variant="outline">
                              {deal.dealType === "bogo" ? "BOGO" : deal.dealType === "percent" ? "% Off" : "Add-on"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{deal.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {deal.category && <span>{deal.category}</span>}
                            {deal.city && <span>{deal.city}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingDeal(deal);
                              setDealDialogOpen(true);
                            }}
                            data-testid={`button-edit-deal-${deal.id}`}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant={deal.isActive ? "secondary" : "default"}
                            size="sm"
                            onClick={() => toggleDealMutation.mutate({ id: deal.id, isActive: !deal.isActive })}
                            disabled={toggleDealMutation.isPending}
                            data-testid={`button-toggle-deal-${deal.id}`}
                          >
                            {deal.isActive ? "Deactivate" : "Activate"}
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
                  <Label htmlFor="vendorPin">Deal Redemption PIN</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    A 4-6 digit PIN used by staff to verify deal redemptions in-store
                  </p>
                  <Input
                    id="vendorPin"
                    type="password"
                    defaultValue={vendor.vendorPin || ""}
                    placeholder="Enter 4-6 digit PIN"
                    maxLength={6}
                    data-testid="input-vendor-pin"
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value && (value.length < 4 || value.length > 6 || !/^\d+$/.test(value))) {
                        return;
                      }
                      if (value !== vendor.vendorPin) {
                        updateVendorMutation.mutate({ vendorPin: value || null });
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

            <Card>
              <CardHeader>
                <CardTitle>Business Features</CardTitle>
                <CardDescription>Enable or disable features for your business</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="border border-[#E5E5E5] rounded-lg p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="products-capability" className="text-base font-semibold">Products</Label>
                    <p className="text-sm text-[#747474]">
                      Sell physical products with inventory, pricing, and variants
                    </p>
                  </div>
                  <Switch
                    id="products-capability"
                    checked={(vendor.capabilities as any)?.products === true}
                    onCheckedChange={(checked) => {
                      const currentCapabilities = (vendor.capabilities || {}) as any;
                      updateVendorMutation.mutate({ 
                        capabilities: { 
                          ...currentCapabilities, 
                          products: checked 
                        } 
                      });
                    }}
                    data-testid="switch-products-capability"
                  />
                </div>

                <div className="border border-[#E5E5E5] rounded-lg p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="services-capability" className="text-base font-semibold">Services</Label>
                    <p className="text-sm text-[#747474]">
                      Offer services with booking, pricing models, and scheduling
                    </p>
                  </div>
                  <Switch
                    id="services-capability"
                    checked={(vendor.capabilities as any)?.services === true}
                    onCheckedChange={(checked) => {
                      const currentCapabilities = (vendor.capabilities || {}) as any;
                      updateVendorMutation.mutate({ 
                        capabilities: { 
                          ...currentCapabilities, 
                          services: checked 
                        } 
                      });
                    }}
                    data-testid="switch-services-capability"
                  />
                </div>

                <div className="border border-[#E5E5E5] rounded-lg p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="menu-capability" className="text-base font-semibold">Menu</Label>
                    <p className="text-sm text-[#747474]">
                      Display menu items with categories, dietary info, and pricing
                    </p>
                  </div>
                  <Switch
                    id="menu-capability"
                    checked={(vendor.capabilities as any)?.menu === true}
                    onCheckedChange={(checked) => {
                      console.log('[MENU TOGGLE] Toggling menu capability to:', checked);
                      const currentCapabilities = (vendor.capabilities || {}) as any;
                      console.log('[MENU TOGGLE] Current capabilities:', currentCapabilities);
                      const newCapabilities = { 
                        ...currentCapabilities, 
                        menu: checked 
                      };
                      console.log('[MENU TOGGLE] New capabilities:', newCapabilities);
                      updateVendorMutation.mutate({ 
                        capabilities: newCapabilities
                      });
                    }}
                    disabled={updateVendorMutation.isPending}
                    data-testid="switch-menu-capability"
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Toggling features will show or hide the corresponding tabs in your dashboard. Your existing content will not be deleted.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Restaurant Settings - only show for dine vendors */}
            {vendor.vendorType === "dine" && (
              <Card>
                <CardHeader>
                  <CardTitle>Restaurant Settings</CardTitle>
                  <CardDescription>Configure reservations and deals for your restaurant</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Accept Reservations Toggle */}
                  <div className="border border-[#E5E5E5] rounded-lg p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="accept-reservations" className="text-base font-semibold">Accept Reservations through Rise Local</Label>
                      <p className="text-sm text-[#747474]">
                        When enabled, customers can see reservation options on your profile
                      </p>
                    </div>
                    <Switch
                      id="accept-reservations"
                      checked={(vendor.restaurantDetails as any)?.acceptReservations === true}
                      onCheckedChange={(checked) => {
                        const currentDetails = (vendor.restaurantDetails || {}) as any;
                        updateVendorMutation.mutate({ 
                          restaurantDetails: { 
                            ...currentDetails, 
                            acceptReservations: checked 
                          } 
                        });
                      }}
                      disabled={updateVendorMutation.isPending}
                      data-testid="switch-accept-reservations"
                    />
                  </div>

                  {/* Reservation System Dropdown - only show if reservations are enabled */}
                  {(vendor.restaurantDetails as any)?.acceptReservations && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="reservation-system">Reservation System</Label>
                        <Select
                          value={(vendor.restaurantDetails as any)?.reservationSystem || ""}
                          onValueChange={(value) => {
                            const currentDetails = (vendor.restaurantDetails || {}) as any;
                            updateVendorMutation.mutate({ 
                              restaurantDetails: { 
                                ...currentDetails, 
                                reservationSystem: value 
                              } 
                            });
                          }}
                        >
                          <SelectTrigger data-testid="select-reservation-system">
                            <SelectValue placeholder="Select reservation system" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OpenTable">OpenTable</SelectItem>
                            <SelectItem value="SevenRooms">SevenRooms</SelectItem>
                            <SelectItem value="Resy">Resy</SelectItem>
                            <SelectItem value="Website">Website</SelectItem>
                            <SelectItem value="Phone">Phone Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Reservation Link - show for all systems except Phone */}
                      {(vendor.restaurantDetails as any)?.reservationSystem && 
                       (vendor.restaurantDetails as any)?.reservationSystem !== "Phone" && (
                        <div className="space-y-2">
                          <Label htmlFor="reservation-link">Reservation Link</Label>
                          <p className="text-xs text-muted-foreground">
                            The URL where customers will book reservations
                          </p>
                          <Input
                            id="reservation-link"
                            defaultValue={(vendor.restaurantDetails as any)?.reservationLink || ""}
                            placeholder="https://opentable.com/your-restaurant"
                            data-testid="input-reservation-link"
                            onBlur={(e) => {
                              const value = e.target.value.trim();
                              const currentDetails = (vendor.restaurantDetails || {}) as any;
                              if (value !== currentDetails.reservationLink) {
                                updateVendorMutation.mutate({ 
                                  restaurantDetails: { 
                                    ...currentDetails, 
                                    reservationLink: value 
                                  } 
                                });
                              }
                            }}
                          />
                        </div>
                      )}
                    </>
                  )}

                  <Separator />

                  {/* Offer Deals Toggle */}
                  <div className="border border-[#E5E5E5] rounded-lg p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="offer-deals" className="text-base font-semibold">Offer Rise Local Deals</Label>
                      <p className="text-sm text-[#747474]">
                        Participate in Rise Local deals to attract more customers
                      </p>
                    </div>
                    <Switch
                      id="offer-deals"
                      checked={(vendor.restaurantDetails as any)?.offerDeals === true}
                      onCheckedChange={(checked) => {
                        const currentDetails = (vendor.restaurantDetails || {}) as any;
                        updateVendorMutation.mutate({ 
                          restaurantDetails: { 
                            ...currentDetails, 
                            offerDeals: checked 
                          } 
                        });
                      }}
                      disabled={updateVendorMutation.isPending}
                      data-testid="switch-offer-deals"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <VendorMessagesTab vendorId={vendor.id} isSubscribed={true} />
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
    </>
  );
}

// ========== FORM COMPONENTS ==========

function AddProductForm({ 
  onSubmit, 
  isPending, 
  onPreview,
}: { 
  onSubmit: (data: any) => void; 
  isPending: boolean; 
  onPreview: (data: any) => void;
}) {
  const [productTags, setProductTags] = useState<string[]>([]);
  
  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      stock: 0,
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
    const { price, ...rest } = data;
    
    // Clean up optional fields - remove empty strings and zero values for optional fields
    const cleanData: any = {
      name: rest.name,
      stock: rest.stock,
      priceCents: Math.round(price * 100),
      valueTags: productTags,
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

function DealForm({ 
  onSubmit, 
  isPending,
  defaultValues 
}: { 
  onSubmit: (data: z.infer<typeof dealFormSchema>) => void; 
  isPending: boolean;
  defaultValues?: Partial<z.infer<typeof dealFormSchema>>;
}) {
  const form = useForm<z.infer<typeof dealFormSchema>>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      title: defaultValues?.title || "",
      description: defaultValues?.description || "",
      category: defaultValues?.category || "",
      city: defaultValues?.city || "Fort Myers",
      tier: defaultValues?.tier || "free",
      dealType: defaultValues?.dealType || "bogo",
      isActive: defaultValues?.isActive ?? true,
    },
  });

  const handleSubmit = (data: z.infer<typeof dealFormSchema>) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deal Title *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Buy One Get One Free" {...field} data-testid="input-deal-title" />
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
                  placeholder="Describe your deal..."
                  rows={3}
                  {...field}
                  data-testid="input-deal-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dealType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deal Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-deal-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="bogo">Buy One Get One</SelectItem>
                    <SelectItem value="percent">Percentage Off</SelectItem>
                    <SelectItem value="addon">Free Add-on</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tier</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-deal-tier">
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-deal-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DEAL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-deal-city">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DEAL_CITIES.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Active</FormLabel>
                <FormDescription>
                  Make this deal visible to customers
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-deal-active"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isPending} data-testid="button-submit-deal">
            {isPending ? "Saving..." : defaultValues ? "Update Deal" : "Create Deal"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function AddMenuItemForm({ onSubmit, isPending }: { onSubmit: (data: any) => void; isPending: boolean }) {
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [valueTags, setValueTags] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  
  const form = useForm<z.infer<typeof menuItemFormSchema>>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      description: "",
      category: "",
      imageUrl: "",
      isAvailable: true,
      isFeatured: false,
      dietaryTags: [],
      valueTags: [],
      ingredients: "",
      allergens: [],
      isLocallySourced: false,
      sourceFarm: "",
    },
  });

  const handleSubmit = (data: z.infer<typeof menuItemFormSchema>) => {
    const { price, ...rest } = data;
    
    const cleanData: any = {
      name: rest.name,
      category: rest.category,
      priceCents: Math.round(price * 100),
      isAvailable: rest.isAvailable ?? true,
      isFeatured: rest.isFeatured ?? false,
      dietaryTags: dietaryTags,
      valueTags: valueTags,
      allergens: allergens,
    };
    
    if (rest.description) cleanData.description = rest.description;
    if (rest.imageUrl) cleanData.imageUrl = rest.imageUrl;
    if (rest.ingredients) cleanData.ingredients = rest.ingredients;
    if (rest.isLocallySourced) cleanData.isLocallySourced = rest.isLocallySourced;
    if (rest.sourceFarm) cleanData.sourceFarm = rest.sourceFarm;
    
    onSubmit(cleanData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Margherita Pizza" {...field} data-testid="input-menu-item-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-menu-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Appetizers">Appetizers</SelectItem>
                    <SelectItem value="Entrees">Entrees</SelectItem>
                    <SelectItem value="Sides">Sides</SelectItem>
                    <SelectItem value="Desserts">Desserts</SelectItem>
                    <SelectItem value="Drinks">Drinks</SelectItem>
                    <SelectItem value="Specials">Specials</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
                    placeholder="12.99"
                    value={field.value || ""}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    data-testid="input-menu-item-price"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the menu item..."
                  rows={3}
                  {...field}
                  value={field.value || ""}
                  data-testid="input-menu-item-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Label>Dietary Tags (optional)</Label>
          <TagInput
            tags={dietaryTags}
            onChange={setDietaryTags}
            placeholder="e.g., Vegan, Gluten-Free, Keto"
          />
        </div>

        <div className="space-y-2">
          <Label>Value Tags (optional)</Label>
          <TagInput
            tags={valueTags}
            onChange={setValueTags}
            placeholder="e.g., Local, Organic, Sustainable"
          />
        </div>

        <div className="space-y-2">
          <Label>Allergens (optional)</Label>
          <TagInput
            tags={allergens}
            onChange={setAllergens}
            placeholder="e.g., Nuts, Dairy, Gluten"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="isAvailable"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Available</FormLabel>
                  <FormDescription>Currently available to order</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-menu-item-available"
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
                  <FormLabel>Featured Item</FormLabel>
                  <FormDescription>Highlight on menu</FormDescription>
                </div>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-menu-item-featured"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isPending} data-testid="button-submit-menu-item">
            {isPending ? "Creating..." : "Create Menu Item"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function AddServiceForm({ onSubmit, isPending }: { onSubmit: (data: any) => void; isPending: boolean }) {
  const [serviceTags, setServiceTags] = useState<string[]>([]);
  
  const form = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      offeringName: "",
      description: "",
      pricingModel: "fixed",
      price: 0,
      hourlyRate: 0,
      durationMinutes: 0,
      tags: [],
      requirements: "",
      includes: "",
      isActive: true,
      isFeatured: false,
    },
  });

  const pricingModel = form.watch("pricingModel");

  const handleSubmit = (data: z.infer<typeof serviceFormSchema>) => {
    const { price, hourlyRate, ...rest } = data;
    
    const cleanData: any = {
      offeringName: rest.offeringName,
      description: rest.description,
      pricingModel: rest.pricingModel,
      isActive: rest.isActive ?? true,
      isFeatured: rest.isFeatured ?? false,
      tags: serviceTags,
    };
    
    if (rest.pricingModel === "fixed" && price) {
      cleanData.fixedPriceCents = Math.round(price * 100);
      cleanData.startingAtCents = Math.round(price * 100);
    }
    
    if (rest.pricingModel === "hourly" && hourlyRate) {
      cleanData.hourlyRateCents = Math.round(hourlyRate * 100);
      cleanData.startingAtCents = Math.round(hourlyRate * 100);
    }
    
    if (rest.pricingModel === "quote" && price) {
      cleanData.startingAtCents = Math.round(price * 100);
    }
    
    if (rest.durationMinutes && rest.durationMinutes > 0) cleanData.durationMinutes = rest.durationMinutes;
    if (rest.requirements) cleanData.requirements = rest.requirements;
    if (rest.includes) cleanData.includes = rest.includes;
    
    onSubmit(cleanData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit, (errors) => {
        console.error("❌ Service form validation errors:", errors);
        console.error("📝 Form values:", form.getValues());
      })} className="space-y-4">
        <FormField
          control={form.control}
          name="offeringName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Yoga Session" {...field} data-testid="input-service-name" />
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
                  placeholder="Describe your service..."
                  rows={3}
                  {...field}
                  data-testid="input-service-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pricingModel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pricing Model *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-pricing-model">
                    <SelectValue placeholder="Select pricing model" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                  <SelectItem value="hourly">Hourly Rate</SelectItem>
                  <SelectItem value="quote">Custom Quote</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {pricingModel === "fixed" && (
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fixed Price ($) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="50.00"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val === '' ? undefined : parseFloat(val));
                    }}
                    data-testid="input-service-price"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {pricingModel === "hourly" && (
          <FormField
            control={form.control}
            name="hourlyRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hourly Rate ($) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="75.00"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val === '' ? undefined : parseFloat(val));
                    }}
                    data-testid="input-service-hourly-rate"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {pricingModel === "quote" && (
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Starting At ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="100.00"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val === '' ? undefined : parseFloat(val));
                    }}
                    data-testid="input-service-starting-price"
                  />
                </FormControl>
                <FormDescription>Optional starting price for display</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="durationMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (minutes)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="60"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  data-testid="input-service-duration"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Label>Service Tags (optional)</Label>
          <TagInput
            tags={serviceTags}
            onChange={setServiceTags}
            placeholder="e.g., Wellness, Local, Certified"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Active</FormLabel>
                  <FormDescription>Available for booking</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-service-active"
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
                  <FormLabel>Featured Service</FormLabel>
                  <FormDescription>Highlight on profile</FormDescription>
                </div>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-service-featured"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isPending} data-testid="button-submit-service">
            {isPending ? "Creating..." : "Create Service"}
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

// ========== VENDOR MESSAGES TAB ==========

interface VendorConversation {
  id: number;
  consumerId: string;
  vendorId: string;
  dealId: number | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  consumerName?: string;
  dealTitle?: string;
  lastMessage?: string;
  unreadCount?: number;
}

interface VendorMessage {
  id: number;
  conversationId: number;
  senderId: string;
  senderRole: 'consumer' | 'vendor';
  content: string;
  sentAt: Date;
  senderName?: string;
}

function VendorMessagesTab({ vendorId, isSubscribed }: { vendorId: string; isSubscribed: boolean }) {
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<VendorConversation[]>({
    queryKey: ["/api/b2c/conversations"],
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery<{ messages: VendorMessage[]; canReply: boolean }>({
    queryKey: ["/api/b2c/conversations", selectedConversationId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/b2c/conversations/${selectedConversationId}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!selectedConversationId,
    refetchInterval: 5000,
  });

  const messages = messagesData?.messages || [];
  const canReply = true; // Always allow vendors to reply

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/b2c/conversations/${selectedConversationId}/messages`, { content });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/b2c/conversations", selectedConversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/b2c/conversations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    sendMessageMutation.mutate(messageInput.trim());
  };

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Customer Messages
        </CardTitle>
        <CardDescription>
          Respond to questions from customers about your deals
        </CardDescription>
      </CardHeader>
      <CardContent>
        {conversationsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No messages yet</h3>
            <p className="text-muted-foreground">
              When customers ask questions about your deals, they will appear here.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4 min-h-[400px]">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 p-3 border-b">
                <h4 className="font-medium text-sm">Conversations</h4>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={`w-full text-left p-3 border-b last:border-b-0 hover-elevate ${
                      selectedConversationId === conv.id ? 'bg-primary/10' : ''
                    }`}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm truncate">
                        {conv.consumerName || `Customer #${conv.consumerId.slice(0, 6)}`}
                      </span>
                      {conv.unreadCount && conv.unreadCount > 0 && (
                        <Badge variant="default" className="text-xs ml-auto">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {conv.dealTitle && (
                      <p className="text-xs text-muted-foreground truncate mb-1">
                        Re: {conv.dealTitle}
                      </p>
                    )}
                    {conv.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.lastMessage}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 border rounded-lg flex flex-col">
              {selectedConversationId ? (
                <>
                  <div className="bg-muted/50 p-3 border-b flex items-center gap-2">
                    <User className="w-5 h-5" />
                    <span className="font-medium">
                      {selectedConversation?.consumerName || `Customer #${selectedConversation?.consumerId.slice(0, 6)}`}
                    </span>
                    {selectedConversation?.dealTitle && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        {selectedConversation.dealTitle}
                      </Badge>
                    )}
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto max-h-[300px] space-y-3">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm">
                        No messages yet
                      </p>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.senderRole === 'vendor' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.senderRole === 'vendor'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${
                              msg.senderRole === 'vendor' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t p-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your reply..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        data-testid="input-message"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || sendMessageMutation.isPending}
                        data-testid="button-send-message"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                    <p>Select a conversation to view messages</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


