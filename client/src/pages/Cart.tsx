import { useState } from "react";
import { Link } from "wouter";
import { ShoppingCart } from "lucide-react";
import Header from "@/components/Header";
import CartItem from "@/components/CartItem";
import OrderSummary from "@/components/OrderSummary";
import LoyaltyDisplay from "@/components/LoyaltyDisplay";
import { Button } from "@/components/ui/button";

export default function Cart() {
  // todo: remove mock functionality
  const [cartItems, setCartItems] = useState([
    {
      id: "1",
      name: "Sourdough Bread",
      vendorName: "Artisan Bakery",
      price: 8.99,
      quantity: 2,
    },
    {
      id: "2",
      name: "Ginger Kombucha",
      vendorName: "Tropical Kombucha Co.",
      price: 6.50,
      quantity: 3,
    },
    {
      id: "3",
      name: "Succulent Collection",
      vendorName: "Green Thumb Gardens",
      price: 24.99,
      quantity: 1,
    },
  ]);

  const loyaltyBalance = 150;

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setCartItems(items =>
      items.map(item => item.id === id ? { ...item, quantity } : item)
    );
  };

  const handleRemove = (id: string) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold mb-8 flex items-center gap-3">
          <ShoppingCart className="w-8 h-8" />
          Shopping Cart
        </h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Add some products to get started!</p>
            <Button asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map(item => (
                <CartItem
                  key={item.id}
                  {...item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemove}
                />
              ))}
            </div>
            <div className="space-y-4">
              <LoyaltyDisplay balance={loyaltyBalance} />
              <OrderSummary subtotal={subtotal} />
              <Button asChild className="w-full" size="lg" data-testid="button-checkout">
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
