import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp } from "lucide-react";
import type { LoyaltyTier } from "@shared/schema";

interface LoyaltyData {
  points: number;
  currentTier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  pointsToNextTier: number | null;
}

export default function LoyaltyDisplay() {
  const { data, isLoading } = useQuery<LoyaltyData>({
    queryKey: ["/api/loyalty/my-points"],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-loyalty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Loyalty Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { points, currentTier, nextTier, pointsToNextTier } = data;
  const progressPercent = nextTier && pointsToNextTier !== null
    ? Math.min(100, ((points - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100)
    : 100;

  return (
    <Card data-testid="card-loyalty">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Loyalty Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold" data-testid="text-loyalty-points">{points.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Points</p>
          </div>
          <Badge 
            style={{ backgroundColor: currentTier.color, color: '#fff' }}
            className="text-sm px-3 py-1"
            data-testid="badge-loyalty-tier"
          >
            {currentTier.name}
          </Badge>
        </div>

        {nextTier && pointsToNextTier !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress to {nextTier.name}</span>
              <span className="font-semibold flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {pointsToNextTier.toLocaleString()} pts to go
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" data-testid="progress-loyalty" />
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-sm font-semibold mb-2">Current Benefits:</p>
          <ul className="text-sm space-y-1 text-muted-foreground">
            {currentTier.benefits.map((benefit, i) => (
              <li key={i} className="flex items-start gap-2" data-testid={`text-benefit-${i}`}>
                <span className="text-primary mt-0.5">•</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
