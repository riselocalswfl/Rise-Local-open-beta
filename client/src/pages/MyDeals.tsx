import { useQuery } from "@tanstack/react-query";
import { DealClaimQR } from "@/components/DealClaimQR";
import DetailHeader from "@/components/layout/DetailHeader";
import { Loader2, Ticket, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface DealClaim {
  id: string;
  dealId: string;
  userId: string;
  qrCodeToken: string;
  status: string;
  claimedAt: string | null;
  expiresAt: string | null;
  redeemedAt: string | null;
  deal: {
    id: string;
    title: string;
    description: string;
    tier: string;
    vendorId: string;
    vendorName: string | null;
    endDate: string | null;
  } | null;
}

export default function MyDeals() {
  const { data: claims, isLoading } = useQuery<DealClaim[]>({
    queryKey: ["/api/deal-claims/my"],
  });

  const activeClaims = claims?.filter(c => c.status === "CLAIMED" && 
    (!c.expiresAt || new Date(c.expiresAt) > new Date())) || [];
  const pastClaims = claims?.filter(c => c.status !== "CLAIMED" || 
    (c.expiresAt && new Date(c.expiresAt) <= new Date())) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loader-deals" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DetailHeader title="My Deals" />
      
      <div className="p-4 pb-24 max-w-lg mx-auto">
        {(!claims || claims.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Ticket className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Deals Yet</h2>
            <p className="text-muted-foreground mb-6">
              Claim deals to get QR codes you can show at local businesses
            </p>
            <Link href="/deals">
              <Button data-testid="button-browse-deals">
                Browse Deals
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {activeClaims.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3" data-testid="heading-active-deals">
                  Ready to Use ({activeClaims.length})
                </h2>
                <div className="space-y-4">
                  {activeClaims.map((claim) => (
                    <DealClaimQR key={claim.id} claim={claim} />
                  ))}
                </div>
              </section>
            )}

            {pastClaims.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 text-muted-foreground" data-testid="heading-past-deals">
                  Past Deals ({pastClaims.length})
                </h2>
                <div className="space-y-4">
                  {pastClaims.map((claim) => (
                    <DealClaimQR key={claim.id} claim={claim} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
