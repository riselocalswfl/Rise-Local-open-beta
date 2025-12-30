import { useState, useEffect } from "react";
import { Link } from "wouter";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Store, Package, HelpCircle, Settings, Plus, Eye, Upload, Image as ImageIcon, Trash2, Edit, AlertCircle, LogOut, UtensilsCrossed, Tag, MessageSquare, Lock, Send, User, Ticket, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Vendor, Product, Event, VendorFAQ, MenuItem, ServiceOffering, Deal } from "@shared/schema";
import { DEALS_QUERY_KEY } from "@/hooks/useDeals";
import { insertProductSchema, insertEventSchema, insertVendorFAQSchema, insertMenuItemSchema, insertServiceOfferingSchema, insertDealSchema } from "@shared/schema";
import { TagInput } from "@/components/TagInput";
import { ImageUpload } from "@/components/ImageUpload";
import Header from "@/components/Header";
import { VendorDealCard } from "@/components/VendorDealCard";
import { ProfileAccordionEditor, StickyActionBar } from "@/components/profile";
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
  finePrint: z.string().optional(),
  category: z.string().optional(),
  city: z.string().default("Fort Myers"),
  tier: z.enum(["standard", "member"]).default("standard"),
  dealType: z.enum(["bogo", "percent", "addon"]),
  discountType: z.enum(["percent", "dollar", "bogo", "free_item"]),
  discountValue: z.coerce.number().min(0).optional(),
  maxRedemptionsPerUser: z.coerce.number().int().min(1).default(1),
  cooldownHours: z.preprocess(
    (val) => val === "" || val === undefined ? undefined : Number(val),
    z.number().int().min(0).optional()
  ),
  maxRedemptionsTotal: z.preprocess(
    (val) => val === "" || val === undefined ? undefined : Number(val),
    z.number().int().min(0).optional()
  ),
  redemptionFrequency: z.enum(["once", "weekly", "monthly", "unlimited", "custom"]).default("weekly"),
  customRedemptionDays: z.preprocess(
    (val) => val === "" || val === undefined ? undefined : Number(val),
    z.number().int().min(1).max(365).optional()
  ),
  isActive: z.boolean().default(false),
  status: z.enum(["draft", "published", "paused", "expired"]).default("draft"),
  isPassLocked: z.boolean().default(false),
  imageUrl: z.string().optional(),
}).refine(
  (data) => {
    // Only require discountValue > 0 for percent and dollar types
    if (data.discountType === "percent" || data.discountType === "dollar") {
      return data.discountValue !== undefined && data.discountValue > 0;
    }
    // For bogo and free_item, value is not required (defaults to 0)
    return true;
  },
  {
    message: "Enter the discount amount",
    path: ["discountValue"],
  }
);

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
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<any>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);

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

  // Handle URL parameters for auto-opening dialogs
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const action = params.get("action");
    
    if (tab) {
      setActiveTab(tab);
    }
    
    // Auto-open deal creation dialog if action=create and on deals tab
    if (tab === "deals" && action === "create" && vendor) {
      setEditingDeal(null);
      setDealDialogOpen(true);
      // Clear the URL params after handling
      window.history.replaceState({}, "", window.location.pathname);
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

  // Fetch deals (includeAll=true to see drafts/paused deals for vendor management)
  const dealsFilters = { vendorId: vendor?.id, includeAll: true };
  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: [DEALS_QUERY_KEY, dealsFilters],
    queryFn: async () => {
      const res = await fetch(`/api/deals?vendorId=${vendor?.id}&includeAll=true`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deals");
      return res.json();
    },
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
      setProductDialogOpen(false);
      setEditingProduct(null);
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
      setMenuItemDialogOpen(false);
      setEditingMenuItem(null);
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
      setServiceDialogOpen(false);
      setEditingService(null);
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

  // Helper to invalidate all deal queries across the app
  const invalidateAllDealQueries = () => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0];
        return key === DEALS_QUERY_KEY || (typeof key === 'string' && (key.startsWith('/api/deals') || key.startsWith('/api/vendor/deals')));
      }
    });
  };

  // Deal Mutations - using vendor deal management endpoints
  const createDealMutation = useMutation({
    mutationFn: async (data: z.infer<typeof dealFormSchema>) => {
      if (!vendor?.id) throw new Error("No vendor ID");
      return await apiRequest("POST", "/api/vendor/deals", data);
    },
    onSuccess: () => {
      invalidateAllDealQueries();
      setDealDialogOpen(false);
      setEditingDeal(null);
      toast({ title: "Deal published!", description: "Your deal is now live and visible to shoppers" });
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
      return await apiRequest("PATCH", `/api/vendor/deals/${id}`, data);
    },
    onSuccess: () => {
      invalidateAllDealQueries();
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

  const publishDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return await apiRequest("POST", `/api/vendor/deals/${dealId}/publish`);
    },
    onSuccess: () => {
      invalidateAllDealQueries();
      toast({ title: "Deal published!", description: "Your deal is now live" });
    },
    onError: (error: any) => {
      console.error("Deal publish error:", error);
      toast({ 
        title: "Failed to publish deal", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const pauseDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return await apiRequest("POST", `/api/vendor/deals/${dealId}/pause`);
    },
    onSuccess: () => {
      invalidateAllDealQueries();
      toast({ title: "Deal paused" });
    },
    onError: (error: any) => {
      console.error("Deal pause error:", error);
      toast({ 
        title: "Failed to pause deal", 
        variant: "destructive" 
      });
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return await apiRequest("DELETE", `/api/vendor/deals/${dealId}`);
    },
    onSuccess: () => {
      invalidateAllDealQueries();
      toast({ title: "Deal deleted" });
    },
    onError: (error: any) => {
      console.error("Deal delete error:", error);
      toast({ 
        title: "Failed to delete deal", 
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
            <CardTitle className="text-section-header">Setting Up Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-body text-muted-foreground mb-4">
              Loading your business profile...
            </p>
            <p className="text-meta text-muted-foreground">
              If this persists, please contact support or complete the business onboarding process.
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
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
          {/* Mobile sticky header - title + dropdown */}
          <div className="md:hidden sticky top-0 z-40 bg-bg pt-2 pb-4 -mx-4 px-4 border-b border-border">
            <div className="mb-3">
              <h1 className="text-page-title text-xl mb-1" data-testid="heading-dashboard">Business Dashboard</h1>
              <p className="text-body text-muted-foreground text-sm">{vendor.businessName}</p>
            </div>
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger 
                className="w-full min-h-12 py-3 px-4 rounded-lg text-base font-medium [&>svg]:h-5 [&>svg]:w-5" 
                data-testid="select-dashboard-section"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)] max-h-[60vh] overflow-y-auto">
                <SelectItem value="profile" className="min-h-12 py-3 text-base" data-testid="select-option-profile">
                  <div className="flex items-center gap-3">
                    <Store className="w-5 h-5" />
                    <span>Profile</span>
                  </div>
                </SelectItem>
                {(vendor.capabilities as any)?.menu && (
                  <SelectItem value="menu" className="min-h-12 py-3 text-base" data-testid="select-option-menu">
                    <div className="flex items-center gap-3">
                      <UtensilsCrossed className="w-5 h-5" />
                      <span>Menu ({menuItems.length})</span>
                    </div>
                  </SelectItem>
                )}
                <SelectItem value="deals" className="min-h-12 py-3 text-base" data-testid="select-option-deals">
                  <div className="flex items-center gap-3">
                    <Tag className="w-5 h-5" />
                    <span>Deals ({deals.length})</span>
                  </div>
                </SelectItem>
                <SelectItem value="faqs" className="min-h-12 py-3 text-base" data-testid="select-option-faqs">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5" />
                    <span>FAQs ({faqs.length})</span>
                  </div>
                </SelectItem>
                <SelectItem value="settings" className="min-h-12 py-3 text-base" data-testid="select-option-settings">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </div>
                </SelectItem>
                <SelectItem value="verify" className="min-h-12 py-3 text-base" data-testid="select-option-verify">
                  <div className="flex items-center gap-3">
                    <Ticket className="w-5 h-5" />
                    <span>Redemptions</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop header */}
          <div className="hidden md:block mb-8">
            <h1 className="text-page-title text-2xl md:text-3xl mb-2" data-testid="heading-dashboard-desktop">Business Dashboard</h1>
            <p className="text-body text-muted-foreground">{vendor.businessName}</p>
          </div>


        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 mt-4 md:mt-0">
          {/* Desktop TabsList */}
          <TabsList className="hidden md:inline-flex w-full">
            <TabsTrigger value="profile" className="gap-2" data-testid="tab-profile">
              <Store className="w-4 h-4" />
              Profile
            </TabsTrigger>
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
            <TabsTrigger value="verify" className="gap-2" data-testid="tab-verify">
              <Ticket className="w-4 h-4" />
              Redemptions
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab - Mobile-First Accordion Layout */}
          <TabsContent value="profile" className="pb-20 md:pb-6">
            <div className="mb-4 hidden md:flex justify-end gap-3">
              <Link href={`/businesses/${vendor.id}`}>
                <Button variant="outline" data-testid="button-preview-profile-desktop">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Public Profile
                </Button>
              </Link>
            </div>
            
            <ProfileAccordionEditor
              vendor={vendor}
              onFieldChange={(updates) => {
                setProfileDirty(true);
                updateVendorMutation.mutate(updates as any, {
                  onSuccess: () => {
                    setProfileDirty(false);
                    setShowSaved(true);
                    setTimeout(() => setShowSaved(false), 2000);
                    toast({ title: "Profile updated" });
                  },
                  onError: () => {
                    toast({ 
                      title: "Failed to save", 
                      description: "Please try again",
                      variant: "destructive" 
                    });
                  },
                });
              }}
              isSaving={updateVendorMutation.isPending}
            />

            {/* Menu Options Section - Only for dine vendors */}
            {vendor.vendorType === "dine" && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-section-header">Menu Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="menuUrl">Menu Link</Label>
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
                      Link to your online menu (ToastTab, Square, PDF, or website)
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mobile Sticky Action Bar */}
            <StickyActionBar
              vendorId={vendor.id}
              isDirty={profileDirty}
              isSaving={updateVendorMutation.isPending}
              showSaved={showSaved}
              onSave={() => {
                toast({ title: "Changes saved automatically" });
              }}
            />
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-section-header">Menu Items</CardTitle>
                  <CardDescription className="text-body">Manage your menu items and pricing</CardDescription>
                </div>
                <Dialog open={menuItemDialogOpen} onOpenChange={(open) => {
                  setMenuItemDialogOpen(open);
                  if (!open) setEditingMenuItem(null);
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-menu-item">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Menu Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-[#222]">
                    <DialogHeader>
                      <DialogTitle className="text-[#222]">
                        {editingMenuItem ? "Edit Menu Item" : "Add New Menu Item"}
                      </DialogTitle>
                    </DialogHeader>
                    <AddMenuItemForm 
                      onSubmit={(data) => {
                        if (editingMenuItem) {
                          updateMenuItemMutation.mutate({ id: editingMenuItem.id, data });
                        } else {
                          createMenuItemMutation.mutate(data);
                        }
                      }}
                      isPending={createMenuItemMutation.isPending || updateMenuItemMutation.isPending}
                      defaultValues={editingMenuItem || undefined}
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
                              <h3 className="text-deal-title line-clamp-1">{item.name}</h3>
                              {item.isFeatured && (
                                <Badge variant="default" className="shrink-0">Featured</Badge>
                              )}
                            </div>
                            {item.category && (
                              <Badge variant="outline" className="text-xs">{item.category}</Badge>
                            )}
                            {item.description && (
                              <p className="text-body text-muted-foreground line-clamp-2">{item.description}</p>
                            )}
                          </div>
                          
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-semibold" data-testid={`menu-item-price-${item.id}`}>
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
                              onClick={() => {
                                setEditingMenuItem(item);
                                setMenuItemDialogOpen(true);
                              }}
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
            <Card className="overflow-x-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-section-header">Manage Deals</CardTitle>
                  <CardDescription className="text-body">Create and manage special offers for your customers</CardDescription>
                </div>
                <Dialog open={dealDialogOpen} onOpenChange={(open) => {
                  setDealDialogOpen(open);
                  if (!open) setEditingDeal(null);
                }}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto h-11 sm:h-9" data-testid="button-add-deal">
                      <Plus className="w-4 h-4 mr-2" />
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
              <CardContent className="px-4">
                {deals.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No deals yet. Create your first deal to attract more customers!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deals.map((deal) => (
                      <VendorDealCard
                        key={deal.id}
                        deal={deal}
                        onEdit={(d) => {
                          setEditingDeal(d);
                          setDealDialogOpen(true);
                        }}
                        onPublish={(id) => publishDealMutation.mutate(id)}
                        onPause={(id) => pauseDealMutation.mutate(id)}
                        onDelete={(id) => deleteDealMutation.mutate(id)}
                        isPublishing={publishDealMutation.isPending}
                        isPausing={pauseDealMutation.isPending}
                        isDeleting={deleteDealMutation.isPending}
                      />
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
                <CardTitle className="text-section-header">Manage FAQs</CardTitle>
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
                            <h3 className="text-deal-title mb-2">{faq.question}</h3>
                            <p className="text-body text-muted-foreground">{faq.answer}</p>
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
                <CardTitle className="text-section-header">Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vendorType" className="text-label">Business Type</Label>
                  <p className="text-meta text-muted-foreground mb-2">
                    This determines how your business is categorized in the app
                  </p>
                  <Select
                    value={vendor.vendorType || "shop"}
                    onValueChange={(value) => {
                      if (value !== vendor.vendorType) {
                        updateVendorMutation.mutate({ vendorType: value as "shop" | "dine" | "service" });
                      }
                    }}
                  >
                    <SelectTrigger id="vendorType" data-testid="select-vendor-type">
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shop">Shop</SelectItem>
                      <SelectItem value="dine">Dine</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="my-4" />

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

            <Card>
              <CardHeader>
                <CardTitle className="text-section-header">Business Features</CardTitle>
                <CardDescription className="text-body">Enable or disable features for your business</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="border border-[#E5E5E5] rounded-lg p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="services-capability" className="text-label">Services</Label>
                    <p className="text-body text-muted-foreground">
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
                    <Label htmlFor="menu-capability" className="text-label">Menu</Label>
                    <p className="text-body text-muted-foreground">
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
                  <CardTitle className="text-section-header">Restaurant Settings</CardTitle>
                  <CardDescription className="text-body">Configure reservations and deals for your restaurant</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Accept Reservations Toggle */}
                  <div className="border border-[#E5E5E5] rounded-lg p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="accept-reservations" className="text-label">Accept Reservations through Rise Local</Label>
                      <p className="text-body text-muted-foreground">
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
                      <Label htmlFor="offer-deals" className="text-label">Offer Rise Local Deals</Label>
                      <p className="text-body text-muted-foreground">
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

            {/* Profile Visibility Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-section-header">Profile Visibility</CardTitle>
                <CardDescription className="text-body">Control whether your business is visible to the public</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="border border-[#E5E5E5] rounded-lg p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="profile-visibility" className="text-label">Show Profile Publicly</Label>
                    <p className="text-body text-muted-foreground">
                      When disabled, your business profile and deals will be hidden from public listings. You can still access your dashboard and manage your business.
                    </p>
                  </div>
                  <Switch
                    id="profile-visibility"
                    checked={vendor.isProfileVisible !== false}
                    onCheckedChange={(checked) => {
                      updateVendorMutation.mutate({ isProfileVisible: checked });
                    }}
                    disabled={updateVendorMutation.isPending}
                    data-testid="switch-profile-visibility"
                  />
                </div>
                {vendor.isProfileVisible === false && (
                  <Alert variant="default" className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      Your profile is currently hidden from public view. Toggle the switch above to make it visible again.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="verify">
            <VerifyCodeTab />
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
  defaultValues,
}: { 
  onSubmit: (data: any) => void; 
  isPending: boolean; 
  onPreview: (data: any) => void;
  defaultValues?: any;
}) {
  const [productTags, setProductTags] = useState<string[]>(defaultValues?.valueTags || []);
  
  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      price: defaultValues?.priceCents ? defaultValues.priceCents / 100 : 0,
      stock: defaultValues?.stock || 0,
      description: defaultValues?.description || "",
      imageUrl: defaultValues?.imageUrl || "",
      unitType: defaultValues?.unitType || "per item",
      status: defaultValues?.status || "active",
      isFeatured: defaultValues?.isFeatured ?? false,
      valueTags: defaultValues?.valueTags || [],
      sourceFarm: defaultValues?.sourceFarm || "",
      harvestDate: defaultValues?.harvestDate || "",
      leadTimeDays: defaultValues?.leadTimeDays || 0,
      inventoryStatus: defaultValues?.inventoryStatus || "in_stock",
    },
  });

  useEffect(() => {
    if (defaultValues) {
      setProductTags(defaultValues.valueTags || []);
    }
  }, [defaultValues]);

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
            {isPending ? "Saving..." : defaultValues ? "Update Product" : "Create Product"}
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

type DealFormValues = z.infer<typeof dealFormSchema>;

function DealForm({ 
  onSubmit, 
  isPending,
  defaultValues 
}: { 
  onSubmit: (data: DealFormValues) => void; 
  isPending: boolean;
  defaultValues?: Deal | null;
}) {
  const validTiers: DealFormValues["tier"][] = ["standard", "member"];
  // Map legacy "free" tier to "standard"
  const mappedTier = defaultValues?.tier === "free" ? "standard" : defaultValues?.tier;
  const defaultTier: DealFormValues["tier"] = mappedTier && validTiers.includes(mappedTier as any) 
    ? mappedTier as DealFormValues["tier"]
    : "standard";
  
  const validStatuses: DealFormValues["status"][] = ["draft", "published", "paused", "expired"];
  const defaultStatus: DealFormValues["status"] = defaultValues?.status && validStatuses.includes(defaultValues.status as any)
    ? defaultValues.status as DealFormValues["status"]
    : "draft";

  const validDealTypes: DealFormValues["dealType"][] = ["bogo", "percent", "addon"];
  const defaultDealType: DealFormValues["dealType"] = defaultValues?.dealType && validDealTypes.includes(defaultValues.dealType as any)
    ? defaultValues.dealType as DealFormValues["dealType"]
    : "bogo";

  const validDiscountTypes: DealFormValues["discountType"][] = ["percent", "dollar", "bogo", "free_item"];
  // Map legacy "fixed" type to "dollar"
  const mappedDiscountType = defaultValues?.discountType === "fixed" ? "dollar" : defaultValues?.discountType;
  const defaultDiscountType: DealFormValues["discountType"] = mappedDiscountType && validDiscountTypes.includes(mappedDiscountType as any)
    ? mappedDiscountType as DealFormValues["discountType"]
    : "dollar";

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      title: defaultValues?.title || "",
      description: defaultValues?.description || "",
      finePrint: defaultValues?.finePrint || "",
      category: defaultValues?.category || "",
      city: defaultValues?.city || "Fort Myers",
      tier: defaultTier,
      dealType: defaultDealType,
      discountType: defaultDiscountType,
      discountValue: defaultValues?.discountValue || undefined,
      maxRedemptionsPerUser: defaultValues?.maxRedemptionsPerUser || 1,
      cooldownHours: defaultValues?.cooldownHours || undefined,
      maxRedemptionsTotal: defaultValues?.maxRedemptionsTotal || undefined,
      redemptionFrequency: (defaultValues?.redemptionFrequency as "once" | "weekly" | "monthly" | "unlimited" | "custom") || "weekly",
      customRedemptionDays: defaultValues?.customRedemptionDays || undefined,
      isActive: defaultValues?.isActive ?? false,
      status: defaultStatus,
      isPassLocked: defaultValues?.isPassLocked ?? false,
      imageUrl: defaultValues?.imageUrl || "",
    },
  });

  const handleSubmit = (data: z.infer<typeof dealFormSchema>) => {
    // Sync isPassLocked with tier selection - member tier means pass locked
    const syncedData = {
      ...data,
      isPassLocked: data.tier === "member",
    };
    onSubmit(syncedData);
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

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deal Photo</FormLabel>
              <FormDescription>
                Add a photo to make your deal stand out (vertical or horizontal)
              </FormDescription>
              <FormControl>
                <ImageUpload
                  currentImageUrl={field.value || null}
                  onUploadComplete={(url) => {
                    field.onChange(url);
                  }}
                  onRemove={() => {
                    field.onChange("");
                  }}
                  aspectRatio="flexible"
                  maxSizeMB={5}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="discountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-discount-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="percent">Percentage Off</SelectItem>
                    <SelectItem value="dollar">Dollar Amount Off</SelectItem>
                    <SelectItem value="bogo">Buy One Get One</SelectItem>
                    <SelectItem value="free_item">Free Item</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discountValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {form.watch("discountType") === "percent" ? "Percentage Off" : "Dollar Amount"}
                  {(form.watch("discountType") === "percent" || form.watch("discountType") === "dollar") && " *"}
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder={form.watch("discountType") === "percent" ? "e.g., 20" : "e.g., 10"}
                    {...field} 
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}
                    disabled={form.watch("discountType") === "bogo" || form.watch("discountType") === "free_item"}
                    data-testid="input-discount-value" 
                  />
                </FormControl>
                <FormDescription>
                  {form.watch("discountType") === "percent" 
                    ? "Shows as 'Save X%' on deal cards" 
                    : form.watch("discountType") === "dollar"
                    ? "Shows as 'Save $X' on deal cards"
                    : "Not applicable for this deal type"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dealType"
          render={({ field }) => (
            <FormItem className="hidden">
              <FormControl>
                <Input type="hidden" {...field} value={
                  form.watch("discountType") === "bogo" ? "bogo" : 
                  form.watch("discountType") === "percent" ? "percent" : "addon"
                } />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="finePrint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fine Print</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any terms or restrictions..."
                  rows={2}
                  {...field}
                  data-testid="input-deal-fine-print"
                />
              </FormControl>
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
                  <SelectItem value="standard">Available to All</SelectItem>
                  <SelectItem value="member">Members Only</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <FormField
          control={form.control}
          name="redemptionFrequency"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Redemption Limit</FormLabel>
              <FormDescription>
                How often can each customer use this deal?
              </FormDescription>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-2"
                  data-testid="radio-redemption-frequency"
                >
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="once" id="frequency-once" data-testid="radio-once" />
                    <Label htmlFor="frequency-once" className="font-normal cursor-pointer">
                      One time only
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="weekly" id="frequency-weekly" data-testid="radio-weekly" />
                    <Label htmlFor="frequency-weekly" className="font-normal cursor-pointer">
                      Once per week
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="monthly" id="frequency-monthly" data-testid="radio-monthly" />
                    <Label htmlFor="frequency-monthly" className="font-normal cursor-pointer">
                      Once per month
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="unlimited" id="frequency-unlimited" data-testid="radio-unlimited" />
                    <Label htmlFor="frequency-unlimited" className="font-normal cursor-pointer">
                      Unlimited redemptions
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="custom" id="frequency-custom" data-testid="radio-custom" />
                    <Label htmlFor="frequency-custom" className="font-normal cursor-pointer">
                      Other (custom days)
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch("redemptionFrequency") === "custom" && (
          <FormField
            control={form.control}
            name="customRedemptionDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom redemption window (days)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    placeholder="e.g., 14 for once every 2 weeks"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    data-testid="input-custom-redemption-days"
                  />
                </FormControl>
                <FormDescription>
                  Customer can redeem again after this many days
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Separator />

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
            render={({ field }) => {
              const selectedCities = field.value ? field.value.split(", ").filter(Boolean) : [];
              const toggleCity = (city: string) => {
                const newCities = selectedCities.includes(city)
                  ? selectedCities.filter(c => c !== city)
                  : [...selectedCities, city];
                field.onChange(newCities.length > 0 ? newCities.join(", ") : "");
              };
              return (
                <FormItem>
                  <FormLabel>Cities</FormLabel>
                  <div className="grid grid-cols-1 gap-1.5 border rounded-md p-2" data-testid="city-multi-select">
                    {DEAL_CITIES.map((city) => (
                      <label 
                        key={city} 
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
                      >
                        <Checkbox
                          checked={selectedCities.includes(city)}
                          onCheckedChange={() => toggleCity(city)}
                          data-testid={`checkbox-city-${city.toLowerCase().replace(/\s/g, '-')}`}
                        />
                        <span className="text-sm">{city}</span>
                      </label>
                    ))}
                  </div>
                  <FormDescription className="text-xs">Select one or more cities where this deal applies</FormDescription>
                  <FormMessage />
                </FormItem>
              );
            }}
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

function AddMenuItemForm({ onSubmit, isPending, defaultValues }: { onSubmit: (data: any) => void; isPending: boolean; defaultValues?: any }) {
  const [dietaryTags, setDietaryTags] = useState<string[]>(defaultValues?.dietaryTags || []);
  const [valueTags, setValueTags] = useState<string[]>(defaultValues?.valueTags || []);
  const [allergens, setAllergens] = useState<string[]>(defaultValues?.allergens || []);
  
  const form = useForm<z.infer<typeof menuItemFormSchema>>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      price: defaultValues?.priceCents ? defaultValues.priceCents / 100 : 0,
      description: defaultValues?.description || "",
      category: defaultValues?.category || "",
      imageUrl: defaultValues?.imageUrl || "",
      isAvailable: defaultValues?.isAvailable ?? true,
      isFeatured: defaultValues?.isFeatured ?? false,
      dietaryTags: defaultValues?.dietaryTags || [],
      valueTags: defaultValues?.valueTags || [],
      ingredients: defaultValues?.ingredients || "",
      allergens: defaultValues?.allergens || [],
      isLocallySourced: defaultValues?.isLocallySourced ?? false,
      sourceFarm: defaultValues?.sourceFarm || "",
    },
  });

  useEffect(() => {
    if (defaultValues) {
      setDietaryTags(defaultValues.dietaryTags || []);
      setValueTags(defaultValues.valueTags || []);
      setAllergens(defaultValues.allergens || []);
    }
  }, [defaultValues]);

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
            {isPending ? "Saving..." : defaultValues ? "Update Menu Item" : "Create Menu Item"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function AddServiceForm({ onSubmit, isPending, defaultValues }: { onSubmit: (data: any) => void; isPending: boolean; defaultValues?: any }) {
  const [serviceTags, setServiceTags] = useState<string[]>(defaultValues?.tags || []);
  
  const form = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      offeringName: defaultValues?.offeringName || "",
      description: defaultValues?.description || "",
      pricingModel: defaultValues?.pricingModel || "fixed",
      price: defaultValues?.fixedPriceCents ? defaultValues.fixedPriceCents / 100 : 0,
      hourlyRate: defaultValues?.hourlyRateCents ? defaultValues.hourlyRateCents / 100 : 0,
      durationMinutes: defaultValues?.durationMinutes || 0,
      tags: defaultValues?.tags || [],
      requirements: defaultValues?.requirements || "",
      includes: defaultValues?.includes || "",
      isActive: defaultValues?.isActive ?? true,
      isFeatured: defaultValues?.isFeatured ?? false,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      setServiceTags(defaultValues.tags || []);
    }
  }, [defaultValues]);

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
            {isPending ? "Saving..." : defaultValues ? "Update Service" : "Create Service"}
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

// ========== VERIFY CODE TAB ==========

interface BusinessRedemption {
  id: string;
  dealId: string;
  dealTitle: string;
  customerId: string | null;
  customerName: string;
  customerEmail?: string | null;
  redeemedAt: string;
  status: string;
  source?: string | null;
}

function VerifyCodeTab() {
  const { data: redemptions = [], isLoading: redemptionsLoading, isError: redemptionsError } = useQuery<BusinessRedemption[]>({
    queryKey: ["/api/business/redemptions"],
    queryFn: async () => {
      const res = await fetch("/api/business/redemptions?limit=20", {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch redemptions");
      return res.json();
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-section-header flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Redemption History
          </CardTitle>
          <CardDescription className="text-body">
            Track deals redeemed by your customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {redemptionsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : redemptionsError ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">Unable to load redemption history</p>
              <p className="text-sm text-muted-foreground">
                Please try again later
              </p>
            </div>
          ) : redemptions.length > 0 ? (
            <div className="space-y-3">
              {redemptions.map((redemption) => (
                <div
                  key={redemption.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                  data-testid={`redemption-row-${redemption.id}`}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Ticket className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{redemption.dealTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {redemption.customerName}
                      {redemption.customerEmail && ` • ${redemption.customerEmail}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge variant="outline" className="text-xs mb-1">
                      {redemption.source === "web" ? "App" : redemption.source || "Used"}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(redemption.redeemedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Ticket className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No redemptions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Customer redemptions will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
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
        <CardTitle className="text-section-header flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Customer Messages
        </CardTitle>
        <CardDescription className="text-body">
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
            <h3 className="text-deal-title mb-2">No messages yet</h3>
            <p className="text-body text-muted-foreground">
              When customers ask questions about your deals, they will appear here.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4 min-h-[400px]">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 p-3 border-b">
                <h4 className="text-body font-medium">Conversations</h4>
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
                      <span className="text-body font-medium truncate">
                        {conv.consumerName || `Customer #${conv.consumerId.slice(0, 6)}`}
                      </span>
                      {conv.unreadCount && conv.unreadCount > 0 && (
                        <Badge variant="default" className="ml-auto">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {conv.dealTitle && (
                      <p className="text-meta text-muted-foreground truncate mb-1">
                        Re: {conv.dealTitle}
                      </p>
                    )}
                    {conv.lastMessage && (
                      <p className="text-meta text-muted-foreground truncate">
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
                    <span className="text-deal-title">
                      {selectedConversation?.consumerName || `Customer #${selectedConversation?.consumerId.slice(0, 6)}`}
                    </span>
                    {selectedConversation?.dealTitle && (
                      <Badge variant="outline" className="ml-auto">
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
                      <p className="text-center text-body text-muted-foreground">
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
                            <p className="text-body">{msg.content}</p>
                            <p className={`text-meta mt-1 ${
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
                    <p className="text-body">Select a conversation to view messages</p>
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


