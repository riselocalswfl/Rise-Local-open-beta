import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Store, CheckCircle2, ArrowRight, ArrowLeft, CloudUpload, Check, Clock, MapPin, Image, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { FulfillmentEditor } from "@/components/FulfillmentEditor";
import { ImageUpload } from "@/components/ImageUpload";
import type { FulfillmentOptions, Category } from "@shared/schema";

// Step 1: Business Basics + Vendor Type
const step1Schema = z.object({
  vendorType: z.enum(["shop", "dine", "service"], { required_error: "Please select a business type" }),
  categoryId: z.string().optional(),
  businessName: z.string().min(1, "Business name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  city: z.string().min(1, "City is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  bio: z.string().min(10, "Please provide at least 10 characters"),
});

// Step 2: Business Details (dynamic based on vendorType)
const step2BaseSchema = z.object({
  tagline: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
});

const shopDetailsSchema = step2BaseSchema.extend({
  localSourcingPercent: z.number().min(0).max(100).optional(),
  showLocalSourcing: z.boolean().optional(),
});

const dineDetailsSchema = step2BaseSchema.extend({
  priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).optional(),
  dietaryOptions: z.array(z.string()).optional(),
  seatingCapacity: z.coerce.number().min(1).optional().or(z.literal("")),
  reservationsRequired: z.boolean().default(false),
});

const serviceDetailsSchema = step2BaseSchema.extend({
  serviceAreas: z.array(z.string()).optional(),
  yearsInBusiness: z.preprocess(
    (val) => val === "" || val === null || val === undefined ? undefined : Number(val),
    z.number().min(0).optional()
  ),
  certifications: z.string().optional(),
});

// Step 3: Payment & Fulfillment
const step3Schema = z.object({
  paymentMethods: z.array(z.string()).min(1, "Select at least one payment method"),
  fulfillmentMethods: z.any().optional(),
});

// Step 4: Hours, Address & Images
const step4Schema = z.object({
  address: z.string().optional(),
  hours: z.object({
    monday: z.string().optional(),
    tuesday: z.string().optional(),
    wednesday: z.string().optional(),
    thursday: z.string().optional(),
    friday: z.string().optional(),
    saturday: z.string().optional(),
    sunday: z.string().optional(),
  }).optional(),
});

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

const PAYMENT_METHOD_OPTIONS = [
  "Credit/Debit Card",
  "Cash",
  "Venmo",
  "PayPal",
  "Zelle",
  "CashApp",
];

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Nut-Free",
];

const SERVICE_AREA_OPTIONS = [
  "Fort Myers",
  "Cape Coral",
  "Bonita Springs",
  "Naples",
  "Lehigh Acres",
];

