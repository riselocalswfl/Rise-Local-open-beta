import { Link, useLocation } from "wouter";
import { CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  const getStockStatus = () => {
    if (inventory === 0) return { color: "destructive", text: "Out of Stock" };
    if (inventory < 5) return { color: "default", text: `Only ${inventory} left` };
    return { color: "default", text: "In Stock" };
  };

  const stockStatus = getStockStatus();

  const handleVendorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocation(`/businesses/${vendorId}`);
  };

  return (
    <Card className="le-card overflow-hidden group">
      <Link href={`/businesses/${vendorId}`} data-testid={`link-product-${id}`}>
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
            <div className="pt-2">
              <span className="text-lg font-semibold font-mono" data-testid={`text-price-${id}`}>
                ${(price ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
