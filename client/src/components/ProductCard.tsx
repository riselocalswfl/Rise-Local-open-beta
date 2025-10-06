import { Link } from "wouter";
import { ShoppingCart, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const getStockStatus = () => {
    if (inventory === 0) return { color: "destructive", text: "Out of Stock" };
    if (inventory < 5) return { color: "default", text: `Only ${inventory} left` };
    return { color: "default", text: "In Stock" };
  };

  const stockStatus = getStockStatus();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log(`Added ${name} to cart`);
  };

  return (
    <Card className="hover-elevate overflow-hidden group">
      <Link href={`/products/${id}`} data-testid={`link-product-${id}`}>
        <div className="aspect-square overflow-hidden bg-muted">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10">
              <span className="text-6xl font-bold text-primary/40">{name[0]}</span>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-lg line-clamp-1" data-testid={`text-product-name-${id}`}>{name}</h3>
              {isVerifiedVendor && (
                <CheckCircle className="w-4 h-4 text-chart-1 flex-shrink-0" />
              )}
            </div>
            <Link
              href={`/vendors/${vendorId}`}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              onClick={(e) => e.stopPropagation()}
              data-testid={`link-vendor-${vendorId}`}
            >
              {vendorName}
            </Link>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">{category}</Badge>
              <Badge variant={stockStatus.color as any} className="text-xs">
                {stockStatus.text}
              </Badge>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex items-center justify-between gap-2">
          <span className="text-2xl font-semibold font-mono" data-testid={`text-price-${id}`}>
            ${price.toFixed(2)}
          </span>
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={inventory === 0}
            data-testid={`button-add-to-cart-${id}`}
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            Add
          </Button>
        </CardFooter>
      </Link>
    </Card>
  );
}
