import { Link, useLocation } from "wouter";
import { ShoppingCart, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { addToCart } from "@/lib/cart";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  vendorName: string;
  vendorId: string;
  category: string;
  image?: string;
  inventory: number;
  isVerifiedVendor?: boolean;
}

export default function ProductCard({
  id,
  name,
  price,
  vendorName,
  vendorId,
  category,
  image,
  inventory,
  isVerifiedVendor = false,
}: ProductCardProps) {
  const [, setLocation] = useLocation();

  const getStockStatus = () => {
    if (inventory === 0) return { color: "destructive", text: "Out of Stock" };
    if (inventory < 5) return { color: "default", text: `Only ${inventory} left` };
    return { color: "default", text: "In Stock" };
  };

  const stockStatus = getStockStatus();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addToCart({
      productId: id,
      name,
      price,
      vendorName,
    });
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
              className="w-full h-full object-cover film dark:film-dark"
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
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <span className="le-chip text-[10px]">{category}</span>
              <Badge variant={stockStatus.color as any} className="text-[10px] rounded-pill">
                {stockStatus.text}
              </Badge>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-3 pt-0 flex items-center justify-between gap-2">
          <span className="text-lg font-semibold font-mono" data-testid={`text-price-${id}`}>
            ${price.toFixed(2)}
          </span>
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={inventory === 0}
            className="rounded-pill"
            style={{ background: 'var(--le-clay)' }}
            data-testid={`button-add-to-cart-${id}`}
          >
            <ShoppingCart className="w-3 h-3 mr-1" strokeWidth={1.75} />
            Add
          </Button>
        </CardFooter>
      </Link>
    </Card>
  );
}
