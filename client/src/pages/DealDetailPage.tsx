import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapPin, Tag, CheckCircle, XCircle, Lock, Store, ChevronRight, MessageSquare } from "lucide-react";
import DetailHeader from "@/components/layout/DetailHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Deal, Vendor } from "@shared/schema";

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [vendorPin, setVendorPin] = useState("");
  const [redemptionResult, setRedemptionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const { data: deal, isLoading: dealLoading } = useQuery<Deal>({
    queryKey: ["/api/deals", id],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${id}`);
      if (!res.ok) throw new Error("Failed to fetch deal");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: vendorData } = useQuery<{ vendor: Vendor; deals: any[] }>({
    queryKey: ["/api/vendors", deal?.vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/vendors/${deal?.vendorId}`);
      if (!res.ok) throw new Error("Failed to fetch vendor");
      return res.json();
    },
    enabled: !!deal?.vendorId,
  });
  
  const vendor = vendorData?.vendor;

  const redeemMutation = useMutation({
    mutationFn: async (pin: string) => {
      const res = await apiRequest("POST", `/api/deals/${id}/redeem`, { vendorPin: pin });
      return res.json();
    },
    onSuccess: (data) => {
      setRedemptionResult({ success: true, message: data.message || "Deal redeemed successfully!" });
    },
    onError: (error: any) => {
      setRedemptionResult({ success: false, message: error.message || "Failed to redeem deal" });
    },
  });

  const startConversation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/b2c/conversations/start", {
        vendorId: deal?.vendorId,
        dealId: id,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start conversation");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setLocation(`/messages/${data.conversationId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to start conversation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRedeem = () => {
    if (!vendorPin || vendorPin.length !== 4) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a 4-digit vendor PIN",
        variant: "destructive",
      });
      return;
    }
    redeemMutation.mutate(vendorPin);
  };

  const resetRedemption = () => {
    setRedemptionResult(null);
    setVendorPin("");
    setRedeemModalOpen(false);
  };

  const dealTypeLabels: Record<string, string> = {
    bogo: "Buy One Get One",
    percent: "Percentage Off",
    addon: "Free Add-on",
  };

  if (dealLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader title="Loading..." />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader title="Deal Not Found" />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Deal Not Found</h2>
          <p className="text-muted-foreground mb-6">
            This deal may have expired or been removed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-back-to-home">
              Back to Home
            </Button>
            <Button onClick={() => setLocation("/deals")} data-testid="button-back-to-deals">
              Back to Deals
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DetailHeader title={deal.title} backHref="/deals" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border">
                <AvatarImage src={vendor?.logoUrl || ""} alt={vendor?.businessName || "Vendor"} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {(vendor?.businessName || "V")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Store className="w-3 h-3" />
                  {vendor?.businessName || "Local Business"}
                </p>
                <CardTitle className="text-2xl md:text-3xl">{deal.title}</CardTitle>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-lg text-muted-foreground">{deal.description}</p>

            <div className="flex flex-wrap gap-2">
              {deal.category && (
                <Badge variant="secondary" className="text-sm">
                  <Tag className="w-3 h-3 mr-1" />
                  {deal.category}
                </Badge>
              )}
              {deal.city && (
                <Badge variant="outline" className="text-sm">
                  <MapPin className="w-3 h-3 mr-1" />
                  {deal.city}
                </Badge>
              )}
              <Badge variant="default" className="text-sm">
                {dealTypeLabels[deal.dealType] || deal.dealType}
              </Badge>
              {deal.tier === "premium" && (
                <Badge className="text-sm bg-amber-500 hover:bg-amber-600">
                  <Lock className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              )}
            </div>

            {vendor && (
              <Link 
                href={`/businesses/${vendor.id}`}
                data-testid={`link-vendor-${vendor.id}`}
              >
                <div className="bg-muted/50 rounded-lg p-4 hover-elevate cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">About {vendor.businessName}</h4>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {vendor.bio || vendor.tagline || "A local Southwest Florida business."}
                  </p>
                  {vendor.city && (
                    <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {vendor.city}, {vendor.state || "FL"}
                    </p>
                  )}
                </div>
              </Link>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="flex-1"
                onClick={() => setRedeemModalOpen(true)}
                data-testid="button-redeem-deal"
              >
                Redeem This Deal
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                onClick={() => startConversation.mutate()}
                disabled={startConversation.isPending || !deal?.vendorId}
                data-testid="button-message-business"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {startConversation.isPending ? "Starting..." : "Ask a Question"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Redemption Modal */}
      <Dialog open={redeemModalOpen} onOpenChange={setRedeemModalOpen}>
        <DialogContent>
          {redemptionResult ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {redemptionResult.success ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      Success!
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6 text-destructive" />
                      Redemption Failed
                    </>
                  )}
                </DialogTitle>
                <DialogDescription>{redemptionResult.message}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={resetRedemption} data-testid="button-close-result">
                  {redemptionResult.success ? "Done" : "Try Again"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Redeem Deal</DialogTitle>
                <DialogDescription>
                  Ask the vendor for their 4-digit PIN to redeem this deal.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <label className="text-sm font-medium mb-2 block">Vendor PIN</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="Enter 4-digit PIN"
                  value={vendorPin}
                  onChange={(e) => setVendorPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="text-center text-2xl tracking-widest"
                  data-testid="input-vendor-pin"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setRedeemModalOpen(false)}
                  data-testid="button-cancel-redeem"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRedeem}
                  disabled={vendorPin.length !== 4 || redeemMutation.isPending}
                  data-testid="button-confirm-redeem"
                >
                  {redeemMutation.isPending ? "Redeeming..." : "Redeem"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
