import { Link, useLocation } from "wouter";
import { ShoppingCart, CheckCircle, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  vendorName: string;
  vendorId: string;
  category?: string;
  image?: string;
  inventory: number;
  isVerifiedVendor?: boolean;
  valueTags?: string[];
}

export default function ProductCard({
  id,
  name,
  price,
  vendorName,
  vendorId,
  category = "",
  image,
  inventory,
  isVerifiedVendor = false,
  valueTags = [],
}: ProductCardProps) {
  const [, setLocation] = useLocation();
  const { addItem, openMiniCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  const getStockStatus = () => {
    if (inventory === 0) return { color: "destructive", text: "Out of Stock" };
    if (inventory < 5) return { color: "default", text: `Only ${inventory} left` };
    return { color: "default", text: "In Stock" };
  };

  const stockStatus = getStockStatus();

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity < inventory) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addItem({
      id,
      name,
      price,
      vendorName,
      vendorId,
      image,
    }, quantity);
    
    // Reset quantity and open the MiniCart drawer
    setQuantity(1);
    openMiniCart();
  };

  const handleVendorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocation(`/vendors/${vendorId}`);
  };

  return (
    <Card className="le-card overflow-hidden group">
      <Link href={`/products/${id}`} data-testid={`link-product-${id}`}>
        <div className="aspect-video overflow-hidden bg-muted rounded-t-lg">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(91, 140, 90, 0.10)' }}>
              <span className="text-3xl font-bold" style={{ color: 'var(--le-green)', opacity: 0.4 }}>{name[0]}</span>
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-1">
              <h3 className="font-medium text-sm line-clamp-1" data-testid={`text-product-name-${id}`}>{name}</h3>
              {isVerifiedVendor && (
                <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--le-green)' }} strokeWidth={1.75} />
              )}
            </div>
            <button
              type="button"
              onClick={handleVendorClick}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline text-left"
              data-testid={`link-vendor-${vendorId}`}
            >
              {vendorName}
            </button>
            {valueTags && valueTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {valueTags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] rounded-pill">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-1 flex-wrap mt-1">
              <span className="le-chip text-[10px]">{category}</span>
              <Badge variant={stockStatus.color as any} className="text-[10px] rounded-pill">
                {stockStatus.text}
              </Badge>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-3 pt-0 flex flex-col gap-2">
          <div className="flex items-center justify-between w-full">
            <span className="text-lg font-semibold font-mono" data-testid={`text-price-${id}`}>
              ${(price ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2 w-full">
            <div className="flex items-center border border-border rounded-pill overflow-hidden">
              <button
                onClick={handleDecrement}
                disabled={quantity <= 1 || inventory === 0}
                className="px-2 py-1 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid={`button-decrease-qty-${id}`}
              >
                <Minus className="w-3 h-3" strokeWidth={1.75} />
              </button>
              <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center" data-testid={`text-quantity-${id}`}>
                {quantity}
              </span>
              <button
                onClick={handleIncrement}
                disabled={quantity >= inventory || inventory === 0}
                className="px-2 py-1 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid={`button-increase-qty-${id}`}
              >
                <Plus className="w-3 h-3" strokeWidth={1.75} />
              </button>
            </div>
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={inventory === 0}
              className="rounded-pill flex-1"
              style={{ background: 'var(--le-clay)' }}
              data-testid={`button-add-to-cart-${id}`}
            >
              <ShoppingCart className="w-3 h-3 mr-1" strokeWidth={1.75} />
              Add
            </Button>
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
}
