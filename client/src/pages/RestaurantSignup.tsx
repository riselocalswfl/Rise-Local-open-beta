import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function RestaurantSignup() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    restaurantName: "",
    location: "",
    description: "",
    localPercent: "",
    farmPartners: "",
  });

  // Load data from VendorSignup if available
  useEffect(() => {
    const savedData = sessionStorage.getItem("restaurantSignupData");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setFormData(prev => ({
        ...prev,
        restaurantName: parsed.businessName || "",
        description: parsed.bio || "",
      }));
    }
  }, []);

  const signupMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/vendors/signup", data);
    },
    onSuccess: () => {
      sessionStorage.removeItem("restaurantSignupData");
      toast({
        title: "Welcome to Eat Local!",
        description: "Your restaurant profile has been created and is pending verification.",
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

    // Get saved data from sessionStorage
    const savedData = sessionStorage.getItem("restaurantSignupData");
    const parsed = savedData ? JSON.parse(savedData) : {};

    signupMutation.mutate({
      ownerId: user.id,
      businessName: formData.restaurantName,
      contactName: parsed.contactName || "",
      displayName: parsed.displayName || "",
      bio: formData.description,
      category: "Food & Beverage",
      categories: ["Food & Beverage"],
      city: formData.location,
      zipCode: "33901", // Default Fort Myers zip
      locationType: "physical",
      serviceOptions: ["Pickup"],
      localMenuPercent: parseInt(formData.localPercent) || 0,
      restaurantSources: formData.farmPartners,
      paymentMethod: "direct",
      paymentHandles: {},
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-playfair">Eat Local Restaurant Signup</CardTitle>
          <CardDescription>
            Join our network of restaurants sourcing from local farms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="restaurantName">Restaurant Name *</Label>
            <Input
              id="restaurantName"
              value={formData.restaurantName}
              onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
              placeholder="The Local Kitchen"
              data-testid="input-restaurantName"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location (city or area) *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Fort Myers"
              data-testid="input-location"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Short description or tagline *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Farm-to-table dining featuring seasonal ingredients from local growers..."
              rows={4}
              data-testid="input-description"
              required
            />
            <p className="text-xs text-muted-foreground">
              Tell customers about your restaurant and commitment to local sourcing
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="localPercent">Approx. percentage of locally sourced ingredients *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="localPercent"
                type="number"
                min="0"
                max="100"
                value={formData.localPercent}
                onChange={(e) => setFormData({ ...formData, localPercent: e.target.value })}
                placeholder="60"
                className="max-w-[100px]"
                data-testid="input-localPercent"
                required
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Estimate the percentage of your menu sourced from local farms and producers
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="farmPartners">Local Farm Partners (optional)</Label>
            <Textarea
              id="farmPartners"
              value={formData.farmPartners}
              onChange={(e) => setFormData({ ...formData, farmPartners: e.target.value })}
              placeholder="Smith Family Farm, Green Valley Gardens, Coastal Seafood Co."
              rows={3}
              data-testid="input-farmPartners"
            />
            <p className="text-xs text-muted-foreground">
              List the local farms and producers you partner with
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/join/vendor")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !formData.restaurantName || 
              !formData.location || 
              !formData.description || 
              !formData.localPercent ||
              signupMutation.isPending
            }
            data-testid="button-complete-restaurant-signup"
          >
            {signupMutation.isPending ? "Creating Account..." : "Complete Signup"}
            <Check className="w-4 h-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
