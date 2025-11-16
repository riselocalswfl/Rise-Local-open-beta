import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import Header from "@/components/Header";
import OrderSummary from "@/components/OrderSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { items: cartItems, clearCart, cartTotals } = useCart();
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"pickup" | "delivery">("pickup");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Check authentication status
  const { user, isLoading: isCheckingAuth } = useAuth();

  // Pre-fill email from user profile
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
    if (user?.firstName && user?.lastName) {
      setName(`${user.firstName} ${user.lastName}`);
    }
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isCheckingAuth && !user) {
      window.location.href = '/api/login?returnTo=/checkout';
    }
  }, [user, isCheckingAuth]);

  const { subtotal, tax, buyerFee, grandTotal: total } = cartTotals();

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      if (!phone) {
        throw new Error("Please fill in your phone number");
      }

      // Get fresh cart totals
      const latestTotals = cartTotals();
      
      // Multi-vendor checkout: send cart items with vendor info
      const checkoutData = {
        phone,
        cartItems: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          vendorId: item.vendorId,
          vendorName: item.vendorName,
          image: item.image,
          variantId: item.variantId,
          options: item.options,
        })),
        fulfillmentType: fulfillmentMethod,
        fulfillmentDetails: {
          type: fulfillmentMethod === "pickup" ? "Pickup" as const : "Delivery" as const,
          // Add more fulfillment details as needed
        },
        totals: latestTotals,
      };

      return apiRequest("POST", "/api/checkout", checkoutData);
    },
    onSuccess: () => {
      clearCart();
      
      toast({
        title: "Order Placed Successfully!",
        description: "You earned 10 loyalty points. Check your email for confirmation.",
      });
      
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    },
    onError: () => {
      toast({
        title: "Order Failed",
        description: "There was an error placing your order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = async () => {
    await createOrderMutation.mutateAsync();
  };

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loader-auth-check" />
          </div>
        </main>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-semibold mb-8" data-testid="heading-checkout">Checkout</h1>
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-6">Your cart is empty. Add some products first!</p>
            <Button asChild>
              <a href="/products">Browse Products</a>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-16" aria-hidden="true" />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold mb-8" data-testid="heading-checkout">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    data-testid="input-name"
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">From your account</p>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    data-testid="input-email"
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">From your account</p>
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(239) 555-0123"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    data-testid="input-phone"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fulfillment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={fulfillmentMethod} onValueChange={(v) => setFulfillmentMethod(v as any)}>
                  <div className="flex items-center space-x-2 p-4 rounded-md border hover-elevate">
                    <RadioGroupItem value="pickup" id="pickup" data-testid="radio-pickup" />
                    <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                      <div className="font-medium">Pickup</div>
                      <div className="text-sm text-muted-foreground">Collect from vendor locations</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 rounded-md border hover-elevate">
                    <RadioGroupItem value="delivery" id="delivery" data-testid="radio-delivery" />
                    <Label htmlFor="delivery" className="flex-1 cursor-pointer">
                      <div className="font-medium">Delivery</div>
                      <div className="text-sm text-muted-foreground">Delivered to your address</div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-md text-center">
                  <p className="text-sm text-muted-foreground">
                    Payment processing will be handled by Stripe
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Mock checkout enabled for demo
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <OrderSummary subtotal={subtotal} tax={tax} />
            <Button
              onClick={handleCheckout}
              className="w-full"
              size="lg"
              disabled={createOrderMutation.isPending}
              data-testid="button-place-order"
            >
              {createOrderMutation.isPending ? "Processing..." : "Place Order"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
