import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "@/components/TagInput";
import { HierarchicalCategorySelector } from "@/components/HierarchicalCategorySelector";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SERVICES_CATEGORIES } from "@shared/categories";

const PAYMENT_PREFERENCES = ["Direct", "Venmo", "Zelle", "CashApp", "PayPal", "Cash"];

export default function ServiceProviderSignup() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  // Update step when user auth status changes
  useEffect(() => {
    if (user && step === 1) {
      setStep(2);
    }
  }, [user, step]);

  // Form state
  const [formData, setFormData] = useState({
    businessName: "",
    tagline: "",
    description: "",
    categories: [] as string[],
    city: "",
    zipCode: "",
    serviceRadius: 25,
    certifications: [] as string[],
    contactPhone: "",
    contactEmail: "",
    website: "",
    instagram: "",
    facebook: "",
    paymentPreferences: [] as string[],
    customPaymentPreferences: [] as string[],
    values: [] as string[],
  });

  const signupMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/services/signup", data);
    },
    onSuccess: () => {
      toast({
        title: "Welcome to Rise Local!",
        description: "Your service provider account has been created.",
      });
      setLocation("/service-provider-dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Signup failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to continue",
        variant: "destructive",
      });
      return;
    }

    // Merge standard and custom payment preferences
    const allPaymentPreferences = [...formData.paymentPreferences, ...formData.customPaymentPreferences];

    signupMutation.mutate({
      userId: user.id,
      ...formData,
      paymentPreferences: allPaymentPreferences,
      capabilities: { products: false, services: true, menu: false },
    });
  };

  const togglePaymentPreference = (pref: string) => {
    setFormData(prev => ({
      ...prev,
      paymentPreferences: prev.paymentPreferences.includes(pref)
        ? prev.paymentPreferences.filter(p => p !== pref)
        : [...prev.paymentPreferences, pref]
    }));
  };

  // Step 1: Auth
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-playfair">Sign Up as Service Provider</CardTitle>
            <CardDescription>
              Sign in with Replit to create your service provider account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => {
                sessionStorage.setItem("returnTo", "/join/service-provider");
                window.location.href = "/api/login?intended_role=service_provider";
              }}
              data-testid="button-replit-login"
            >
              Continue with Replit Auth
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Supports Google, GitHub, Email, and more
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Business Basics
  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>Step 1 of 3</span>
            </div>
            <CardTitle className="text-3xl font-playfair">Business Details</CardTitle>
            <CardDescription>
              Tell us about your service business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="e.g., Green Lawn Care Services"
                data-testid="input-business-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="A brief description of what you do"
                data-testid="input-tagline"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Business Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell customers about your services, experience, and what makes you unique..."
                rows={4}
                data-testid="input-description"
              />
            </div>

            <HierarchicalCategorySelector
              categories={SERVICES_CATEGORIES}
              selectedCategories={formData.categories}
              onChange={(categories) => setFormData({ ...formData, categories })}
              label="Service Categories"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Fort Myers"
                  data-testid="input-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip Code *</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="33901"
                  data-testid="input-zip-code"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceRadius">Service Radius (miles)</Label>
              <Input
                id="serviceRadius"
                type="number"
                min="0"
                value={formData.serviceRadius}
                onChange={(e) => setFormData({ ...formData, serviceRadius: parseInt(e.target.value) || 0 })}
                placeholder="25"
                data-testid="input-service-radius"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-3">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/join")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!formData.businessName || !formData.description || formData.categories.length === 0 || !formData.city || !formData.zipCode}
              data-testid="button-next"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Step 3: Service Details
  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>Step 2 of 3</span>
            </div>
            <CardTitle className="text-3xl font-playfair">Service Details</CardTitle>
            <CardDescription>
              Add credentials and experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Certifications & Licenses</Label>
              <TagInput
                tags={formData.certifications}
                onChange={(certifications) => setFormData({ ...formData, certifications })}
                placeholder="Add certifications (e.g., Licensed Electrician, Certified Personal Trainer)"
                testId="input-certifications"
              />
              <p className="text-xs text-muted-foreground">
                Press Enter to add each certification
              </p>
            </div>

            <div className="space-y-2">
              <Label>Your Values</Label>
              <TagInput
                tags={formData.values}
                onChange={(values) => setFormData({ ...formData, values })}
                placeholder="Add values (e.g., eco-friendly, local, family-owned)"
                testId="input-values"
              />
              <p className="text-xs text-muted-foreground">
                Share what makes your business special
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-3">
            <Button 
              variant="outline" 
              onClick={() => setStep(2)}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => setStep(4)}
              data-testid="button-next"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Step 4: Contact & Payment
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Step 3 of 3</span>
          </div>
          <CardTitle className="text-3xl font-playfair">Contact & Payment</CardTitle>
          <CardDescription>
            How can customers reach you and pay for services?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone Number *</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="(239) 555-0100"
                data-testid="input-contact-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="contact@yourservice.com"
                data-testid="input-contact-email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://yourwebsite.com"
              data-testid="input-website"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="@yourbusiness"
                data-testid="input-instagram"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={formData.facebook}
                onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                placeholder="facebook.com/yourbusiness"
                data-testid="input-facebook"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Payment Methods Accepted *</Label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_PREFERENCES.map((pref) => (
                <div key={pref} className="flex items-center space-x-2">
                  <Checkbox
                    id={`payment-${pref}`}
                    checked={formData.paymentPreferences.includes(pref)}
                    onCheckedChange={() => togglePaymentPreference(pref)}
                    data-testid={`checkbox-payment-${pref.toLowerCase()}`}
                  />
                  <label
                    htmlFor={`payment-${pref}`}
                    className="text-sm cursor-pointer"
                  >
                    {pref}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Label>Custom Payment Methods</Label>
              <TagInput
                tags={formData.customPaymentPreferences}
                onChange={(customPaymentPreferences) => setFormData({ ...formData, customPaymentPreferences })}
                placeholder="Add custom payment options (e.g., Bitcoin, Stripe)"
                testId="input-custom-payment"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between gap-3">
          <Button 
            variant="outline" 
            onClick={() => setStep(3)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={signupMutation.isPending || !formData.contactPhone || !formData.contactEmail || (formData.paymentPreferences.length === 0 && formData.customPaymentPreferences.length === 0)}
            data-testid="button-complete-signup"
          >
            {signupMutation.isPending ? "Creating Account..." : "Complete Signup"}
            <Check className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
