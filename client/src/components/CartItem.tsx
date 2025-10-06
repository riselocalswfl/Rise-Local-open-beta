import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CartItemProps {
  id: string;
  name: string;
  vendorName: string;
  price: number;
  quantity: number;
  image?: string;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export default function CartItem({
  id,
  name,
  vendorName,
  price,
  quantity,
  image,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  return (
    <Card className="le-card transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
            {image ? (
              <img src={image} alt={name} className="w-full h-full object-cover film dark:film-dark" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(91, 140, 90, 0.10)' }}>
                <span className="text-2xl font-bold" style={{ color: 'var(--le-green)', opacity: 0.4 }}>{name[0]}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate" data-testid={`text-cart-item-${id}`}>{name}</h4>
            <p className="text-sm text-muted-foreground">{vendorName}</p>
            <p className="text-lg font-semibold font-mono mt-1">${price.toFixed(2)}</p>
          </div>
          <div className="flex flex-col items-end justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(id)}
              className="h-8 w-8 rounded-pill"
              data-testid={`button-remove-${id}`}
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.75} />
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onUpdateQuantity(id, Math.max(1, quantity - 1))}
                className="h-8 w-8 rounded-pill"
                data-testid={`button-decrease-${id}`}
              >
                <Minus className="w-3 h-3" strokeWidth={1.75} />
              </Button>
              <span className="w-8 text-center font-medium" data-testid={`text-quantity-${id}`}>
                {quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onUpdateQuantity(id, quantity + 1)}
                className="h-8 w-8 rounded-pill"
                data-testid={`button-increase-${id}`}
              >
                <Plus className="w-3 h-3" strokeWidth={1.75} />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
