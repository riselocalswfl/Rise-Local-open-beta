import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Header from "@/components/Header";
import OrderSummary from "@/components/OrderSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CreditCard, Info } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const { items: cartItems, cartTotals } = useCart();
  const { user, isLoading: isCheckingAuth } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isCheckingAuth && !user) {
      window.location.href = '/api/login?returnTo=/checkout';
    }
  }, [user, isCheckingAuth]);

  // Create payment intent when cart items are available
  useEffect(() => {
    if (cartItems.length > 0 && user && !clientSecret && !isLoadingPayment) {
      createPaymentIntent();
    }
  }, [cartItems, user]);

  const createPaymentIntent = async () => {
    setIsLoadingPayment(true);
    try {
      // Group items by vendor and calculate totals
      const itemsByVendor: Record<string, typeof cartItems> = {};
      for (const item of cartItems) {
        const vendorId = item.vendorId || 'unknown';
        if (!itemsByVendor[vendorId]) {
          itemsByVendor[vendorId] = [];
        }
        itemsByVendor[vendorId].push(item);
      }

      // Calculate vendor orders with detailed breakdown
      const vendorOrders = Object.entries(itemsByVendor).map(([vendorId, items]) => {
        const vendorSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const vendorTax = vendorSubtotal * 0.07; // FL sales tax
        const vendorTotal = vendorSubtotal + vendorTax;

        return {
          vendorId,
          subtotalCents: Math.round(vendorSubtotal * 100),
          taxCents: Math.round(vendorTax * 100),
          totalCents: Math.round(vendorTotal * 100),
        };
      });

      const response = await apiRequest("POST", "/api/stripe/create-payment-intent", {
        vendorOrders,
      });

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error("Failed to create payment intent:", error);
    } finally {
      setIsLoadingPayment(false);
    }
  };

  const { subtotal, tax, grandTotal: total } = cartTotals();

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
        <h1 className="text-3xl font-semibold mb-6" data-testid="heading-checkout">Checkout</h1>

        {/* Credit Card Payments Coming Soon Banner */}
        <Alert className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950" data-testid="alert-stripe-coming-soon">
          <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="ml-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="font-semibold">Credit Card Payments Launching Next Week</span>
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  Coming Soon
                </Badge>
              </div>
              <p className="text-sm">
                This checkout flow is ready for testing! Once vendors connect their bank accounts next week, you'll be able to pay with credit cards. 
                For immediate purchases, contact vendors directly using Venmo, CashApp, Zelle, or other payment methods they accept.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm subtotal={subtotal} tax={tax} total={total} />
          </Elements>
        ) : (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loader-payment-intent" />
            <span className="ml-3 text-muted-foreground">Preparing secure checkout...</span>
          </div>
        )}
      </main>
    </div>
  );
}

function CheckoutForm({ subtotal, tax, total }: { subtotal: number; tax: number; total: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { items: cartItems, clearCart } = useCart();
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"pickup" | "delivery">("pickup");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Pre-fill email from user profile
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
    if (user?.firstName && user?.lastName) {
      setName(`${user.firstName} ${user.lastName}`);
    }
  }, [user]);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      if (!phone) {
        throw new Error("Please fill in your phone number");
      }

      // Get fresh cart totals
      const latestTotals = {
        subtotal,
        tax,
        grandTotal: total,
      };
      
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
        },
        totals: latestTotals,
      };

      const response = await apiRequest("POST", "/api/checkout", checkoutData);
      return await response.json();
    },
    onSuccess: (data) => {
      sessionStorage.setItem("lastOrder", JSON.stringify(data));
      clearCart();
      
      toast({
        title: "Order Placed Successfully!",
        description: "You earned loyalty points. Check your email for confirmation.",
      });
      
      setTimeout(() => {
        setLocation("/order-confirmation");
      }, 1000);
    },
    onError: () => {
      toast({
        title: "Order Failed",
        description: "There was an error placing your order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone before submitting
    if (!phone || phone.trim().length === 0) {
      toast({
        title: "Phone Required",
        description: "Please enter your phone number to complete checkout.",
        variant: "destructive",
      });
      return;
    }

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Submit payment to Stripe
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast({
          title: "Payment Error",
          description: submitError.message,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Confirm payment with return URL
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/order-confirmation`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Verify payment succeeded
      if (!paymentIntent || paymentIntent.status !== "succeeded") {
        toast({
          title: "Payment Incomplete",
          description: "Payment requires additional action or was not completed.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Payment successful, create order with payment info
      const latestTotals = {
        subtotal,
        tax,
        grandTotal: total,
      };

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
        },
        totals: latestTotals,
        paymentIntentId: paymentIntent.id,
        paymentStatus: paymentIntent.status,
      };

      const orderResponse = await apiRequest("POST", "/api/checkout", checkoutData);
      const orderData = await orderResponse.json();
      
      sessionStorage.setItem("lastOrder", JSON.stringify(orderData));
      clearCart();

      toast({
        title: "Order Placed Successfully!",
        description: "You earned loyalty points. Check your email for confirmation.",
      });

      setTimeout(() => {
        setLocation("/order-confirmation");
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Checkout Failed",
        description: error.message || "There was an error processing your order.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleCheckout}>
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
              <PaymentElement />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <OrderSummary subtotal={subtotal} tax={tax} />
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!stripe || isProcessing || createOrderMutation.isPending}
            data-testid="button-place-order"
          >
            {isProcessing || createOrderMutation.isPending ? "Processing..." : `Pay $${total.toFixed(2)}`}
          </Button>
        </div>
      </div>
    </form>
  );
}
