import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, Ticket, Store, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Deal, Vendor } from "@shared/schema";

interface RedeemDealModalProps {
  deal: Deal;
  vendor?: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RedemptionResponse {
  success: boolean;
  message: string;
  error?: string;
  redemption?: {
    id: string;
    dealId: string;
    dealTitle: string;
    vendorName: string;
    redeemedAt: string;
  };
}

interface CanRedeemResponse {
  canRedeem: boolean;
  reason?: string;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const media = window.matchMedia(query);
      setMatches(media.matches);
      const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, [query]);

  return matches;
}

type ModalState = "confirm" | "success" | "error";

export default function RedeemDealModal({
  deal,
  vendor,
  open,
  onOpenChange,
}: RedeemDealModalProps) {
  const [state, setState] = useState<ModalState>("confirm");
  const [redemptionData, setRedemptionData] = useState<RedemptionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const { data: canRedeemData } = useQuery<CanRedeemResponse>({
    queryKey: ["/api/deals", deal.id, "can-redeem"],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${deal.id}/can-redeem`);
      if (!res.ok) return { canRedeem: false, reason: "Error checking eligibility" };
      return res.json();
    },
    enabled: open,
  });

  const redeemMutation = useMutation({
    mutationFn: async (): Promise<RedemptionResponse> => {
      const response = await apiRequest("POST", `/api/deals/${deal.id}/redeem`, {
        source: "web"
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setRedemptionData(data);
        setState("success");
        setErrorMessage(null);
        queryClient.invalidateQueries({ queryKey: ["/api/deals", deal.id, "can-redeem"] });
        queryClient.invalidateQueries({ queryKey: ["/api/me/redemptions"] });
      } else {
        setState("error");
        setErrorMessage(data.error || data.message || "Failed to redeem deal");
      }
    },
    onError: (err: any) => {
      setState("error");
      const message = err?.message || "Failed to redeem deal";
      setErrorMessage(message);
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setState("confirm");
      setRedemptionData(null);
      setErrorMessage(null);
    }, 300);
  };

  const handleRedeem = () => {
    redeemMutation.mutate();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const confirmContent = (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Ticket className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{deal.title}</h3>
        {vendor && (
          <p className="text-muted-foreground flex items-center justify-center gap-1">
            <Store className="w-4 h-4" />
            {vendor.businessName}
          </p>
        )}
      </div>

      {!canRedeemData?.canRedeem && canRedeemData?.reason && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-2" />
          <p className="text-sm text-amber-800">{canRedeemData.reason}</p>
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-2">How it works:</p>
        <ul className="space-y-1">
          <li>1. Tap "Redeem" to claim this deal</li>
          <li>2. Show the confirmation screen to the business</li>
          <li>3. Enjoy your savings!</li>
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className="w-full"
          onClick={handleRedeem}
          disabled={redeemMutation.isPending || !canRedeemData?.canRedeem}
          data-testid="button-confirm-redeem"
        >
          {redeemMutation.isPending ? "Redeeming..." : "Redeem Now"}
        </Button>
        <Button
          variant="ghost"
          onClick={handleClose}
          data-testid="button-cancel-redeem"
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  const successContent = (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-green-700 mb-2">Redeemed!</h3>
        <p className="text-muted-foreground">Show this screen to the business</p>
      </div>

      <div className="bg-muted rounded-lg p-4 space-y-3">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Deal</p>
          <p className="font-semibold text-lg">{redemptionData?.redemption?.dealTitle || deal.title}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Business</p>
          <p className="font-medium">{redemptionData?.redemption?.vendorName || vendor?.businessName || "Business"}</p>
        </div>
        {redemptionData?.redemption?.redeemedAt && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3" />
              Redeemed
            </p>
            <p className="font-medium">{formatDate(redemptionData.redemption.redeemedAt)}</p>
          </div>
        )}
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={handleClose}
        data-testid="button-done-redeem"
      >
        Done
      </Button>
    </div>
  );

  const errorContent = (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Unable to Redeem</h3>
        <p className="text-muted-foreground">{errorMessage || "Something went wrong"}</p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className="w-full"
          onClick={() => setState("confirm")}
          data-testid="button-try-again"
        >
          Try Again
        </Button>
        <Button
          variant="ghost"
          onClick={handleClose}
          data-testid="button-close-error"
        >
          Close
        </Button>
      </div>
    </div>
  );

  const getContent = () => {
    switch (state) {
      case "success":
        return successContent;
      case "error":
        return errorContent;
      default:
        return confirmContent;
    }
  };

  const getTitle = () => {
    switch (state) {
      case "success":
        return "Deal Redeemed";
      case "error":
        return "Redemption Failed";
      default:
        return "Redeem Deal";
    }
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md" data-testid="modal-redeem-deal">
          <DialogHeader className="sr-only">
            <DialogTitle>{getTitle()}</DialogTitle>
            <DialogDescription>
              {state === "confirm" ? "Confirm your redemption" : "Redemption status"}
            </DialogDescription>
          </DialogHeader>
          {getContent()}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent data-testid="modal-redeem-deal">
        <DrawerHeader className="sr-only">
          <DrawerTitle>{getTitle()}</DrawerTitle>
          <DrawerDescription>
            {state === "confirm" ? "Confirm your redemption" : "Redemption status"}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-8">
          {getContent()}
        </div>
        <DrawerFooter className="pt-2" />
      </DrawerContent>
    </Drawer>
  );
}
