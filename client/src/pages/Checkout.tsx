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
import { getCart, clearCart, getCartSubtotal, type CartItem } from "@/lib/cart";
import { apiRequest } from "@/lib/queryClient";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"pickup" | "delivery">("pickup");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setCartItems(getCart());
    
    const handleCartUpdate = () => {
      setCartItems(getCart());
    };
    
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const subtotal = getCartSubtotal(cartItems);
  const buyerFee = subtotal * 0.03;
  const total = subtotal + buyerFee;

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const latestCart = getCart();
      const latestSubtotal = getCartSubtotal(latestCart);
      const latestBuyerFee = latestSubtotal * 0.03;
      const latestTotal = latestSubtotal + latestBuyerFee;
      
      const order = {
        buyerId: "e2b77df8-61aa-4002-88f4-955f3da3ddfe",
        status: "pending",
        fulfillmentMethod,
        subtotal: latestSubtotal.toString(),
        buyerFee: latestBuyerFee.toString(),
        total: latestTotal.toString(),
      };

      const items = latestCart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.price.toString(),
      }));

      return apiRequest("POST", "/api/orders", { order, items });
    },
    onSuccess: () => {
      clearCart();
      setCartItems([]);
      
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
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="buyer@riselocal.com"
                    defaultValue="buyer@test.com"
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
            <OrderSummary subtotal={subtotal} />
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
