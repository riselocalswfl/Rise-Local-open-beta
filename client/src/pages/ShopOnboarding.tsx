import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, CheckCircle2, ArrowRight, ArrowLeft, CloudUpload, Check } from "lucide-react";
import { HierarchicalCategorySelector } from "@/components/HierarchicalCategorySelector";
import { FulfillmentEditor } from "@/components/FulfillmentEditor";
import type { FulfillmentOptions } from "@shared/schema";
import { SHOP_CATEGORIES } from "@shared/categories";

// Step 1: Business Basics Schema
const step1Schema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  city: z.string().min(1, "City is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  bio: z.string().min(10, "Please provide at least 10 characters"),
  categories: z.array(z.string()).min(1, "Select at least one category"),
});

// Step 2: Shop Details Schema
const step2Schema = z.object({
  tagline: z.string().optional(),
  localSourcingPercent: z.number().min(0).max(100).optional(),
  showLocalSourcing: z.boolean().optional(),
  website: z.string().url().optional().or(z.literal("")),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
});

// Step 3: Payment & Fulfillment Schema
const step3Schema = z.object({
  paymentMethods: z.array(z.string()).min(1, "Select at least one payment method"),
  fulfillmentMethods: z.any(),
});

export default function ShopOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-save state
  const [draftVendorId, setDraftVendorId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Form data accumulator
  const [formData, setFormData] = useState<any>({});

  // Step 1 Form
  const form1 = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      businessName: "",
      contactName: "",
      email: "",
      phone: "",
      city: "Fort Myers",
      zipCode: "",
      bio: "",
      categories: [],
    },
  });

  // Step 2 Form
  const form2 = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      tagline: "",
      localSourcingPercent: 50,
      showLocalSourcing: false,
      website: "",
      instagram: "",
      facebook: "",
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

  // Load draft vendor on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const response = await fetch("/api/vendors/draft", {
          credentials: "include",
        });
        
        if (!response.ok) {
          console.error("Failed to fetch draft vendor");
          return;
        }

        const draft = await response.json();
        
        if (draft && draft.id) {
          console.log("Loaded draft vendor:", draft.id);
          setDraftVendorId(draft.id);
          
          // Populate form 1 fields
          form1.reset({
            businessName: draft.businessName || "",
            contactName: draft.contactName || "",
            email: draft.contact?.email || "",
            phone: draft.contact?.phone || "",
            city: draft.city || "Fort Myers",
            zipCode: draft.zipCode || "",
            bio: draft.bio || "",
            categories: draft.categories || [],
          });

          // Populate form 2 fields
          form2.reset({
            tagline: draft.tagline || "",
            localSourcingPercent: draft.localSourcingPercent || 50,
            showLocalSourcing: draft.showLocalSourcing || false,
            website: draft.contact?.website || "",
            instagram: draft.contact?.instagram || "",
            facebook: draft.contact?.facebook || "",
          });

          // Populate form 3 fields if payment/fulfillment data exists
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

          // Update form data state
          setFormData({
            businessName: draft.businessName,
            contactName: draft.contactName,
            email: draft.contact?.email,
            phone: draft.contact?.phone,
            city: draft.city,
            zipCode: draft.zipCode,
            bio: draft.bio,
            categories: draft.categories,
            tagline: draft.tagline,
            localSourcingPercent: draft.localSourcingPercent,
            showLocalSourcing: draft.showLocalSourcing,
            website: draft.contact?.website,
            instagram: draft.contact?.instagram,
            facebook: draft.contact?.facebook,
          });
        }
      } catch (error) {
        console.error("Error loading draft vendor:", error);
      } finally {
        // Mark initial load as complete
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 500);
      }
    };

    loadDraft();
  }, []);

  // Auto-save function
  const autoSave = useCallback(async (data: any, formType: 'step1' | 'step2' | 'step3') => {
    if (isInitialLoadRef.current) return;

    try {
      setSaveStatus("saving");

      // If no draft vendor exists and this is step1, create it first
      if (!draftVendorId && formType === 'step1') {
        // Validate required fields before creating draft
        if (!data.businessName || !data.contactName || !data.bio) {
          setSaveStatus("idle");
          return;
        }

        const createResponse = await fetch("/api/vendors/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            vendorType: "shop",
            businessName: data.businessName,
            contactName: data.contactName,
            bio: data.bio,
            city: data.city || "Fort Myers",
            zipCode: data.zipCode || "",
            categories: data.categories || [],
            email: data.email || "",
            phone: data.phone || "",
          }),
        });

        if (!createResponse.ok) {
          throw new Error("Failed to create draft");
        }

        const vendor = await createResponse.json();
        setDraftVendorId(vendor.id);
        console.log("[AUTO-SAVE] Created draft vendor:", vendor.id);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
        return;
      }

      // If no draft ID, can't auto-save step 2 or 3
      if (!draftVendorId) {
        setSaveStatus("idle");
        return;
      }

      // Prepare update data based on form type
      let updateData: any = {};
      
      if (formType === 'step1') {
        updateData = {
          businessName: data.businessName,
          contactName: data.contactName,
          bio: data.bio,
          city: data.city,
          zipCode: data.zipCode,
          categories: data.categories,
          contact: {
            email: data.email,
            phone: data.phone || "",
            website: formData.website || "",
            instagram: formData.instagram || "",
            facebook: formData.facebook || "",
          },
        };
      } else if (formType === 'step2') {
        updateData = {
          tagline: data.tagline || "",
          localSourcingPercent: data.localSourcingPercent || 0,
          showLocalSourcing: data.showLocalSourcing || false,
          contact: {
            email: formData.email || "",
            phone: formData.phone || "",
            website: data.website || "",
            instagram: data.instagram || "",
            facebook: data.facebook || "",
          },
        };
      } else if (formType === 'step3') {
        const fulfillmentOptions = data.fulfillmentMethods;
        const serviceOptions: string[] = [];
        
        if (fulfillmentOptions.pickup?.enabled) serviceOptions.push("Pickup");
        if (fulfillmentOptions.delivery?.enabled) serviceOptions.push("Delivery");
        if (fulfillmentOptions.shipping?.enabled) serviceOptions.push("Ship");
        
        updateData = {
          paymentMethod: data.paymentMethods.join(", "),
          fulfillmentOptions,
          serviceOptions,
        };
      }

      const response = await fetch(`/api/vendors/${draftVendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to auto-save");
      }

      console.log("[AUTO-SAVE] Updated draft vendor:", draftVendorId);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Auto-save error:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [draftVendorId, formData]);

  // Watch form1 for auto-save
  useEffect(() => {
    const subscription = form1.watch((value) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        autoSave(value, 'step1');
      }, 2000);
    });
    
    return () => {
      subscription.unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [form1, autoSave]);

  // Watch form2 for auto-save
  useEffect(() => {
    const subscription = form2.watch((value) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        autoSave(value, 'step2');
      }, 2000);
    });
    
    return () => {
      subscription.unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [form2, autoSave]);

  // Watch form3 for auto-save
  useEffect(() => {
    const subscription = form3.watch((value) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        autoSave(value, 'step3');
      }, 2000);
    });
    
    return () => {
      subscription.unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [form3, autoSave]);

  const handleStep1Submit = async (data: any) => {
    setFormData({ ...formData, ...data });
    
    try {
      if (!draftVendorId) {
        // Create draft vendor
        const response = await fetch("/api/vendors/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            vendorType: "shop",
            businessName: data.businessName,
            contactName: data.contactName,
            bio: data.bio,
            city: data.city,
            zipCode: data.zipCode,
            categories: data.categories,
            email: data.email,
            phone: data.phone,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create draft");
        }

        const vendor = await response.json();
        setDraftVendorId(vendor.id);
        console.log("Created draft vendor:", vendor.id);
      } else {
        // Update existing draft
        const response = await fetch(`/api/vendors/${draftVendorId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            businessName: data.businessName,
            contactName: data.contactName,
            bio: data.bio,
            city: data.city,
            zipCode: data.zipCode,
            categories: data.categories,
            contact: {
              email: data.email,
              phone: data.phone || "",
              website: formData.website || "",
              instagram: formData.instagram || "",
              facebook: formData.facebook || "",
            },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update draft");
        }
      }

      setStep(2);
    } catch (error) {
      console.error("Error saving step 1:", error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "Failed to save your progress, but you can continue. Please try again.",
      });
      setStep(2);
    }
  };

  const handleStep2Submit = async (data: any) => {
    setFormData({ ...formData, ...data });
    
    try {
      if (draftVendorId) {
        // Update draft with step 2 data
        const response = await fetch(`/api/vendors/${draftVendorId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            tagline: data.tagline || "",
            localSourcingPercent: data.localSourcingPercent || 0,
            showLocalSourcing: data.showLocalSourcing || false,
            contact: {
              email: formData.email || "",
              phone: formData.phone || "",
              website: data.website || "",
              instagram: data.instagram || "",
              facebook: data.facebook || "",
            },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save step 2");
        }
      }

      setStep(3);
    } catch (error) {
      console.error("Error saving step 2:", error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "Failed to save your progress, but you can continue. Please try again.",
      });
      setStep(3);
    }
  };

  const handleStep3Submit = async (data: any) => {
    setFormData({ ...formData, ...data });
    
    try {
      if (draftVendorId) {
        // Update draft with step 3 data
        const fulfillmentOptions = data.fulfillmentMethods;
        const serviceOptions: string[] = [];
        
        if (fulfillmentOptions.pickup?.enabled) serviceOptions.push("Pickup");
        if (fulfillmentOptions.delivery?.enabled) serviceOptions.push("Delivery");
        if (fulfillmentOptions.shipping?.enabled) serviceOptions.push("Ship");
        
        const response = await fetch(`/api/vendors/${draftVendorId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            paymentMethod: data.paymentMethods.join(", "),
            fulfillmentOptions,
            serviceOptions,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save step 3");
        }
      }

      setStep(4);
    } catch (error) {
      console.error("Error saving step 3:", error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "Failed to save your progress, but you can continue. Please try again.",
      });
      setStep(4);
    }
  };

  const handleStep4Submit = async (connectStripe: boolean = false) => {
    setIsSubmitting(true);
    
    try {
      if (!draftVendorId) {
        throw new Error("No draft vendor found. Please start from the beginning.");
      }

      // Mark profile as complete
      const response = await fetch(`/api/vendors/${draftVendorId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to complete profile");
      }

      const result = await response.json();

      toast({
        title: "Profile created!",
        description: connectStripe 
          ? "Welcome to Rise Local. Complete your Stripe setup to start accepting payments."
          : "Welcome to Rise Local. You can connect Stripe later from Settings.",
      });

      // Redirect to dashboard
      const dashboardUrl = "/vendor-dashboard";
      if (connectStripe) {
        sessionStorage.setItem("openStripeSettings", "true");
      }
      setLocation(dashboardUrl);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to complete profile. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Rise Local</h1>
          <p className="text-muted-foreground">
            Set up your Shop profile in 4 simple steps
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Step {step} of 4</span>
            <span className="text-sm text-muted-foreground">{Math.round(progressPercentage)}% Complete</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          
          {/* Save Status Indicator */}
          {saveStatus !== "idle" && (
            <div className="flex items-center justify-center gap-2 mt-3" data-testid="save-status-indicator">
              {saveStatus === "saving" && (
                <>
                  <CloudUpload className="w-4 h-4 text-muted-foreground animate-pulse" />
                  <span className="text-sm text-muted-foreground">Saving...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-600 dark:text-green-400">Saved</span>
                </>
              )}
              {saveStatus === "error" && (
                <>
                  <span className="text-sm text-destructive">Failed to save (will retry)</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Step 1: Business Basics */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Business Basics</CardTitle>
              <CardDescription>Tell us about your business</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form1}>
                <form onSubmit={form1.handleSubmit(handleStep1Submit)} className="space-y-4">
                  <FormField
                    control={form1.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Sunshine Grove Farm" {...field} data-testid="input-business-name" />
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
                        <FormLabel>Owner / Contact Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} data-testid="input-contact-name" />
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
                          <FormLabel>Contact Email *</FormLabel>
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
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="(239) 555-1234" {...field} data-testid="input-phone" />
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
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-city" />
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
                          <FormLabel>Zip Code *</FormLabel>
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
                    name="categories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categories *</FormLabel>
                        <FormControl>
                          <HierarchicalCategorySelector
                            categories={SHOP_CATEGORIES}
                            selectedCategories={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormDescription>
                          Choose categories that best describe your business
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form1.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Bio *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell customers about your business, your story, and what makes you unique..."
                            className="min-h-[100px]"
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
                    <Button type="submit" size="lg" className="gap-2" data-testid="button-next-step-1">
                      Next Step
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Shop Details */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Shop Details</CardTitle>
              <CardDescription>Add more information about your shop</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form2}>
                <form onSubmit={form2.handleSubmit(handleStep2Submit)} className="space-y-4">
                  <FormField
                    control={form2.control}
                    name="tagline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tagline</FormLabel>
                        <FormControl>
                          <Input placeholder="A short catchy phrase..." {...field} data-testid="input-tagline" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form2.control}
                    name="localSourcingPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local Sourcing</FormLabel>
                        <FormControl>
                          <div className="space-y-3">
                            <Slider
                              min={0}
                              max={100}
                              step={5}
                              value={[field.value]}
                              onValueChange={(values) => field.onChange(values[0])}
                              data-testid="slider-local-sourcing"
                            />
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">0%</span>
                              <Badge variant="secondary" className="text-lg font-semibold">
                                {field.value}%
                              </Badge>
                              <span className="text-sm text-muted-foreground">100%</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          What percentage of your products are sourced locally?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                          <FormLabel className="text-sm font-normal cursor-pointer">
                            Display local sourcing percentage on my public profile
                          </FormLabel>
                          <FormDescription>
                            You can change this later in your dashboard settings
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form2.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input type="url" placeholder="https://yourwebsite.com" {...field} data-testid="input-website" />
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
                            <Input placeholder="Your Facebook page" {...field} data-testid="input-facebook" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2" data-testid="button-back-step-2">
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>
                    <Button type="submit" size="lg" className="gap-2" data-testid="button-next-step-2">
                      Next Step
                      <ArrowRight className="w-4 h-4" />
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
              <CardTitle>Payment & Fulfillment</CardTitle>
              <CardDescription>How will you accept payments and fulfill orders?</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form3}>
                <form onSubmit={form3.handleSubmit(handleStep3Submit)} className="space-y-6">
                  <FormField
                    control={form3.control}
                    name="paymentMethods"
                    render={() => (
                      <FormItem>
                        <FormLabel>Payment Methods *</FormLabel>
                        <FormDescription>
                          Select payment methods you accept. "Credit Card (Through App)" requires Stripe Connect setup.
                        </FormDescription>
                        <div className="space-y-2">
                          {["Credit Card (Through App)", "Direct", "Venmo", "Zelle", "CashApp", "PayPal", "Cash"].map((method) => (
                            <FormField
                              key={method}
                              control={form3.control}
                              name="paymentMethods"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(method)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        return checked
                                          ? field.onChange([...current, method])
                                          : field.onChange(current.filter((value: string) => value !== method));
                                      }}
                                      data-testid={`checkbox-payment-${method.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">{method}</FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form3.control}
                    name="fulfillmentMethods"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fulfillment Options *</FormLabel>
                        <FormControl>
                          <FulfillmentEditor
                            value={field.value as FulfillmentOptions}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="gap-2" data-testid="button-back-step-3">
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>
                    <Button type="submit" size="lg" className="gap-2" data-testid="button-next-step-3">
                      Next Step
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Payment Options & Launch */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Options</CardTitle>
              <CardDescription>Your profile is almost ready! Choose how you'll accept payments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">Stripe Connect Credit Cards</h3>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Coming Next Week
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Stripe Connect will launch next week! You'll be able to accept credit card payments and receive 100% of the payment amount (product price + 7% FL sales tax) directly to your bank account.
                    </p>
                    <p className="text-sm font-semibold mb-2">In the meantime, you can accept payments via:</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>Venmo, Zelle, CashApp, PayPal, or Cash</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>Buyers choose payment method at checkout</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>You handle payments directly with customers</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  onClick={() => handleStep4Submit(false)}
                  disabled={isSubmitting}
                  data-testid="button-complete-profile"
                >
                  {isSubmitting ? "Creating Profile..." : "Complete Profile & Launch"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStep(3)}
                  disabled={isSubmitting}
                  data-testid="button-back-step-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
