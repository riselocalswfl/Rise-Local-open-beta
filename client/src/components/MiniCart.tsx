import { Link } from "wouter";
import { ShoppingCart, X, ArrowRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";

export default function MiniCart() {
  const { items, itemCount, removeItem, cartTotals } = useCart();
  const [open, setOpen] = useState(false);
  const totals = cartTotals();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="relative p-2 text-text/80 hover:text-text transition"
          data-testid="button-cart"
        >
          <ShoppingCart className="w-5 h-5" strokeWidth={1.75} />
          {itemCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              data-testid="badge-cart-count"
            >
              {itemCount}
            </Badge>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md !bg-bg flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-heading text-2xl">Your Cart</SheetTitle>
          <SheetDescription>
            {itemCount === 0
              ? "Your cart is empty"
              : `${itemCount} ${itemCount === 1 ? "item" : "items"} in your cart`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col flex-1 min-h-0 mt-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
              <ShoppingCart className="w-16 h-16 text-text/20 mb-4" strokeWidth={1.5} />
              <p className="text-text/60 mb-4">Start shopping to add items</p>
              <Link href="/products">
                <Button onClick={() => setOpen(false)} data-testid="button-browse-products">
                  Browse Products
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                {items.map((item) => (
                  <div
                    key={`${item.id}-${item.variantId || ""}`}
                    className="flex gap-3 p-3 rounded-md bg-card border border-border"
                    data-testid={`cart-item-${item.id}`}
                  >
                    {item.image && (
                      <div className="w-16 h-16 rounded-md bg-muted flex-shrink-0 overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate" data-testid={`text-item-name-${item.id}`}>
                        {item.name}
                      </h4>
                      {item.vendorName && (
                        <p className="text-xs text-text/60">{item.vendorName}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm font-medium font-mono">
                          ${item.price.toFixed(2)} × {item.quantity}
                        </p>
                        <button
                          onClick={() => removeItem(item.id, item.variantId, item.options)}
                          className="p-1 text-text/40 hover:text-destructive transition"
                          data-testid={`button-remove-${item.id}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-text/70">
                    <span>Subtotal</span>
                    <span className="font-mono" data-testid="text-subtotal">
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
                  <div className="flex justify-between text-base font-semibold pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="font-mono" data-testid="text-total">
                      ${totals.grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Link href="/cart" className="block">
                  <Button
                    className="w-full"
                    onClick={() => setOpen(false)}
                    data-testid="button-view-cart"
                  >
                    View Cart
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
