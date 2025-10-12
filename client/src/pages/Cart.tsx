import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ShoppingCart } from "lucide-react";
import Header from "@/components/Header";
import CartItem from "@/components/CartItem";
import OrderSummary from "@/components/OrderSummary";
import LoyaltyDisplay from "@/components/LoyaltyDisplay";
import { Button } from "@/components/ui/button";
import { getCart, updateCartQuantity, removeFromCart, getCartSubtotal, type CartItem as CartItemType } from "@/lib/cart";

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItemType[]>([]);
  const loyaltyBalance = 150;

  useEffect(() => {
    setCartItems(getCart());
    
    const handleCartUpdate = () => {
      setCartItems(getCart());
    };
    
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const handleUpdateQuantity = (id: string, quantity: number) => {
    const updated = updateCartQuantity(id, quantity);
    setCartItems(updated);
  };

  const handleRemove = (id: string) => {
    const updated = removeFromCart(id);
    setCartItems(updated);
  };

  const subtotal = getCartSubtotal(cartItems);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-16" aria-hidden="true" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold mb-8 flex items-center gap-3" data-testid="heading-shopping-cart">
          <ShoppingCart className="w-8 h-8" />
          Shopping Cart
        </h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Add some products to get started!</p>
            <Button asChild data-testid="button-browse-products">
              <Link href="/products">Browse Products</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map(item => (
                <CartItem
                  key={item.productId}
                  id={item.productId}
                  name={item.name}
                  vendorName={item.vendorName}
                  price={item.price}
                  quantity={item.quantity}
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