export default function UnifiedOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedVendorType, setSelectedVendorType] = useState<"shop" | "dine" | "service" | null>(null);

  // Fetch categories from API - single source of truth
  const { 
    data: categoriesData, 
    isLoading: categoriesLoading, 
    isError: categoriesError,
    refetch: refetchCategories 
  } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-save state
  const [draftVendorId, setDraftVendorId] = useState<string | null>(() => {
    // Initialize from sessionStorage if available
    return sessionStorage.getItem("onboardingDraftId");
  });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Helper function to update draftVendorId with sessionStorage persistence
  const updateDraftVendorId = (id: string | null) => {
    setDraftVendorId(id);
    if (id) {
      sessionStorage.setItem("onboardingDraftId", id);
    } else {
      sessionStorage.removeItem("onboardingDraftId");
    }
  };

  // Vendor completion mutation with centralized cache invalidation
  const completeMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      const response = await fetch(`/api/vendors/${vendorId}/complete`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to complete onboarding");
      }
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate all vendor-related caches AND user auth cache to ensure routing sees updated onboardingComplete
      // Await all invalidations to complete before navigating
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/vendors"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/auth/my-vendor"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/products-with-vendors"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/services"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/events-with-organizers"] }),
      ]);
      
      toast({
        title: "Welcome to Rise Local!",
        description: "Your vendor profile has been created successfully.",
      });

      // Clear the draft ID from sessionStorage
      sessionStorage.removeItem("onboardingDraftId");

      // Small delay so user can see the success message, then navigate
      setTimeout(() => {
        setLocation("/dashboard");
      }, 1500);
    },
    onError: (error: Error) => {
      console.error("Onboarding completion error:", error);
      toast({
        title: "Submission failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  // Step 1 Form
  const form1 = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      vendorType: undefined,
      categoryId: "",
      businessName: "",
      contactName: "",
      email: "",
      phone: "",
      city: "Fort Myers",
      zipCode: "",
      bio: "",
    },
  });

  // Watch vendor type selection to show type-specific fields in Step 2
  const watchVendorType = form1.watch("vendorType");
  useEffect(() => {
    if (watchVendorType) {
      setSelectedVendorType(watchVendorType as "shop" | "dine" | "service");
    }
  }, [watchVendorType]);

  // Step 2 Form (dynamic schema based on vendor type)
  const getStep2Schema = () => {
    if (selectedVendorType === "shop") return shopDetailsSchema;
    if (selectedVendorType === "dine") return dineDetailsSchema;
    if (selectedVendorType === "service") return serviceDetailsSchema;
    return step2BaseSchema;
  };

  const form2 = useForm({
    resolver: zodResolver(getStep2Schema()),
    defaultValues: {
      tagline: "",
      website: "",
      instagram: "",
      facebook: "",
      // Shop-specific
      localSourcingPercent: 50,
      showLocalSourcing: false,
      // Dine-specific
      priceRange: undefined,
      dietaryOptions: [],
      seatingCapacity: "",
      reservationsRequired: false,
      // Service-specific
      serviceAreas: [],
      yearsInBusiness: undefined,
      certifications: "",
    },
  });

  // Step 3 Form
  const form3 = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      paymentMethods: [] as string[],
      fulfillmentMethods: {
        pickup: { enabled: false },
        delivery: { enabled: false },
        shipping: { enabled: false },
        custom: [],
      } as FulfillmentOptions,
    },
  });

  // Step 4 Form (Hours, Address & Images)
  const form4 = useForm({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      address: "",
      hours: {
        monday: "",
        tuesday: "",
        wednesday: "",
        thursday: "",
        friday: "",
        saturday: "",
        sunday: "",
      },
    },
  });

  // Image state for Step 4 (managed separately since they're uploaded, not form fields)
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  // Reset form2 when vendor type changes to clear stale data
  const previousVendorType = useRef<string | null>(null);
  useEffect(() => {
    // Skip on initial render and when loading draft
    if (!selectedVendorType || isInitialLoadRef.current) {
      previousVendorType.current = selectedVendorType;
      return;
    }
    
    // If vendor type actually changed, reset form2 and clear stale type-specific data
    if (previousVendorType.current && previousVendorType.current !== selectedVendorType) {
      console.log(`[VENDOR TYPE CHANGE] ${previousVendorType.current} → ${selectedVendorType}, resetting form2`);
      
      // Reset form2 with clean defaults
      form2.reset({
        tagline: "",
        website: "",
        instagram: "",
        facebook: "",
        localSourcingPercent: 50,
        showLocalSourcing: false,
        priceRange: undefined,
        dietaryOptions: [],
        seatingCapacity: "",
        reservationsRequired: false,
        serviceAreas: [],
        yearsInBusiness: undefined,
        certifications: "",
      });
      
      // If we have a draft, clear the old type-specific data
      if (draftVendorId) {
        const clearData: any = {};
        
        // Clear data from previous type
        if (previousVendorType.current === "shop") {
          clearData.localSourcingPercent = null;
          clearData.showLocalSourcing = null;
        } else if (previousVendorType.current === "dine") {
          clearData.restaurantDetails = null;
        } else if (previousVendorType.current === "service") {
          clearData.serviceDetails = null;
        }
        
        // Send PATCH to clear old data
        fetch(`/api/vendors/${draftVendorId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(clearData),
        }).catch(err => console.error("Failed to clear old type data:", err));
      }
    }
    
    previousVendorType.current = selectedVendorType;
  }, [selectedVendorType, draftVendorId, form2]);

  // Load draft vendor on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const response = await fetch("/api/vendors/draft", {
          credentials: "include",
        });
        
        if (!response.ok) {
          // Handle 401 authentication errors - silently redirect to auth
          if (response.status === 401) {
            sessionStorage.setItem("returnTo", "/onboarding");
            setLocation("/auth");
          }
          return;
        }

        const draft = await response.json();
        
        if (draft && draft.id) {
          console.log("Loaded draft vendor:", draft.id);
          updateDraftVendorId(draft.id);
          setSelectedVendorType(draft.vendorType);
          
          // Populate form 1 fields
          form1.reset({
            vendorType: draft.vendorType,
            categoryId: draft.categoryId || "",
            businessName: draft.businessName || "",
            contactName: draft.contactName || "",
            email: draft.contactEmail || "",
            phone: draft.phone || "",
            city: draft.city || "Fort Myers",
            zipCode: draft.zipCode || "",
            bio: draft.bio || "",
          });

          // Populate form 2 fields (base + type-specific)
          const form2Data: any = {
            tagline: draft.tagline || "",
            website: draft.website || "",
            instagram: draft.instagram || "",
            facebook: draft.facebook || "",
          };

          if (draft.vendorType === "shop") {
            form2Data.localSourcingPercent = draft.localSourcingPercent || 50;
            form2Data.showLocalSourcing = draft.showLocalSourcing || false;
          } else if (draft.vendorType === "dine" && draft.restaurantDetails) {
            form2Data.priceRange = draft.restaurantDetails.priceRange;
            form2Data.dietaryOptions = draft.restaurantDetails.dietaryOptions || [];
            form2Data.seatingCapacity = draft.restaurantDetails.seatingCapacity || "";
            form2Data.reservationsRequired = draft.restaurantDetails.reservationsRequired || false;
          } else if (draft.vendorType === "service" && draft.serviceDetails) {
            form2Data.serviceAreas = draft.serviceDetails.serviceAreas || [];
            form2Data.yearsInBusiness = draft.serviceDetails.yearsInBusiness;
            form2Data.certifications = draft.serviceDetails.certifications || "";
          }

          form2.reset(form2Data);

          // Populate form 3 fields
          if (draft.paymentMethod || draft.fulfillmentOptions) {
            const paymentMethods = draft.paymentMethod 
              ? draft.paymentMethod.split(", ").filter(Boolean)
              : [];
            
            form3.reset({
              paymentMethods,
              fulfillmentMethods: draft.fulfillmentOptions || {
                pickup: { enabled: false },
                delivery: { enabled: false },
                shipping: { enabled: false },
                custom: [],
              },
            });
          }

          // Populate form 4 fields (hours, address, images)
          form4.reset({
            address: draft.address || "",
            hours: draft.hours || {
              monday: "",
              tuesday: "",
              wednesday: "",
              thursday: "",
              friday: "",
              saturday: "",
              sunday: "",
            },
          });

          // Load image URLs
          if (draft.logoUrl) setLogoUrl(draft.logoUrl);
          if (draft.bannerUrl) setBannerUrl(draft.bannerUrl);
        }
      } catch (error) {
        console.error("Error loading draft vendor:", error);
      } finally {
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 500);
      }
    };

    loadDraft();
  }, []);

  // Helper function: fetch with timeout
  const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 15000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // Auto-save function
  const autoSave = useCallback(async (data: any, formType: 'step1' | 'step2' | 'step3' | 'step4') => {
    if (isInitialLoadRef.current) return;

    try {
      setSaveStatus("saving");
      console.log("[Auto-save] Starting save for", formType, "with vendor ID:", draftVendorId);

      // If no draft exists, create it first
      if (!draftVendorId && formType === 'step1' && data.vendorType && data.businessName) {
        console.log("[Auto-save] Creating new draft vendor");
        const createResponse = await fetchWithTimeout("/api/vendors/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            vendorType: data.vendorType,
            categoryId: data.categoryId || null,
            businessName: data.businessName,
            contactName: data.contactName || "",
            bio: data.bio || "",
            city: data.city || "Fort Myers",
            zipCode: data.zipCode || "",
            email: data.email || "",
            phone: data.phone || "",
          }),
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error("[Auto-save] Create failed:", createResponse.status, errorText);
          
          // Handle 401 authentication errors - silently redirect to auth
          if (createResponse.status === 401) {
            sessionStorage.setItem("returnTo", "/onboarding");
            setLocation("/auth");
            return;
          }
          
          throw new Error(`Failed to create draft: ${createResponse.status}`);
        }

        const newDraft = await createResponse.json();
        console.log("[Auto-save] Draft created successfully:", newDraft.id);
        updateDraftVendorId(newDraft.id);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
        return;
      }

      // Update existing draft
      if (draftVendorId) {
        const updateData: any = {};
        
        if (formType === 'step1') {
          updateData.businessName = data.businessName;
          updateData.contactName = data.contactName;
          updateData.email = data.email;
          updateData.phone = data.phone;
          updateData.city = data.city;
          updateData.zipCode = data.zipCode;
          updateData.bio = data.bio;
          updateData.categoryId = data.categoryId || null;
        } else if (formType === 'step2') {
          updateData.tagline = data.tagline;
          updateData.website = data.website;
          updateData.instagram = data.instagram;
          updateData.facebook = data.facebook;
          
          // Add type-specific fields
          if (selectedVendorType === "shop") {
            updateData.localSourcingPercent = data.localSourcingPercent;
            updateData.showLocalSourcing = data.showLocalSourcing;
          } else if (selectedVendorType === "dine") {
            updateData.restaurantDetails = {
              priceRange: data.priceRange,
              dietaryOptions: data.dietaryOptions,
              seatingCapacity: data.seatingCapacity,
              reservationsRequired: data.reservationsRequired,
            };
          } else if (selectedVendorType === "service") {
            updateData.serviceDetails = {
              serviceAreas: data.serviceAreas,
              yearsInBusiness: data.yearsInBusiness,
              certifications: data.certifications,
            };
          }
        } else if (formType === 'step3') {
          // All vendors save payment method
          updateData.paymentMethod = data.paymentMethods?.join(", ") || "";
          
          // Only shops save fulfillment options
          if (selectedVendorType === "shop" && data.fulfillmentMethods) {
            updateData.fulfillmentOptions = data.fulfillmentMethods;
          }
        } else if (formType === 'step4') {
          updateData.address = data.address;
          updateData.hours = data.hours;
        }

        console.log("[Auto-save] Updating draft vendor with fields:", Object.keys(updateData));
        const updateResponse = await fetchWithTimeout(`/api/vendors/${draftVendorId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(updateData),
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error("[Auto-save] Update failed:", updateResponse.status, errorText);
          
          // Handle 401 authentication errors - silently redirect to auth
          if (updateResponse.status === 401) {
            sessionStorage.setItem("returnTo", "/onboarding");
            setLocation("/auth");
            return;
          }
          
          throw new Error(`Failed to update draft: ${updateResponse.status}`);
        }

        console.log("[Auto-save] Update successful");
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        console.log("[Auto-save] No draft ID yet, skipping update");
        setSaveStatus("idle");
      }
    } catch (error) {
      console.error("[Auto-save] Error:", error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error("[Auto-save] Request timed out after 15 seconds");
        }
        console.error("[Auto-save] Error details:", error.message);
      }
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [draftVendorId, selectedVendorType, updateDraftVendorId]);

  // Debounced auto-save for each form
  const debouncedAutoSave = useCallback((data: any, formType: 'step1' | 'step2' | 'step3' | 'step4') => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      autoSave(data, formType);
    }, 2000);
  }, [autoSave]);

  // Subscribe to form changes
  useEffect(() => {
    const subscription1 = form1.watch((data) => {
      debouncedAutoSave(data, 'step1');
    });
    return () => subscription1.unsubscribe();
  }, [form1.watch, debouncedAutoSave]);

  useEffect(() => {
    const subscription2 = form2.watch((data) => {
      debouncedAutoSave(data, 'step2');
    });
    return () => subscription2.unsubscribe();
  }, [form2.watch, debouncedAutoSave]);

  useEffect(() => {
    const subscription3 = form3.watch((data) => {
      debouncedAutoSave(data, 'step3');
    });
    return () => subscription3.unsubscribe();
  }, [form3.watch, debouncedAutoSave]);

  useEffect(() => {
    const subscription4 = form4.watch((data) => {
      debouncedAutoSave(data, 'step4');
    });
    return () => subscription4.unsubscribe();
  }, [form4.watch, debouncedAutoSave]);

  // Step navigation
  const handleStep1Next = async () => {
    const isValid = await form1.trigger();
    if (isValid) {
      setStep(2);
      window.scrollTo(0, 0);
    }
  };

  const handleStep2Next = async () => {
    const isValid = await form2.trigger();
    if (isValid) {
      setStep(3);
      window.scrollTo(0, 0);
    }
  };

  const handleStep3Next = async () => {
    const isValid = await form3.trigger();
    if (isValid) {
      setStep(4);
      window.scrollTo(0, 0);
    }
  };

  const handleStep4Next = async () => {
    const isValid = await form4.trigger();
    if (isValid) {
      setStep(5);
      window.scrollTo(0, 0);
    }
  };

  // Final submission
  const handleFinalSubmit = () => {
    // If no draft ID in state, try to reload from sessionStorage and API
    if (!draftVendorId) {
      const savedId = sessionStorage.getItem("onboardingDraftId");
      if (savedId) {
        console.log("Recovered draft ID from sessionStorage:", savedId);
        updateDraftVendorId(savedId);
        // Try again with recovered ID
        toast({
          title: "Draft recovered",
          description: "Retrying submission...",
        });
        setTimeout(() => handleFinalSubmit(), 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "No draft profile found. Please try refreshing the page or contact support if the issue persists.",
        variant: "destructive",
      });
      return;
    }

    // Use the mutation to complete vendor profile with automatic cache invalidation
    completeMutation.mutate(draftVendorId);
  };

  const progress = (step / 5) * 100;

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back to Sign In */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/auth")}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-back-to-auth"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign In
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-playfair font-bold mb-2">
            Create Your Business Profile
          </h1>
          <p className="text-muted-foreground">
            Step {step} of 5
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Auto-save indicator */}
        {saveStatus !== "idle" && (
          <div className="mb-4 text-center">
            <Badge variant={saveStatus === "saved" ? "default" : saveStatus === "saving" ? "secondary" : "destructive"}>
              {saveStatus === "saving" && "Saving..."}
              {saveStatus === "saved" && "Saved"}
              {saveStatus === "error" && "Save failed"}
            </Badge>
          </div>
        )}

        {/* Step 1: Business Basics + Vendor Type */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Business Basics</CardTitle>
              <CardDescription>Tell us about your business</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form1}>
                <form className="space-y-6">
                  <FormField
                    control={form1.control}
                    name="vendorType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="min-h-12 py-3 px-4 text-base [&>svg]:h-5 [&>svg]:w-5" data-testid="select-vendor-type">
                              <SelectValue placeholder="Select your business type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="z-50">
                            <SelectItem value="shop" className="min-h-12 py-3 text-base" data-testid="option-shop">Shop (Products & Goods)</SelectItem>
                            <SelectItem value="dine" className="min-h-12 py-3 text-base" data-testid="option-dine">Dine (Restaurant & Food)</SelectItem>
                            <SelectItem value="service" className="min-h-12 py-3 text-base" data-testid="option-service">Services (Professional Services)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose the type that best describes your business
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form1.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Category</FormLabel>
                        {categoriesLoading ? (
                          <div className="flex items-center justify-between gap-2 min-h-12 py-3 px-4 border rounded-md bg-muted/50" data-testid="category-loading">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              <span className="text-muted-foreground text-sm">Loading categories...</span>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                toast({ title: "Refreshing categories..." });
                                refetchCategories();
                              }}
                              data-testid="button-refresh-categories-loading"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : categoriesError ? (
                          <div className="flex items-center justify-between gap-2 min-h-12 py-3 px-4 border border-destructive/50 rounded-md bg-destructive/5" data-testid="category-error">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              <span className="text-destructive text-sm">Failed to load categories</span>
                            </div>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                toast({ title: "Retrying..." });
                                refetchCategories();
                              }}
                              data-testid="button-retry-categories"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Retry
                            </Button>
                          </div>
                        ) : !categoriesData || categoriesData.length === 0 ? (
                          <div className="flex items-center justify-between gap-2 min-h-12 py-3 px-4 border rounded-md bg-muted/50" data-testid="category-empty">
                            <span className="text-muted-foreground text-sm">No categories available</span>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                toast({ title: "Reloading categories..." });
                                refetchCategories();
                              }}
                              data-testid="button-reload-categories"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Reload
                            </Button>
                          </div>
                        ) : (
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="min-h-12 py-3 px-4 text-base [&>svg]:h-5 [&>svg]:w-5" data-testid="select-category">
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="z-50">
                              {categoriesData.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id} className="min-h-12 py-3 text-base" data-testid={`option-category-${cat.key}`}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <FormDescription>
                          Choose the category that best describes what you offer
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form1.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your business name" {...field} data-testid="input-business-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form1.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your full name" {...field} data-testid="input-contact-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form1.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your@email.com" {...field} data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form1.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="(239) 555-0123" {...field} data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form1.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Fort Myers" {...field} data-testid="input-city" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form1.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zip Code</FormLabel>
                          <FormControl>
                            <Input placeholder="33901" {...field} data-testid="input-zip" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form1.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell customers about your business, what makes you special..."
                            rows={4}
                            {...field}
                            data-testid="input-bio"
                          />
                        </FormControl>
                        <FormDescription>
                          Minimum 10 characters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="lg"
                      onClick={handleStep1Next}
                      data-testid="button-next-step1"
                    >
                      Continue
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Business Details (Dynamic based on vendor type) */}
        {step === 2 && selectedVendorType && (
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
              <CardDescription>
                {selectedVendorType === "shop" && "Customize your shop profile"}
                {selectedVendorType === "dine" && "Tell us about your restaurant"}
                {selectedVendorType === "service" && "Share your service details"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form2}>
                <form className="space-y-6">
                  {/* Common fields for all types */}
                  <FormField
                    control={form2.control}
                    name="tagline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tagline (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="A short catchy phrase about your business" {...field} data-testid="input-tagline" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Shop-specific fields */}
                  {selectedVendorType === "shop" && (
                    <>
                      <FormField
                        control={form2.control}
                        name="showLocalSourcing"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-show-local-sourcing"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Display local sourcing percentage
                              </FormLabel>
                              <FormDescription>
                                Show customers how much of your inventory is locally sourced
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      {form2.watch("showLocalSourcing") && (
                        <FormField
                          control={form2.control}
                          name="localSourcingPercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Local Sourcing: {field.value}%</FormLabel>
                              <FormControl>
                                <Slider
                                  min={0}
                                  max={100}
                                  step={5}
                                  value={[field.value || 50]}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                  data-testid="slider-local-sourcing"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </>
                  )}

                  {/* Dine-specific fields */}
                  {selectedVendorType === "dine" && (
                    <>
                      <FormField
                        control={form2.control}
                        name="priceRange"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price Range</FormLabel>
                            <FormControl>
                              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="$" id="price-1" data-testid="radio-price-1" />
                                  <Label htmlFor="price-1">$ (Budget)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="$$" id="price-2" data-testid="radio-price-2" />
                                  <Label htmlFor="price-2">$$ (Moderate)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="$$$" id="price-3" data-testid="radio-price-3" />
                                  <Label htmlFor="price-3">$$$ (Upscale)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="$$$$" id="price-4" data-testid="radio-price-4" />
                                  <Label htmlFor="price-4">$$$$ (Fine Dining)</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form2.control}
                        name="dietaryOptions"
                        render={() => (
                          <FormItem>
                            <FormLabel>Dietary Options</FormLabel>
                            <div className="grid grid-cols-2 gap-4">
                              {DIETARY_OPTIONS.map((option) => (
                                <FormField
                                  key={option}
                                  control={form2.control}
                                  name="dietaryOptions"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={(field.value as string[] || []).includes(option)}
                                          onCheckedChange={(checked) => {
                                            const current = (field.value as string[]) || [];
                                            field.onChange(
                                              checked
                                                ? [...current, option]
                                                : current.filter((val) => val !== option)
                                            );
                                          }}
                                          data-testid={`checkbox-dietary-${option.toLowerCase().replace(/\s+/g, '-')}`}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">{option}</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form2.control}
                          name="seatingCapacity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Seating Capacity (Optional)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="e.g., 50" {...field} data-testid="input-seating-capacity" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form2.control}
                          name="reservationsRequired"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-8">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-reservations-required"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Reservations Required</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {/* Service-specific fields */}
                  {selectedVendorType === "service" && (
                    <>
                      <FormField
                        control={form2.control}
                        name="serviceAreas"
                        render={() => (
                          <FormItem>
                            <FormLabel>Service Areas</FormLabel>
                            <div className="grid grid-cols-2 gap-4">
                              {SERVICE_AREA_OPTIONS.map((area) => (
                                <FormField
                                  key={area}
                                  control={form2.control}
                                  name="serviceAreas"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={(field.value as string[] || []).includes(area)}
                                          onCheckedChange={(checked) => {
                                            const current = (field.value as string[]) || [];
                                            field.onChange(
                                              checked
                                                ? [...current, area]
                                                : current.filter((val) => val !== area)
                                            );
                                          }}
                                          data-testid={`checkbox-area-${area.toLowerCase().replace(/\s+/g, '-')}`}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">{area}</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form2.control}
                          name="yearsInBusiness"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Years in Business (Optional)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="e.g., 5" {...field} data-testid="input-years-in-business" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form2.control}
                          name="certifications"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Certifications (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Licensed, Insured" {...field} data-testid="input-certifications" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {/* Social media links (common for all) */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Online Presence (Optional)</h3>
                    
                    <FormField
                      control={form2.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://yourbusiness.com" {...field} data-testid="input-website" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form2.control}
                        name="instagram"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instagram</FormLabel>
                            <FormControl>
                              <Input placeholder="@yourbusiness" {...field} data-testid="input-instagram" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form2.control}
                        name="facebook"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Facebook</FormLabel>
                            <FormControl>
                              <Input placeholder="YourBusinessPage" {...field} data-testid="input-facebook" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setStep(1);
                        window.scrollTo(0, 0);
                      }}
                      data-testid="button-back-step2"
                    >
                      <ArrowLeft className="mr-2 w-4 h-4" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      onClick={handleStep2Next}
                      data-testid="button-next-step2"
                    >
                      Continue
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Payment & Fulfillment */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment & {selectedVendorType === "shop" ? "Fulfillment" : "Operations"}</CardTitle>
              <CardDescription>How you'll get paid and serve customers</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form3}>
                <form className="space-y-6">
                  <FormField
                    control={form3.control}
                    name="paymentMethods"
                    render={() => (
                      <FormItem>
                        <FormLabel>Payment Methods</FormLabel>
                        <div className="grid grid-cols-2 gap-4">
                          {PAYMENT_METHOD_OPTIONS.map((method) => (
                            <FormField
                              key={method}
                              control={form3.control}
                              name="paymentMethods"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(method)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        field.onChange(
                                          checked
                                            ? [...current, method]
                                            : current.filter((val: string) => val !== method)
                                        );
                                      }}
                                      data-testid={`checkbox-payment-${method.toLowerCase().replace(/[\/\s]+/g, '-')}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{method}</FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Fulfillment options for shops only */}
                  {selectedVendorType === "shop" && (
                    <FormField
                      control={form3.control}
                      name="fulfillmentMethods"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fulfillment Options</FormLabel>
                          <FormControl>
                            <FulfillmentEditor
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormDescription>
                            Choose how customers can receive their orders
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setStep(2);
                        window.scrollTo(0, 0);
                      }}
                      data-testid="button-back-step3"
                    >
                      <ArrowLeft className="mr-2 w-4 h-4" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      onClick={handleStep3Next}
                      data-testid="button-next-step3"
                    >
                      Continue
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Hours, Address & Images */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Hours, Address & Images</CardTitle>
              <CardDescription>Help customers find and recognize your business</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form4}>
                <form className="space-y-6">
                  {/* Street Address */}
                  <FormField
                    control={form4.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Street Address (optional)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="123 Main Street" 
                            {...field} 
                            data-testid="input-address"
                          />
                        </FormControl>
                        <FormDescription>
                          Your business street address for customers to find you
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Business Hours */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2 text-base font-medium">
                      <Clock className="w-4 h-4" />
                      Business Hours
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Enter your hours for each day (e.g., "9:00 AM - 5:00 PM" or "Closed")
                    </p>
                    <div className="space-y-3">
                      {DAYS_OF_WEEK.map((day) => (
                        <FormField
                          key={day}
                          control={form4.control}
                          name={`hours.${day}`}
                          render={({ field }) => (
                            <FormItem className="grid grid-cols-[100px_1fr] gap-4 items-center">
                              <FormLabel className="capitalize text-right">{day}</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., 9:00 AM - 5:00 PM or Closed"
                                  {...field}
                                  data-testid={`input-hours-${day}`}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Profile Photo/Logo */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-base font-medium">
                      <Image className="w-4 h-4" />
                      Profile Photo/Logo (optional)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Square image that represents your business
                    </p>
                    <ImageUpload
                      currentImageUrl={logoUrl}
                      onUploadComplete={async (imageUrl) => {
                        setLogoUrl(imageUrl);
                        if (draftVendorId) {
                          await fetch(`/api/vendors/${draftVendorId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ logoUrl: imageUrl }),
                          });
                        }
                      }}
                      onRemove={async () => {
                        setLogoUrl(null);
                        if (draftVendorId) {
                          await fetch(`/api/vendors/${draftVendorId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ logoUrl: null }),
                          });
                        }
                      }}
                      maxSizeMB={5}
                      aspectRatio="square"
                    />
                  </div>

                  {/* Cover Photo/Banner */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Cover Photo/Banner (optional)</Label>
                    <p className="text-sm text-muted-foreground">
                      Wide banner image for your profile header
                    </p>
                    <ImageUpload
                      currentImageUrl={bannerUrl}
                      onUploadComplete={async (imageUrl) => {
                        setBannerUrl(imageUrl);
                        if (draftVendorId) {
                          await fetch(`/api/vendors/${draftVendorId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ bannerUrl: imageUrl }),
                          });
                        }
                      }}
                      onRemove={async () => {
                        setBannerUrl(null);
                        if (draftVendorId) {
                          await fetch(`/api/vendors/${draftVendorId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ bannerUrl: null }),
                          });
                        }
                      }}
                      maxSizeMB={5}
                      aspectRatio="landscape"
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setStep(3);
                        window.scrollTo(0, 0);
                      }}
                      data-testid="button-back-step4"
                    >
                      <ArrowLeft className="mr-2 w-4 h-4" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      onClick={handleStep4Next}
                      data-testid="button-next-step4"
                    >
                      Continue
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Review & Submit */}
        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Submit</CardTitle>
              <CardDescription>You're almost done! Review your information and submit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Business Type</h3>
                  <p className="text-muted-foreground">
                    {selectedVendorType === "shop" && "Shop (Products & Goods)"}
                    {selectedVendorType === "dine" && "Dine (Restaurant & Food)"}
                    {selectedVendorType === "service" && "Services (Professional Services)"}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Business Name</h3>
                  <p className="text-muted-foreground">{form1.getValues("businessName")}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Contact Information</h3>
                  <p className="text-muted-foreground">
                    {form1.getValues("contactName")} • {form1.getValues("email")}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Location</h3>
                  <p className="text-muted-foreground">
                    {form4.getValues("address") ? `${form4.getValues("address")}, ` : ""}
                    {form1.getValues("city")}, FL {form1.getValues("zipCode")}
                  </p>
                </div>

                {/* Show hours summary if any are filled in */}
                {Object.values(form4.getValues("hours") || {}).some(h => h) && (
                  <div>
                    <h3 className="font-medium mb-2">Business Hours</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {DAYS_OF_WEEK.map(day => {
                        const hours = form4.getValues(`hours.${day}`);
                        return hours ? (
                          <div key={day} className="flex">
                            <span className="capitalize w-24">{day}:</span>
                            <span>{hours}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Show images if uploaded */}
                {(logoUrl || bannerUrl) && (
                  <div>
                    <h3 className="font-medium mb-2">Images</h3>
                    <div className="flex gap-4">
                      {logoUrl && (
                        <div className="text-center">
                          <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover" />
                          <span className="text-xs text-muted-foreground">Logo</span>
                        </div>
                      )}
                      {bannerUrl && (
                        <div className="text-center">
                          <img src={bannerUrl} alt="Banner" className="w-24 h-16 rounded-lg object-cover" />
                          <span className="text-xs text-muted-foreground">Banner</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  By submitting, you agree to Rise Local's terms of service and confirm that the information provided is accurate.
                </p>
              </div>

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep(4);
                    window.scrollTo(0, 0);
                  }}
                  data-testid="button-back-step5"
                >
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={handleFinalSubmit}
                  disabled={completeMutation.isPending}
                  data-testid="button-submit-final"
                >
                  {completeMutation.isPending ? (
                    <>
                      <CloudUpload className="mr-2 w-4 h-4 animate-pulse" />
                      Creating Profile...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircle2 className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
