import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Clock, Store, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import DetailHeader from "@/components/layout/DetailHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface RedemptionData {
  id: string;
  dealId: string;
  redemptionCode: string;
  status: "claimed" | "redeemed" | "expired" | "voided";
  claimedAt: string;
  claimExpiresAt: string;
  redeemedAt?: string;
  isExpired: boolean;
  deal: {
    id: string;
    title: string;
    description: string;
    finePrint?: string;
    tier: string;
    vendorId: string;
    vendorName: string;
  } | null;
}

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "Expired";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getStatusDisplay(status: string, isExpired: boolean): { label: string; color: string; icon: JSX.Element } {
  if (isExpired || status === "expired") {
    return { label: "Expired", color: "bg-muted text-muted-foreground", icon: <XCircle className="h-4 w-4" /> };
  }
  switch (status) {
    case "claimed":
      return { label: "Active", color: "bg-green-100 text-green-800", icon: <Clock className="h-4 w-4" /> };
    case "redeemed":
      return { label: "Redeemed", color: "bg-primary/10 text-primary", icon: <CheckCircle className="h-4 w-4" /> };
    case "voided":
      return { label: "Voided", color: "bg-muted text-muted-foreground", icon: <XCircle className="h-4 w-4" /> };
    default:
      return { label: status, color: "bg-muted text-muted-foreground", icon: <AlertTriangle className="h-4 w-4" /> };
  }
}

export default function ClaimedDealScreen() {
  const { id, redemptionId } = useParams<{ id: string; redemptionId: string }>();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const { data: redemption, isLoading, error } = useQuery<RedemptionData>({
    queryKey: ["/api/redemptions", redemptionId],
    queryFn: async () => {
      const res = await fetch(`/api/redemptions/${redemptionId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch redemption");
      return res.json();
    },
    enabled: !!redemptionId,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!redemption || redemption.status !== "claimed") return;

    const calculateTimeRemaining = () => {
      const expiresAt = new Date(redemption.claimExpiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeRemaining(remaining);
      return remaining;
    };

    calculateTimeRemaining();

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [redemption]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader title="Your Deal" />
        <div className="max-w-md mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !redemption) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader title="Deal Not Found" />
        <div className="max-w-md mx-auto px-4 py-8 text-center space-y-4">
          <XCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Redemption Not Found</h2>
          <p className="text-muted-foreground">This deal claim may have expired or doesn't exist.</p>
          <Link href="/discover">
            <Button data-testid="button-back-discover">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Deals
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(redemption.status, redemption.isExpired);
  const isActive = redemption.status === "claimed" && !redemption.isExpired && timeRemaining > 0;
  const isUrgent = isActive && timeRemaining < 120;

  return (
    <div className="min-h-screen bg-background">
      <DetailHeader title="Your Deal Code" />
      
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <Card className={`overflow-hidden ${isActive ? "border-primary" : ""}`} data-testid="card-claimed-deal">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <Badge className={statusDisplay.color} data-testid="badge-status">
                {statusDisplay.icon}
                <span className="ml-1">{statusDisplay.label}</span>
              </Badge>
              {isActive && (
                <div className={`flex items-center gap-2 font-mono text-lg font-semibold ${isUrgent ? "text-destructive" : "text-muted-foreground"}`} data-testid="text-countdown">
                  <Clock className={`h-5 w-5 ${isUrgent ? "animate-pulse" : ""}`} />
                  {formatTimeRemaining(timeRemaining)}
                </div>
              )}
            </div>

            {isActive && (
              <div className="bg-primary/5 rounded-xl p-6 text-center" data-testid="container-code">
                <p className="text-sm text-muted-foreground mb-2">Show this code to the business</p>
                <div className="font-mono text-5xl font-bold tracking-widest text-primary" data-testid="text-redemption-code">
                  {redemption.redemptionCode}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Valid for {Math.ceil(timeRemaining / 60)} minute{timeRemaining >= 120 ? "s" : ""}
                </p>
              </div>
            )}

            {redemption.status === "redeemed" && (
              <div className="bg-green-50 rounded-xl p-6 text-center" data-testid="container-redeemed">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-green-800">Successfully Redeemed</p>
                <p className="text-sm text-green-600 mt-1">
                  {redemption.redeemedAt && new Date(redemption.redeemedAt).toLocaleString()}
                </p>
              </div>
            )}

            {(redemption.isExpired || redemption.status === "expired") && (
              <div className="bg-muted rounded-xl p-6 text-center" data-testid="container-expired">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="font-semibold">Code Expired</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This code is no longer valid. You can claim a new one if available.
                </p>
              </div>
            )}

            {redemption.status === "voided" && (
              <div className="bg-muted rounded-xl p-6 text-center" data-testid="container-voided">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="font-semibold">Claim Voided</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This claim was voided by the business.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {redemption.deal && (
          <Card data-testid="card-deal-info">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-lg" data-testid="text-deal-title">{redemption.deal.title}</h3>
              <p className="text-muted-foreground text-sm" data-testid="text-deal-description">{redemption.deal.description}</p>
              
              {redemption.deal.finePrint && (
                <div className="text-xs text-muted-foreground border-t pt-3 mt-3" data-testid="text-fine-print">
                  <p className="font-medium mb-1">Fine Print:</p>
                  <p>{redemption.deal.finePrint}</p>
                </div>
              )}

              {redemption.deal.vendorName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                  <Store className="h-4 w-4" />
                  <span data-testid="text-vendor-name">{redemption.deal.vendorName}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isActive && (
          <Card className="bg-amber-50 border-amber-200" data-testid="card-instructions">
            <CardContent className="p-4">
              <h4 className="font-medium text-amber-800 mb-2">How to redeem</h4>
              <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                <li>Visit the business location</li>
                <li>Show this code to the staff</li>
                <li>They'll enter it to complete your redemption</li>
              </ol>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          {redemption.deal?.vendorId && (
            <Link href={`/businesses/${redemption.deal.vendorId}`} className="flex-1">
              <Button variant="outline" className="w-full" data-testid="button-view-business">
                <Store className="h-4 w-4 mr-2" />
                View Business
              </Button>
            </Link>
          )}
          <Link href="/discover" className="flex-1">
            <Button variant="ghost" className="w-full" data-testid="button-more-deals">
              <ArrowLeft className="h-4 w-4 mr-2" />
              More Deals
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
