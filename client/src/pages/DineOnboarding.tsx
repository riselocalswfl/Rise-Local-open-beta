import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Utensils, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { HierarchicalCategorySelector } from "@/components/HierarchicalCategorySelector";
import { DINE_CATEGORIES } from "@shared/categories";

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

// Step 2: Dine Details Schema
const step2Schema = z.object({
  tagline: z.string().optional(),
  priceRange: z.enum(["$", "$$", "$$$", "$$$$"]),
  dietaryOptions: z.array(z.string()).min(1, "Select at least one dietary option"),
  seatingCapacity: z.coerce.number().min(1, "Seating capacity must be at least 1").optional().or(z.literal("")),
  reservationsRequired: z.boolean().default(false),
  website: z.string().url().optional().or(z.literal("")),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
});

// Step 3: Payment Methods Schema
const step3Schema = z.object({
  paymentMethods: z.array(z.string()).min(1, "Select at least one payment method"),
});

export default function DineOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      priceRange: "$",
      dietaryOptions: [] as string[],
      seatingCapacity: "" as any,
      reservationsRequired: false,
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
    // Restaurants don't need complex fulfillment options
    const completeData = { 
      ...formData, 
      vendorType: "restaurant",
      fulfillmentMethods: {
        pickup: { enabled: false },
        delivery: { enabled: false },
        shipping: { enabled: false },
        custom: [],
      }
    };
    
    try {
      const response = await fetch("/api/vendors/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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

  const progressPercentage = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Utensils className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Rise Local</h1>
          <p className="text-muted-foreground">
            Set up your Dine profile in 4 simple steps
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
              <CardDescription>Tell us about your restaurant</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form1}>
                <form onSubmit={form1.handleSubmit(handleStep1Submit)} className="space-y-4">
                  <FormField
                    control={form1.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Restaurant Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Sunset Bistro" {...field} data-testid="input-business-name" />
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
                            categories={DINE_CATEGORIES}
                            selectedCategories={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormDescription>
                          Choose categories that best describe your restaurant
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
                        <FormLabel>Restaurant Bio *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell customers about your restaurant, your cuisine, and what makes you unique..."
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

        {/* Step 2: Dine Details */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Dine Details</CardTitle>
              <CardDescription>Add more information about your restaurant</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form2}>
                <form onSubmit={form2.handleSubmit(handleStep2Submit)} className="space-y-6">
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
                    name="priceRange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Range *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="$" data-testid="radio-price-$" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                $ - Budget-friendly
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="$$" data-testid="radio-price-$$" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                $$ - Moderate
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="$$$" data-testid="radio-price-$$$" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                $$$ - Upscale
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="$$$$" data-testid="radio-price-$$$$" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                $$$$ - Fine Dining
                              </FormLabel>
                            </FormItem>
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
                        <FormLabel>Dietary Options *</FormLabel>
                        <FormDescription>
                          Select at least one dietary option you offer
                        </FormDescription>
                        <div className="space-y-2">
                          {["Vegan", "Vegetarian", "Gluten-Free", "Dairy-Free", "Keto", "Paleo"].map((option) => (
                            <FormField
                              key={option}
                              control={form2.control}
                              name="dietaryOptions"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(option)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        return checked
                                          ? field.onChange([...current, option])
                                          : field.onChange(current.filter((value: string) => value !== option));
                                      }}
                                      data-testid={`checkbox-dietary-${option.toLowerCase()}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">{option}</FormLabel>
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
                          <FormLabel>Seating Capacity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 50" 
                              {...field} 
                              data-testid="input-seating-capacity" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form2.control}
                      name="reservationsRequired"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0 pt-8">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-reservations-required"
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Reservations Required
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form2.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input type="url" placeholder="https://yourrestaurant.com" {...field} data-testid="input-website" />
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
                            <Input placeholder="@yourrestaurant" {...field} data-testid="input-instagram" />
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

        {/* Step 3: Payment Methods */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>How will you accept payments?</CardDescription>
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
                                      data-testid={`checkbox-payment-${method.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
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
                        <span>Venmo, CashApp, Zelle - Available Now</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>PayPal Direct - Available Now</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>Cash on pickup - Available Now</span>
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
                    size="lg" 
                    onClick={() => handleStep4Submit(false)} 
                    disabled={isSubmitting}
                    className="gap-2 flex-1"
                    data-testid="button-complete-onboarding"
                  >
                    {isSubmitting ? (
                      "Creating Profile..."
                    ) : (
                      <>
                        Complete Setup & Go to Dashboard
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
