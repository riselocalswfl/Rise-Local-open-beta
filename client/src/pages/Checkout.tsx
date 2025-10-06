import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import OrderSummary from "@/components/OrderSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"pickup" | "delivery">("pickup");

  // todo: remove mock functionality
  const cartItems = [
    { id: "1", name: "Sourdough Bread", price: 8.99, quantity: 2 },
    { id: "2", name: "Ginger Kombucha", price: 6.50, quantity: 3 },
    { id: "3", name: "Succulent Collection", price: 24.99, quantity: 1 },
  ];

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = () => {
    // todo: replace with real Stripe payment processing
    console.log("Processing checkout with fulfillment method:", fulfillmentMethod);
    
    toast({
      title: "Order Placed Successfully!",
      description: "You earned 10 loyalty points. Check your email for confirmation.",
    });

    // Simulate successful order
    setTimeout(() => {
      setLocation("/");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="buyer@local.exchange"
                    defaultValue="buyer@local.exchange"
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(239) 555-0123"
                    data-testid="input-phone"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Fulfillment Method */}
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

            {/* Payment Method - Stripe Ready */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-md text-center">
                  <p className="text-sm text-muted-foreground">
                    {/* STRIPE INTEGRATION POINT */}
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
            <OrderSummary subtotal={subtotal} />
            <Button
              onClick={handleCheckout}
              className="w-full"
              size="lg"
              data-testid="button-place-order"
            >
              Place Order
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              By placing this order, you agree to our terms and conditions
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
