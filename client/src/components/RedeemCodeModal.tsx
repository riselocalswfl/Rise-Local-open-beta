import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Copy, CheckCircle2, Clock, AlertCircle, Ticket, X } from "lucide-react";
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
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Deal } from "@shared/schema";

interface RedeemCodeModalProps {
  deal: Deal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RedemptionResponse {
  success: boolean;
  message: string;
  code: string;
  expiresAt: string;
  redemptionId?: string;
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

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function RedeemCodeModal({
  deal,
  open,
  onOpenChange,
}: RedeemCodeModalProps) {
  const [redemptionData, setRedemptionData] = useState<RedemptionResponse | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const redeemMutation = useMutation({
    mutationFn: async (): Promise<RedemptionResponse> => {
      const response = await apiRequest("POST", `/api/deals/${deal.id}/redeem`, {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setRedemptionData(data);
        setError(null);
        const expiresAt = new Date(data.expiresAt);
        const now = new Date();
        setTimeRemaining(Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)));
      } else {
        setError(data.message || "Failed to get redemption code");
      }
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to get redemption code");
    },
  });

  useEffect(() => {
    if (open && !redemptionData && !error) {
      redeemMutation.mutate();
    }
  }, [open]);

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const handleCopy = async () => {
    if (redemptionData?.code) {
      try {
        await navigator.clipboard.writeText(redemptionData.code);
        setCopied(true);
        toast({
          title: "Copied",
          description: "Redemption code copied to clipboard",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast({
          title: "Copy failed",
          description: "Please manually copy the code",
          variant: "destructive",
        });
      }
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setRedemptionData(null);
      setError(null);
      setCopied(false);
    }, 300);
  };

  const isExpired = timeRemaining === 0 && redemptionData;
  const isUrgent = timeRemaining > 0 && timeRemaining <= 60;

  const content = (
    <div className="space-y-6 text-center">
      {redeemMutation.isPending && (
        <div className="py-8 space-y-4">
          <div className="h-12 w-12 mx-auto rounded-full bg-muted animate-pulse" />
          <p className="text-muted-foreground">Generating your code...</p>
        </div>
      )}

      {error && (
        <div className="py-6 space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Unable to Generate Code</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">{error}</p>
          </div>
          <Button variant="outline" onClick={handleClose} data-testid="button-close-error">
            Close
          </Button>
        </div>
      )}

      {redemptionData && !error && (
        <>
          <div className="flex justify-center">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
              isExpired ? "bg-muted" : "bg-primary/10"
            }`}>
              <Ticket className={`h-8 w-8 ${isExpired ? "text-muted-foreground" : "text-primary"}`} />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {isExpired ? "Code Expired" : "Your Redemption Code"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isExpired
                ? "This code has expired. Please request a new one."
                : "Show this code to the business to redeem your deal"}
            </p>
          </div>

          <div className={`p-6 rounded-xl border-2 ${
            isExpired 
              ? "bg-muted/50 border-muted" 
              : isUrgent 
                ? "bg-destructive/5 border-destructive/30" 
                : "bg-primary/5 border-primary/30"
          }`}>
            <div 
              className={`font-mono text-3xl font-bold tracking-wider select-all ${
                isExpired ? "text-muted-foreground" : ""
              }`}
              data-testid="text-redemption-code"
            >
              {redemptionData.code}
            </div>
          </div>

          {!isExpired && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleCopy}
              data-testid="button-copy-code"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Code
                </>
              )}
            </Button>
          )}

          {!isExpired && (
            <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
              isUrgent ? "bg-destructive/10 text-destructive" : "bg-muted"
            }`}>
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium" data-testid="text-time-remaining">
                Expires in {formatTime(timeRemaining)}
              </span>
            </div>
          )}

          <div className="pt-2 space-y-3 text-left bg-muted/50 rounded-lg p-4">
            <p className="text-xs font-medium">How to redeem:</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Show this code to the business staff</li>
              <li>They will enter the code to verify it</li>
              <li>Enjoy your deal</li>
            </ol>
          </div>

          {isExpired && (
            <Button 
              onClick={() => {
                setRedemptionData(null);
                setError(null);
                redeemMutation.mutate();
              }}
              data-testid="button-get-new-code"
            >
              Get New Code
            </Button>
          )}
        </>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              {deal.title}
            </DialogTitle>
            <DialogDescription>
              {isExpired ? "Your previous code has expired" : "Use this code to redeem your deal in-store"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">{content}</div>
          {redemptionData && !isExpired && (
            <Button
              variant="ghost"
              onClick={handleClose}
              className="w-full"
              data-testid="button-done"
            >
              Done
            </Button>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
        <div className="max-h-[85vh] overflow-y-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              {deal.title}
            </DrawerTitle>
            <DrawerDescription>
              {isExpired ? "Your previous code has expired" : "Use this code to redeem your deal in-store"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">{content}</div>
        </div>
        <DrawerFooter className="border-t pt-4">
          {redemptionData && !isExpired ? (
            <DrawerClose asChild>
              <Button variant="ghost" className="w-full" data-testid="button-done-mobile">
                Done
              </Button>
            </DrawerClose>
          ) : isExpired ? null : (
            <DrawerClose asChild>
              <Button variant="outline" className="w-full" data-testid="button-cancel-mobile">
                Cancel
              </Button>
            </DrawerClose>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
