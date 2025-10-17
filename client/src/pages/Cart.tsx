import { Link } from "wouter";
import { ShoppingCart, Minus, Plus, X } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { BrandCard, BrandCardBody } from "@/components/ui/BrandCard";
import { useCart } from "@/contexts/CartContext";

export default function Cart() {
  const { items, updateQty, removeItem, cartTotals, clearCart } = useCart();
  const totals = cartTotals();

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-3xl md:text-4xl text-text flex items-center gap-3" data-testid="heading-shopping-cart">
            <ShoppingCart className="w-8 h-8" strokeWidth={1.75} />
            Shopping Cart
          </h1>
          {items.length > 0 && (
            <Button
              variant="ghost"
              onClick={clearCart}
              className="text-text/60 hover:text-destructive"
              data-testid="button-clear-cart"
            >
              Clear Cart
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="w-16 h-16 mx-auto text-text/20 mb-4" strokeWidth={1.5} />
            <h2 className="font-heading text-2xl text-text mb-2">Your cart is empty</h2>
            <p className="text-text/60 mb-6">Start shopping local to support your community!</p>
            <Link href="/products">
              <Button data-testid="button-browse-products">
                Browse Products
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <BrandCard key={`${item.id}-${item.variantId || ""}`} data-testid={`cart-item-${item.id}`}>
                  <BrandCardBody className="p-4">
                    <div className="flex gap-4">
                      {item.image && (
                        <div className="w-24 h-24 rounded-md bg-muted flex-shrink-0 overflow-hidden">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-heading text-lg text-text mb-1" data-testid={`text-item-name-${item.id}`}>
                              {item.name}
                            </h3>
                            {item.vendorName && (
                              <p className="text-sm text-text/60 mb-2">{item.vendorName}</p>
                            )}
                            {item.options && Object.keys(item.options).length > 0 && (
                              <div className="text-xs text-text/50 space-y-1">
                                {Object.entries(item.options).map(([key, value]) => (
                                  <p key={key}>
                                    {key}: {value}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeItem(item.id, item.variantId, item.options)}
                            className="p-2 text-text/40 hover:text-destructive transition flex-shrink-0"
                            data-testid={`button-remove-${item.id}`}
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => updateQty(item.id, item.quantity - 1, item.variantId, item.options)}
                              disabled={item.quantity <= 1}
                              data-testid={`button-decrease-${item.id}`}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-12 text-center font-medium" data-testid={`text-quantity-${item.id}`}>
                              {item.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => updateQty(item.id, item.quantity + 1, item.variantId, item.options)}
                              data-testid={`button-increase-${item.id}`}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-lg font-semibold text-text" data-testid={`text-item-total-${item.id}`}>
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                            <p className="text-xs text-text/50">
                              ${item.price.toFixed(2)} each
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </BrandCardBody>
                </BrandCard>
              ))}
            </div>

            <div className="lg:col-span-1">
              <BrandCard className="sticky top-4">
                <BrandCardBody className="p-6">
                  <h2 className="font-heading text-xl text-text mb-4">Order Summary</h2>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-text/70">
                      <span>Subtotal</span>
                      <span className="font-mono" data-testid="text-summary-subtotal">
                        ${totals.subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-text/70">
                      <span>Tax (7%)</span>
                      <span className="font-mono">${totals.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-text/70">
                      <span>Buyer Fee (3%)</span>
                      <span className="font-mono">${totals.buyerFee.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-border my-3" />
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span className="font-mono" data-testid="text-summary-total">
                        ${totals.grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Link href="/checkout">
                    <Button className="w-full" size="lg" data-testid="button-checkout">
                      Proceed to Checkout
                    </Button>
                  </Link>

                  <div className="mt-4 p-3 rounded-md bg-primary/5 border border-primary/20">
                    <p className="text-xs text-text/70">
                      <strong className="text-primary">Supporting local:</strong> Your purchase directly supports {new Set(items.map(i => i.vendorName)).size} local {new Set(items.map(i => i.vendorName)).size === 1 ? 'vendor' : 'vendors'} in Fort Myers.
                    </p>
                  </div>
                </BrandCardBody>
              </BrandCard>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
