import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { VALUE_META, ALL_VALUE_TAGS, type ValueTag } from "@shared/values";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const DIETARY_OPTIONS = ["vegan", "vegetarian", "glutenFree", "dairyFree", "nutFree", "lowSugar"] as const;

export default function BuyerSignup() {
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
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    zipCode: "",
    travelRadius: 10,
    dietaryPreferences: [] as string[],
    userValues: [] as string[],
    emailNotifications: true,
    smsNotifications: false,
  });

  const signupMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/users/buyer/signup", data);
    },
    onSuccess: () => {
      toast({
        title: "Welcome to Rise Local!",
        description: "Your buyer account has been created successfully.",
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
      userId: user.id,
      ...formData,
    });
  };

  const toggleDietary = (value: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryPreferences: prev.dietaryPreferences.includes(value)
        ? prev.dietaryPreferences.filter(v => v !== value)
        : [...prev.dietaryPreferences, value]
    }));
  };

  const toggleValue = (value: string) => {
    setFormData(prev => ({
      ...prev,
      userValues: prev.userValues.includes(value)
        ? prev.userValues.filter(v => v !== value)
        : [...prev.userValues, value]
    }));
  };

  // Step 1: Auth (Replit Auth)
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-playfair">Sign Up as Buyer</CardTitle>
            <CardDescription>
              Sign in with Replit to create your buyer account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => {
                sessionStorage.setItem("returnTo", "/join/buyer");
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

  // Step 2: Personal Info
  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>Step 1 of 2</span>
            </div>
            <CardTitle className="text-3xl font-playfair">Personal Information</CardTitle>
            <CardDescription>
              Tell us a bit about yourself
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                data-testid="input-email"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  data-testid="input-firstName"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  data-testid="input-lastName"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(239) 555-0123"
                data-testid="input-phone"
                required
              />
            </div>

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
                <Label htmlFor="travelRadius">
                  Travel Radius (miles) - {formData.travelRadius}
                </Label>
                <Input
                  id="travelRadius"
                  type="range"
                  min="1"
                  max="50"
                  value={formData.travelRadius}
                  onChange={(e) => setFormData({ ...formData, travelRadius: parseInt(e.target.value) })}
                  data-testid="input-travelRadius"
                />
                <p className="text-xs text-muted-foreground">
                  How far you're willing to travel for pickup
                </p>
              </div>
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
              onClick={() => setStep(3)}
              disabled={!formData.email || !formData.firstName || !formData.lastName || !formData.phone || !formData.zipCode}
              data-testid="button-next-to-preferences"
            >
              Next: Preferences
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Step 3: Preferences
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Step 2 of 2</span>
          </div>
          <CardTitle className="text-3xl font-playfair">Your Preferences</CardTitle>
          <CardDescription>
            Help us personalize your shopping experience (optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Dietary Preferences */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">Dietary Preferences</h3>
              <p className="text-sm text-muted-foreground">
                Select any dietary restrictions or preferences
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((option) => {
                const meta = VALUE_META[option as ValueTag];
                const isSelected = formData.dietaryPreferences.includes(option);
                return (
                  <Badge
                    key={option}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer hover-elevate active-elevate-2"
                    onClick={() => toggleDietary(option)}
                    data-testid={`badge-dietary-${option}`}
                  >
                    {isSelected && <Check className="w-3 h-3 mr-1" />}
                    {meta?.label || option}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Shopping Values */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">Shopping Values</h3>
              <p className="text-sm text-muted-foreground">
                What matters to you when shopping? Select all that apply.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_VALUE_TAGS.filter(tag => !DIETARY_OPTIONS.includes(tag as any)).map((tag) => {
                const meta = VALUE_META[tag];
                const isSelected = formData.userValues.includes(tag);
                return (
                  <Badge
                    key={tag}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer hover-elevate active-elevate-2"
                    onClick={() => toggleValue(tag)}
                    data-testid={`badge-value-${tag}`}
                  >
                    {isSelected && <Check className="w-3 h-3 mr-1" />}
                    {meta?.label || tag}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Notifications */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">Notifications</h3>
              <p className="text-sm text-muted-foreground">
                How would you like to hear about new products and events?
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="emailNotifications"
                  checked={formData.emailNotifications}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, emailNotifications: checked as boolean })
                  }
                  data-testid="checkbox-emailNotifications"
                />
                <Label htmlFor="emailNotifications" className="cursor-pointer">
                  Email notifications
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="smsNotifications"
                  checked={formData.smsNotifications}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, smsNotifications: checked as boolean })
                  }
                  data-testid="checkbox-smsNotifications"
                />
                <Label htmlFor="smsNotifications" className="cursor-pointer">
                  SMS notifications
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setStep(2)}
            data-testid="button-back-to-info"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={signupMutation.isPending}
            data-testid="button-complete-signup"
          >
            {signupMutation.isPending ? "Creating Account..." : "Complete Signup"}
            <Check className="w-4 h-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
