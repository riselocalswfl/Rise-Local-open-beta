import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShoppingBag, Utensils, Wrench, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { HierarchicalCategorySelector } from "@/components/HierarchicalCategorySelector";
import { FulfillmentEditor } from "@/components/FulfillmentEditor";
import type { FulfillmentOptions } from "@shared/schema";

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

// Step 2: Type-Specific Schema (varies by vendor type)
const step2Schema = z.object({
  tagline: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
});

// Step 3: Payment & Fulfillment Schema
const step3Schema = z.object({
  paymentMethods: z.array(z.string()).min(1, "Select at least one payment method"),
  fulfillmentMethods: z.any(), // Use any for now since FulfillmentOptions is complex
});

export default function VendorOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [vendorType, setVendorType] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data accumulator
  const [formData, setFormData] = useState<any>({});

  // Fetch vendorType from server session (fallback if sessionStorage is cleared)
  const { data: vendorTypeData } = useQuery({
    queryKey: ["/api/auth/vendor-type"],
    enabled: !vendorType && !sessionStorage.getItem("vendorType"),
  });

  useEffect(() => {
    // Get vendor type from sessionStorage first
    const storedVendorType = sessionStorage.getItem("vendorType");
    if (storedVendorType) {
      setVendorType(storedVendorType);
      return;
    }
    
    // Check if we have it from server
    if (vendorTypeData?.vendorType) {
      setVendorType(vendorTypeData.vendorType);
      sessionStorage.setItem("vendorType", vendorTypeData.vendorType);
      return;
    }
    
    // No vendor type found anywhere, redirect to join page
    if (!storedVendorType && vendorTypeData !== undefined && !vendorTypeData?.vendorType) {
      setLocation("/join");
    }
  }, [setLocation, vendorTypeData]);

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
      website: "",
      instagram: "",
      facebook: "",
    },
  });

  // Step 3 Form
  const form3 = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      paymentMethods: [],
      fulfillmentMethods: {
        pickup: { enabled: false },
        delivery: { enabled: false },
        shipping: { enabled: false },
        custom: [],
      } as FulfillmentOptions,
    },
  });

  const handleStep1Submit = (data: any) => {
    setFormData({ ...formData, ...data });
    setStep(2);
  };

  const handleStep2Submit = (data: any) => {
    setFormData({ ...formData, ...data });
    setStep(3);
  };

  const handleStep3Submit = (data: any) => {
    setFormData({ ...formData, ...data });
    setStep(4);
  };

  const handleStep4Submit = async (connectStripe: boolean = false) => {
    setIsSubmitting(true);
    const completeData = { ...formData, vendorType };
    
    try {
      const response = await fetch("/api/vendors/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completeData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create profile");
      }

      const result = await response.json();

      toast({
        title: "Profile created!",
        description: connectStripe 
          ? "Welcome to Rise Local. Complete your Stripe setup to start accepting payments."
          : "Welcome to Rise Local. You can connect Stripe later from Settings.",
      });

      // Clear session storage
      sessionStorage.removeItem("vendorType");

      // Redirect to dashboard, opening Settings tab if connecting Stripe
      const dashboardUrl = result.redirectUrl || "/dashboard";
      if (connectStripe) {
        // Store flag to open Settings tab
        sessionStorage.setItem("openStripeSettings", "true");
      }
      setLocation(dashboardUrl);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create profile. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  const getVendorTypeIcon = () => {
    switch (vendorType) {
      case "shop":
        return <ShoppingBag className="w-8 h-8 text-primary" />;
      case "restaurant":
        return <Utensils className="w-8 h-8 text-primary" />;
      case "service":
        return <Wrench className="w-8 h-8 text-primary" />;
      default:
        return <ShoppingBag className="w-8 h-8 text-primary" />;
    }
  };

  const getVendorTypeLabel = () => {
    switch (vendorType) {
      case "shop":
        return "Shop";
      case "restaurant":
        return "Dine";
      case "service":
        return "Services";
      default:
        return "Vendor";
    }
  };

  const progressPercentage = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            {getVendorTypeIcon()}
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Rise Local</h1>
          <p className="text-muted-foreground">
            Set up your {getVendorTypeLabel()} profile in 4 simple steps
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Step {step} of 4</span>
            <span className="text-sm text-muted-foreground">{Math.round(progressPercentage)}% Complete</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
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
                            selectedCategories={field.value}
                            onCategoriesChange={field.onChange}
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

        {/* Step 2: Additional Details */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
              <CardDescription>Add more information about your business</CardDescription>
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
                                      data-testid={`checkbox-payment-${method.toLowerCase()}`}
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

        {/* Step 4: Connect Payments (Stripe) */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Connect Payments (Optional)</CardTitle>
              <CardDescription>Set up Stripe to accept credit card payments through the app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">Accept Credit Cards</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connect your Stripe account to accept credit card payments directly through the Rise Local platform. 
                      You'll receive 100% of the payment amount (product price + 7% FL sales tax) directly to your bank account.
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>Receive payments within 2 business days</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>No transaction fees from Rise Local (Stripe's standard fees apply)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>Secure and PCI-compliant payment processing</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(3)} 
                  className="gap-2"
                  data-testid="button-back-step-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => handleStep4Submit(false)} 
                    disabled={isSubmitting}
                    className="gap-2"
                    data-testid="button-skip-stripe"
                  >
                    Skip for Now
                  </Button>
                  <Button 
                    type="button" 
                    size="lg" 
                    onClick={() => handleStep4Submit(true)} 
                    disabled={isSubmitting}
                    className="gap-2"
                    data-testid="button-complete-onboarding"
                  >
                    {isSubmitting ? (
                      "Creating Profile..."
                    ) : (
                      <>
                        Complete & Connect Stripe
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
