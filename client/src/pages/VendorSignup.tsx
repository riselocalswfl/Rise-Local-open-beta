import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/TagInput";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const CATEGORIES = [
  "Food & Beverage",
  "Crafts & Art",
  "Home & Garden",
  "Fashion & Accessories",
  "Health & Wellness",
  "Services",
  "Other"
];

const PAYMENT_METHODS = ["Cash", "Venmo", "PayPal", "Credit Card", "Zelle", "Check"];
const SERVICE_OPTIONS = ["Pickup", "Delivery", "Shipping"];

export default function VendorSignup() {
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
    contactName: "",
    displayName: "",
    bio: "",
    businessType: "", // "vendors" or "eat-local"
    category: "",
    subcategories: [] as string[],
    zipCode: "",
    locationType: "physical",
    serviceOptions: [] as string[],
    hours: "",
    values: [] as string[],
    paymentMethod: "direct",
    paymentHandles: {} as Record<string, string>,
    hasLicense: false,
    hasInsurance: false,
    hasPermits: false,
    isRestaurant: false,
    restaurantType: "",
    servesAlcohol: false,
    hasDineIn: false,
  });

  const signupMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/vendors/signup", data);
    },
    onSuccess: () => {
      toast({
        title: "Welcome to Rise Local!",
        description: "Your vendor account has been created and is pending verification.",
      });
      setLocation("/");
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

    signupMutation.mutate({
      ownerId: user.id,
      ...formData,
    });
  };

  const toggleServiceOption = (option: string) => {
    setFormData(prev => ({
      ...prev,
      serviceOptions: prev.serviceOptions.includes(option)
        ? prev.serviceOptions.filter(o => o !== option)
        : [...prev.serviceOptions, option]
    }));
  };

  // Step 1: Auth
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-playfair">Sign Up as Vendor</CardTitle>
            <CardDescription>
              Sign in with Replit to create your vendor account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => {
                sessionStorage.setItem("returnTo", "/join/vendor");
                window.location.href = "/api/login";
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
              <span>Step 1 of 4</span>
            </div>
            <CardTitle className="text-3xl font-playfair">Business Details</CardTitle>
            <CardDescription>
              Tell us about your business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="The Harvest Table"
                data-testid="input-businessName"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="Jane Smith"
                  data-testid="input-contactName"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (optional)</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Leave blank to use business name"
                  data-testid="input-displayName"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type *</Label>
              <Select 
                value={formData.businessType} 
                onValueChange={(value) => setFormData({ ...formData, businessType: value })}
              >
                <SelectTrigger id="businessType" data-testid="select-businessType">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendors">Vendors (Products & Services)</SelectItem>
                  <SelectItem value="eat-local">Eat Local (Restaurants)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.businessType === "vendors" && (
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category" data-testid="select-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="bio">Business Bio *</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell customers about your business, what makes you special..."
                rows={4}
                data-testid="input-bio"
                required
              />
              <p className="text-xs text-muted-foreground">
                Share your story, what you offer, and what makes you unique
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => setLocation("/join")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => {
                if (formData.businessType === "eat-local") {
                  // Store form data and redirect to restaurant signup
                  sessionStorage.setItem("restaurantSignupData", JSON.stringify({
                    businessName: formData.businessName,
                    contactName: formData.contactName,
                    displayName: formData.displayName,
                    bio: formData.bio,
                  }));
                  setLocation("/join/restaurant");
                } else {
                  setStep(3);
                }
              }}
              disabled={
                !formData.businessName || 
                !formData.contactName || 
                !formData.businessType || 
                !formData.bio ||
                (formData.businessType === "vendors" && !formData.category)
              }
              data-testid="button-next-to-location"
            >
              {formData.businessType === "eat-local" ? "Continue to Restaurant Form" : "Next: Location & Services"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Step 3: Location & Services
  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>Step 2 of 4</span>
            </div>
            <CardTitle className="text-3xl font-playfair">Location & Services</CardTitle>
            <CardDescription>
              How will customers find and get your products?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip Code *</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="33901"
                  maxLength={5}
                  data-testid="input-zipCode"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationType">Location Type *</Label>
                <Select 
                  value={formData.locationType} 
                  onValueChange={(value) => setFormData({ ...formData, locationType: value })}
                >
                  <SelectTrigger id="locationType" data-testid="select-locationType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Physical Location</SelectItem>
                    <SelectItem value="mobile">Mobile/Delivery Only</SelectItem>
                    <SelectItem value="online">Online Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Service Options * (select all that apply)</Label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_OPTIONS.map((option) => {
                  const isSelected = formData.serviceOptions.includes(option);
                  return (
                    <Badge
                      key={option}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer hover-elevate active-elevate-2"
                      onClick={() => toggleServiceOption(option)}
                      data-testid={`badge-service-${option}`}
                    >
                      {isSelected && <Check className="w-3 h-3 mr-1" />}
                      {option}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours">Business Hours (optional)</Label>
              <Textarea
                id="hours"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                placeholder="Mon-Fri: 9am-6pm, Sat: 10am-4pm, Sun: Closed"
                rows={3}
                data-testid="input-hours"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              data-testid="button-back-to-basics"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => setStep(4)}
              disabled={!formData.zipCode || formData.serviceOptions.length === 0}
              data-testid="button-next-to-values"
            >
              Next: Values & Payment
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Step 4: Values & Payment
  if (step === 4) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>Step 3 of 4</span>
            </div>
            <CardTitle className="text-3xl font-playfair">Values & Payment</CardTitle>
            <CardDescription>
              Share what makes your business special
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 overflow-y-auto">
            {/* Business Values */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1">Business Values (optional)</h3>
                <p className="text-sm text-muted-foreground">
                  Add custom value tags that represent your business (e.g., "organic", "family-owned", "sustainable"). Customers can filter by these values.
                </p>
              </div>
              <TagInput
                tags={formData.values}
                onChange={(newValues) => setFormData({ ...formData, values: newValues })}
                placeholder="Type a value and press Enter..."
                maxTags={10}
                testId="input-values"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1">Payment Processing *</h3>
                <p className="text-sm text-muted-foreground">
                  How will you accept payments?
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border rounded-md">
                  <input
                    type="radio"
                    id="direct"
                    name="paymentMethod"
                    value="direct"
                    checked={formData.paymentMethod === "direct"}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="mt-1"
                    data-testid="radio-payment-direct"
                  />
                  <div className="flex-1">
                    <Label htmlFor="direct" className="cursor-pointer font-semibold">
                      Direct to Vendor (Recommended)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      You handle all payments directly. No platform fees.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-md opacity-50">
                  <input
                    type="radio"
                    id="platform"
                    name="paymentMethod"
                    value="platform"
                    checked={formData.paymentMethod === "platform"}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="mt-1"
                    disabled
                    data-testid="radio-payment-platform"
                  />
                  <div className="flex-1">
                    <Label htmlFor="platform" className="cursor-pointer font-semibold">
                      Through Platform (Coming Soon)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Platform processes payments. 3% buyer fee applies.
                    </p>
                  </div>
                </div>
              </div>

              {formData.paymentMethod === "direct" && (
                <div className="bg-muted/50 p-4 rounded-md space-y-3">
                  <p className="text-sm font-semibold">Accepted Payment Methods (select all that apply)</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {PAYMENT_METHODS.map((method) => (
                      <div key={method} className="flex items-center gap-2">
                        <Checkbox
                          id={`payment-${method}`}
                          checked={method in formData.paymentHandles}
                          onCheckedChange={(checked) => {
                            const isChecked = checked === true;
                            setFormData(prev => ({
                              ...prev,
                              paymentHandles: isChecked
                                ? { ...prev.paymentHandles, [method]: "" }
                                : Object.fromEntries(
                                    Object.entries(prev.paymentHandles).filter(([k]) => k !== method)
                                  )
                            }));
                          }}
                          data-testid={`checkbox-payment-${method}`}
                        />
                        <Label htmlFor={`payment-${method}`} className="cursor-pointer text-sm">
                          {method}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {Object.keys(formData.paymentHandles).length > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="text-sm font-semibold">Payment Details (optional)</p>
                      {Object.keys(formData.paymentHandles).map((method) => (
                        <div key={method} className="space-y-1">
                          <Label htmlFor={`handle-${method}`} className="text-xs">
                            {method} {method !== "Cash" && method !== "Check" ? "Username/Handle" : "Instructions"}
                          </Label>
                          <Input
                            id={`handle-${method}`}
                            value={formData.paymentHandles[method] || ""}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              paymentHandles: { ...prev.paymentHandles, [method]: e.target.value }
                            }))}
                            placeholder={method === "Venmo" ? "@username" : method === "PayPal" ? "email@example.com" : ""}
                            data-testid={`input-payment-handle-${method}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-4 mt-auto">
            <Button
              variant="outline"
              onClick={() => setStep(3)}
              data-testid="button-back-to-location"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => setStep(5)}
              disabled={Object.keys(formData.paymentHandles).length === 0}
              data-testid="button-next-to-compliance"
            >
              Next: Compliance
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Step 5: Compliance & Restaurant Details
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Step 4 of 4</span>
          </div>
          <CardTitle className="text-3xl font-playfair">Compliance & Details</CardTitle>
          <CardDescription>
            Final details to complete your vendor profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Compliance */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">Business Compliance</h3>
              <p className="text-sm text-muted-foreground">
                Check all that apply to your business
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasLicense"
                  checked={formData.hasLicense}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasLicense: checked as boolean })}
                  data-testid="checkbox-hasLicense"
                />
                <Label htmlFor="hasLicense" className="cursor-pointer">
                  Business License
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasInsurance"
                  checked={formData.hasInsurance}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasInsurance: checked as boolean })}
                  data-testid="checkbox-hasInsurance"
                />
                <Label htmlFor="hasInsurance" className="cursor-pointer">
                  Business Insurance
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasPermits"
                  checked={formData.hasPermits}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasPermits: checked as boolean })}
                  data-testid="checkbox-hasPermits"
                />
                <Label htmlFor="hasPermits" className="cursor-pointer">
                  Required Permits (if applicable)
                </Label>
              </div>
            </div>
          </div>

          {/* Restaurant Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isRestaurant"
                checked={formData.isRestaurant}
                onCheckedChange={(checked) => setFormData({ ...formData, isRestaurant: checked as boolean })}
                data-testid="checkbox-isRestaurant"
              />
              <Label htmlFor="isRestaurant" className="cursor-pointer font-semibold">
                This is a restaurant or food service business
              </Label>
            </div>

            {formData.isRestaurant && (
              <div className="bg-muted/50 p-4 rounded-md space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurantType">Restaurant Type</Label>
                  <Select 
                    value={formData.restaurantType} 
                    onValueChange={(value) => setFormData({ ...formData, restaurantType: value })}
                  >
                    <SelectTrigger id="restaurantType" data-testid="select-restaurantType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-service">Full Service</SelectItem>
                      <SelectItem value="fast-casual">Fast Casual</SelectItem>
                      <SelectItem value="cafe">Cafe/Coffee Shop</SelectItem>
                      <SelectItem value="food-truck">Food Truck</SelectItem>
                      <SelectItem value="catering">Catering</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="servesAlcohol"
                      checked={formData.servesAlcohol}
                      onCheckedChange={(checked) => setFormData({ ...formData, servesAlcohol: checked as boolean })}
                      data-testid="checkbox-servesAlcohol"
                    />
                    <Label htmlFor="servesAlcohol" className="cursor-pointer">
                      Serves Alcohol
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasDineIn"
                      checked={formData.hasDineIn}
                      onCheckedChange={(checked) => setFormData({ ...formData, hasDineIn: checked as boolean })}
                      data-testid="checkbox-hasDineIn"
                    />
                    <Label htmlFor="hasDineIn" className="cursor-pointer">
                      Dine-In Available
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setStep(4)}
            data-testid="button-back-to-values"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={signupMutation.isPending}
            data-testid="button-complete-vendor-signup"
          >
            {signupMutation.isPending ? "Creating Account..." : "Complete Signup"}
            <Check className="w-4 h-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
