import { Link } from "wouter";
import { Lock, MapPin, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Deal, Vendor } from "@shared/schema";

interface DealCardProps {
  deal: Deal;
  vendor?: Vendor;
  isPremiumUser?: boolean;
  distanceMiles?: number;
}

export default function DealCard({ deal, vendor, isPremiumUser = false, distanceMiles }: DealCardProps) {
  const isPremiumDeal = deal.tier === "premium";
  const isLocked = isPremiumDeal && !isPremiumUser;

  const dealTypeLabels: Record<string, string> = {
    bogo: "Buy One Get One",
    percent: "% Off",
    addon: "Free Add-on",
  };

  const cardContent = (
    <Card
      className={`group overflow-hidden transition-all hover:shadow-lg ${
        isLocked ? "relative" : ""
      }`}
      data-testid={`card-deal-${deal.id}`}
    >
      {isLocked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center p-4">
            <Lock className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="font-medium text-sm">Premium Deal</p>
            <p className="text-xs text-muted-foreground">Upgrade to unlock</p>
          </div>
        </div>
      )}

      <CardContent className={`p-4 ${isLocked ? "blur-sm" : ""}`}>
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-12 w-12 border">
            <AvatarImage src={vendor?.logoUrl || ""} alt={vendor?.businessName || "Vendor"} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {(vendor?.businessName || "V")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">
              {vendor?.businessName || "Local Business"}
            </p>
            <h3 className="font-semibold text-lg leading-tight line-clamp-2">
              {deal.title}
            </h3>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {deal.description}
        </p>

        <div className="flex flex-wrap gap-2">
          {deal.category && (
            <Badge variant="secondary" className="text-xs">
              <Tag className="w-3 h-3 mr-1" />
              {deal.category}
            </Badge>
          )}
          {distanceMiles !== undefined ? (
            <Badge variant="outline" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {distanceMiles} mi away
            </Badge>
          ) : deal.city && (
            <Badge variant="outline" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {deal.city}
            </Badge>
          )}
          <Badge
            variant={deal.dealType === "bogo" ? "default" : "secondary"}
            className="text-xs"
          >
            {dealTypeLabels[deal.dealType] || deal.dealType}
          </Badge>
          {isPremiumDeal && (
            <Badge className="text-xs bg-amber-500 hover:bg-amber-600">
              Premium
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLocked) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="w-full text-left" data-testid={`button-locked-deal-${deal.id}`}>
            {cardContent}
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Premium Deals</DialogTitle>
            <DialogDescription>
              Upgrade to Rise Local Premium to access exclusive deals from local businesses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Premium Benefits:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Access to exclusive premium deals</li>
                <li>• Early access to new vendor offers</li>
                <li>• Special member-only discounts</li>
                <li>• Support local small businesses</li>
              </ul>
            </div>
            <Button className="w-full" data-testid="button-upgrade-premium">
              Upgrade to Premium
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Link href={`/deals/${deal.id}`} data-testid={`link-deal-${deal.id}`}>
      {cardContent}
    </Link>
  );
}
