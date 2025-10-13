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
  values?: string[];
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
  values,
  isVerified,
  followerCount = 0,
  avatarUrl,
}: VendorCardProps) {
  return (
    <Card className="le-card transition-all duration-200">
      <Link href={`/vendors/${id}`} data-testid={`link-vendor-${id}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={avatarUrl} alt={name || "Vendor"} className="film dark:film-dark" />
              <AvatarFallback className="text-xl" style={{ background: 'var(--le-green)', color: 'white' }}>
                {name?.[0] || "V"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate" data-testid={`text-vendor-name-${id}`}>
                  {name}
                </h3>
                {isVerified && (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--le-green)' }} strokeWidth={1.75} />
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                <MapPin className="w-3 h-3" strokeWidth={1.75} />
                <span>{city}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{bio || "No description available"}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {(categories || []).slice(0, 3).map((category, idx) => (
                  <span key={idx} className="le-chip text-xs">
                    {category}
                  </span>
                ))}
                {(categories || []).length > 3 && (
                  <Badge variant="secondary" className="text-xs rounded-pill">
                    +{(categories || []).length - 3} more
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {followerCount > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" strokeWidth={1.75} />
                    <span>{followerCount} followers</span>
                  </div>
                )}
                {values && values.length > 0 && (
                  <div className="flex flex-wrap gap-1" data-testid={`vendor-values-${id}`}>
                    {values.slice(0, 4).map((value, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="text-xs rounded-pill"
                        data-testid={`badge-value-${value}`}
                      >
                        {value}
                      </Badge>
                    ))}
                    {values.length > 4 && (
                      <Badge variant="secondary" className="text-xs rounded-pill">
                        +{values.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
