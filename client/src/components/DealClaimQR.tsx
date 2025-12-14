import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface DealClaimQRProps {
  claim: {
    id: string;
    qrCodeToken: string;
    status: string;
    claimedAt: string | null;
    expiresAt: string | null;
    redeemedAt: string | null;
    deal?: {
      id: string;
      title: string;
      description: string;
      tier: string;
      vendorName: string | null;
      endDate?: string | null;
    } | null;
  };
  showFullDetails?: boolean;
}

export function DealClaimQR({ claim, showFullDetails = true }: DealClaimQRProps) {
  const isRedeemed = claim.status === "REDEEMED";
  const isExpired = claim.status === "EXPIRED" || 
    (claim.expiresAt && new Date(claim.expiresAt) < new Date());
  const isActive = claim.status === "CLAIMED" && !isExpired;

  const getStatusBadge = () => {
    if (isRedeemed) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800" data-testid="badge-status-redeemed">
          <CheckCircle className="w-3 h-3 mr-1" />
          Redeemed
        </Badge>
      );
    }
    if (isExpired) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-600" data-testid="badge-status-expired">
          <XCircle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-primary/10 text-primary" data-testid="badge-status-active">
        <Clock className="w-3 h-3 mr-1" />
        Ready to Use
      </Badge>
    );
  };

  return (
    <Card className={`overflow-hidden ${!isActive ? 'opacity-70' : ''}`} data-testid={`card-deal-claim-${claim.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col items-center gap-4">
          {claim.deal && showFullDetails && (
            <div className="w-full text-center">
              <h3 className="font-semibold text-lg" data-testid="text-deal-title">
                {claim.deal.title}
              </h3>
              {claim.deal.vendorName && (
                <p className="text-sm text-muted-foreground" data-testid="text-vendor-name">
                  {claim.deal.vendorName}
                </p>
              )}
            </div>
          )}

          <div className="relative">
            <div className={`p-3 bg-white rounded-lg ${!isActive ? 'grayscale' : ''}`}>
              <QRCodeSVG
                value={claim.qrCodeToken}
                size={160}
                level="M"
                includeMargin={false}
                data-testid="qr-code"
              />
            </div>
            {isRedeemed && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 w-full">
            {getStatusBadge()}
            
            <p className="text-xs text-center text-muted-foreground font-mono" data-testid="text-qr-token">
              {claim.qrCodeToken}
            </p>

            {isActive && (
              <p className="text-xs text-center text-muted-foreground">
                Show this to your server to redeem your Rise Local deal
              </p>
            )}

            {claim.expiresAt && isActive && (
              <p className="text-xs text-muted-foreground" data-testid="text-expires">
                Expires: {format(new Date(claim.expiresAt), "MMM d, yyyy h:mm a")}
              </p>
            )}

            {isRedeemed && claim.redeemedAt && (
              <p className="text-xs text-muted-foreground" data-testid="text-redeemed-at">
                Redeemed: {format(new Date(claim.redeemedAt), "MMM d, yyyy h:mm a")}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
