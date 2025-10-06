import { Link } from "wouter";
import { MapPin, CheckCircle, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface VendorCardProps {
  id: string;
  name: string;
  bio: string;
  city: string;
  categories: string[];
  isVerified: boolean;
  followerCount?: number;
  avatarUrl?: string;
}

export default function VendorCard({
  id,
  name,
  bio,
  city,
  categories,
  isVerified,
  followerCount = 0,
  avatarUrl,
}: VendorCardProps) {
  return (
    <Card className="hover-elevate">
      <Link href={`/vendors/${id}`} data-testid={`link-vendor-${id}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={avatarUrl} alt={name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate" data-testid={`text-vendor-name-${id}`}>
                  {name}
                </h3>
                {isVerified && (
                  <CheckCircle className="w-5 h-5 text-chart-1 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                <MapPin className="w-3 h-3" />
                <span>{city}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{bio}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {categories.slice(0, 3).map((category, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {category}
                  </Badge>
                ))}
                {categories.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{categories.length - 3} more
                  </Badge>
                )}
              </div>
              {followerCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{followerCount} followers</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
