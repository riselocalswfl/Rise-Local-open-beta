import { Link } from "wouter";
import { MapPin, Clock } from "lucide-react";

export interface DiscoverDeal {
  id: number;
  title: string;
  vendorName: string;
  vendorLogo?: string;
  imageUrl?: string;
  originalPrice: number;
  discountedPrice: number;
  distance?: string;
  pickupTime?: string;
  rating?: number;
  category?: string;
}

interface DiscoverDealCardProps {
  deal: DiscoverDeal;
}

export default function DiscoverDealCard({ deal }: DiscoverDealCardProps) {
  const discountPercent = Math.round(
    ((deal.originalPrice - deal.discountedPrice) / deal.originalPrice) * 100
  );

  return (
    <Link href={`/deals/${deal.id}`}>
      <div
        className="flex-shrink-0 w-[160px] cursor-pointer group"
        data-testid={`card-discover-deal-${deal.id}`}
      >
        <div className="relative rounded-xl overflow-hidden bg-muted aspect-square mb-2">
          {deal.imageUrl ? (
            <img
              src={deal.imageUrl}
              alt={deal.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
              <span className="text-4xl font-bold text-primary/30">
                {deal.vendorName[0]}
              </span>
            </div>
          )}
          
          {discountPercent > 0 && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-full">
              -{discountPercent}%
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="font-medium text-sm line-clamp-1 text-foreground">
            {deal.vendorName}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {deal.title}
          </p>
          
          <div className="flex items-center gap-2 text-xs">
            {deal.distance && (
              <span className="flex items-center gap-0.5 text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {deal.distance}
              </span>
            )}
            {deal.pickupTime && (
              <span className="flex items-center gap-0.5 text-muted-foreground">
                <Clock className="w-3 h-3" />
                {deal.pickupTime}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              ${deal.discountedPrice.toFixed(2)}
            </span>
            {deal.originalPrice !== deal.discountedPrice && (
              <span className="text-xs text-muted-foreground line-through">
                ${deal.originalPrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
