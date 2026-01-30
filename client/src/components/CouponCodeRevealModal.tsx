import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, Lock, Copy, Clock, Shield } from "lucide-react";
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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Deal, Vendor } from "@shared/schema";

interface CouponCodeRevealModalProps {
  deal: Deal;
  vendor?: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CouponCodeResponse {
  success: boolean;
  type: "STATIC" | "UNIQUE";
  code: string | null;
  codeId?: string;
  expiresAt?: string;
  message: string;
  error?: string;
  requiresPass?: boolean;
  poolEmpty?: boolean;
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

type ModalState = "loading" | "revealed" | "error";

// Watermark component for member-only codes
function CodeWatermark({ userName, className = "" }: { userName: string; className?: string }) {
  const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(new Date().toLocaleTimeString());
    }, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Animated diagonal watermark pattern */}
      <div className="absolute inset-0 flex flex-wrap gap-12 opacity-[0.08] -rotate-12 scale-150 origin-center">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="whitespace-nowrap text-xs font-semibold animate-pulse" style={{ animationDelay: `${i * 0.5}s` }}>
            RISE LOCAL PASS
          </div>
        ))}
      </div>
      {/* Corner watermark with user info */}
      <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground/50 font-mono">
        {userName} | {timestamp}
      </div>
    </div>
  );
}

export default function CouponCodeRevealModal({
  deal,
  vendor,
  open,
  onOpenChange,
}: CouponCodeRevealModalProps) {
  const [state, setState] = useState<ModalState>("loading");
  const [codeData, setCodeData] = useState<CouponCodeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Get user display name for watermark
  const userName = user?.firstName
    ? `${user.firstName} ${user.lastName?.[0] || ""}`.trim()
    : user?.email?.split("@")[0] || "Member";

  const getCouponCodeMutation = useMutation({
    mutationFn: async (): Promise<CouponCodeResponse> => {
      const response = await apiRequest("POST", `/api/deals/${deal.id}/coupon-code`);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setCodeData(data);
        setState("revealed");
        setErrorMessage(null);
      } else {
        setState("error");
        setErrorMessage(data.error || "Failed to get coupon code");
      }
    },
    onError: (err: any) => {
      setState("error");
      const message = err?.message || "Failed to get coupon code";
      setErrorMessage(message);
    },
  });

  // Fetch code when modal opens
  useEffect(() => {
    if (open) {
      setState("loading");
      getCouponCodeMutation.mutate();
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setState("loading");
      setCodeData(null);
      setErrorMessage(null);
      setCopied(false);
    }, 300);
  };

  const handleCopy = async () => {
    if (codeData?.code) {
      await navigator.clipboard.writeText(codeData.code);
      setCopied(true);
      toast({ title: "Code copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatExpiresAt = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.round((date.getTime() - now.getTime()) / (1000 * 60));

    if (diffMinutes <= 0) return "Expired";
    if (diffMinutes < 60) return `${diffMinutes} min remaining`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m remaining`;
  };

  const loadingContent = (
    <div className="space-y-6 py-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <h3 className="text-xl font-semibold mb-2">Getting Your Code</h3>
        <p className="text-muted-foreground">Please wait...</p>
      </div>
    </div>
  );

  const revealedContent = (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Your Code is Ready!</h3>
        <p className="text-muted-foreground text-sm">{deal.title}</p>
        {vendor && (
          <p className="text-muted-foreground text-xs mt-1">{vendor.businessName}</p>
        )}
      </div>

      {/* Code Display with Watermark for unique codes */}
      <div className="relative bg-slate-50 border-2 border-dashed border-primary/30 rounded-xl p-6">
        {codeData?.type === "UNIQUE" && <CodeWatermark userName={userName} />}

        {codeData?.code ? (
          <div className="text-center relative z-10">
            <p className="text-xs text-muted-foreground mb-2 flex items-center justify-center gap-1">
              {codeData.type === "UNIQUE" ? (
                <>
                  <Shield className="w-3 h-3" />
                  Your Exclusive Member Code
                </>
              ) : (
                "Promo Code"
              )}
            </p>
            <div className="font-mono text-2xl md:text-3xl font-bold tracking-wider text-primary select-all">
              {codeData.code}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={handleCopy}
              data-testid="button-copy-code"
            >
              <Copy className="w-4 h-4 mr-2" />
              {copied ? "Copied!" : "Copy Code"}
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-muted-foreground">No code required for this deal</p>
          </div>
        )}

        {/* Expiration timer for unique codes */}
        {codeData?.type === "UNIQUE" && codeData?.expiresAt && (
          <div className="mt-4 text-center">
            <p className="text-xs text-amber-600 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              {formatExpiresAt(codeData.expiresAt)}
            </p>
          </div>
        )}
      </div>

      {/* Verification watermark for unique codes */}
      {codeData?.type === "UNIQUE" && (
        <div className="bg-slate-100 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            Issued to {userName} | {new Date().toLocaleString()}
          </p>
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-2">How to use:</p>
        <ul className="space-y-1 text-xs">
          <li>1. Copy the code above</li>
          <li>2. Go to {vendor?.businessName || "the business"}'s website or checkout</li>
          <li>3. Enter the code at checkout to apply your discount</li>
        </ul>
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={handleClose}
        data-testid="button-done-coupon"
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
        <h3 className="text-xl font-semibold mb-2">Unable to Get Code</h3>
        <p className="text-muted-foreground">{errorMessage || "Something went wrong"}</p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            setState("loading");
            getCouponCodeMutation.mutate();
          }}
          data-testid="button-retry-coupon"
        >
          Try Again
        </Button>
        <Button
          variant="ghost"
          onClick={handleClose}
          data-testid="button-close-coupon-error"
        >
          Close
        </Button>
      </div>
    </div>
  );

  const getContent = () => {
    switch (state) {
      case "revealed":
        return revealedContent;
      case "error":
        return errorContent;
      default:
        return loadingContent;
    }
  };

  const getTitle = () => {
    switch (state) {
      case "revealed":
        return "Your Coupon Code";
      case "error":
        return "Error";
      default:
        return "Getting Code...";
    }
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md" data-testid="modal-coupon-code">
          <DialogHeader className="sr-only">
            <DialogTitle>{getTitle()}</DialogTitle>
            <DialogDescription>
              {state === "revealed" ? "Your coupon code" : "Loading coupon code"}
            </DialogDescription>
          </DialogHeader>
          {getContent()}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent data-testid="modal-coupon-code">
        <DrawerHeader className="sr-only">
          <DrawerTitle>{getTitle()}</DrawerTitle>
          <DrawerDescription>
            {state === "revealed" ? "Your coupon code" : "Loading coupon code"}
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
