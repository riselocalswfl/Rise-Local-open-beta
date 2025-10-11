import { Link } from "wouter";
import { MapPin, CheckCircle, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VALUE_META, type ValueTag } from "@/../../shared/values";

interface VendorCardProps {
  id: string;
  name: string;
  bio: string;
  city: string;
  categories: string[];
  values?: ValueTag[];
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
  values = [],
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
              <AvatarImage src={avatarUrl} alt={name} className="film dark:film-dark" />
              <AvatarFallback className="text-xl" style={{ background: 'var(--le-green)', color: 'white' }}>
                {name[0]}
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
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{bio}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {categories.slice(0, 3).map((category, idx) => (
                  <span key={idx} className="le-chip text-xs">
                    {category}
                  </span>
                ))}
                {categories.length > 3 && (
                  <Badge variant="secondary" className="text-xs rounded-pill">
                    +{categories.length - 3} more
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
                {(() => {
                  const validValues = values.filter(v => v in VALUE_META);
                  return validValues.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {validValues.slice(0, 4).map((value) => (
                        <Tooltip key={value}>
                          <TooltipTrigger asChild>
                            <span className="inline-block">
                              <Badge 
                                variant="secondary" 
                                className="text-xs cursor-help" 
                                data-testid={`badge-vendor-value-${value}`}
                              >
                                {VALUE_META[value].label}
                              </Badge>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{VALUE_META[value].description}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {validValues.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{validValues.length - 4}
                        </Badge>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
