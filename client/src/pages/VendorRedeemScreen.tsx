import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, XCircle, ArrowLeft, Ticket, Store, AlertTriangle } from "lucide-react";
import DetailHeader from "@/components/layout/DetailHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Deal } from "@shared/schema";

interface RedemptionResult {
  success: boolean;
  message: string;
  redemption?: {
    id: string;
    dealId: string;
    userId: string;
    status: string;
    redeemedAt: string;
  };
}

export default function VendorRedeemScreen() {
  const { dealId } = useParams<{ dealId: string }>();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<RedemptionResult | null>(null);

  const { data: deal, isLoading: dealLoading, error: dealError } = useQuery<Deal>({
    queryKey: ["/api/deals", dealId],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deal");
      return res.json();
    },
    enabled: !!dealId,
  });

  const redeemMutation = useMutation({
    mutationFn: async (redemptionCode: string) => {
      const res = await apiRequest("POST", `/api/vendor/deals/${dealId}/redeem`, { code: redemptionCode });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to redeem code");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResult({ success: true, message: data.message || "Code redeemed successfully!" });
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/deals"] });
    },
    onError: (error: Error) => {
      setResult({ success: false, message: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanCode = code.replace(/\s/g, "");
    if (cleanCode.length !== 6 || !/^\d+$/.test(cleanCode)) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }
    
    setResult(null);
    redeemMutation.mutate(cleanCode);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
    if (result) setResult(null);
  };

  const resetForm = () => {
    setCode("");
    setResult(null);
  };

  if (dealLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader title="Redeem Deal" />
        <div className="max-w-md mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  if (dealError || !deal) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader title="Deal Not Found" />
        <div className="max-w-md mx-auto px-4 py-8 text-center space-y-4">
          <XCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Deal Not Found</h2>
          <p className="text-muted-foreground">This deal doesn't exist or you don't have access to it.</p>
          <Link href="/dashboard">
            <Button data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DetailHeader title="Redeem Customer Code" />
      
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <Card data-testid="card-deal-info">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold" data-testid="text-deal-title">{deal.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{deal.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-redeem-form">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Enter Customer's Code</CardTitle>
            <CardDescription>
              Ask the customer to show their 6-digit code from the Rise Local app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="000000"
                  value={code}
                  onChange={handleCodeChange}
                  className="text-center font-mono text-3xl tracking-[0.5em] h-16"
                  maxLength={6}
                  data-testid="input-code"
                  disabled={redeemMutation.isPending}
                />
              </div>
              
              <Button
                type="submit"
                className="w-full h-14 text-lg"
                disabled={code.length !== 6 || redeemMutation.isPending}
                data-testid="button-redeem"
              >
                {redeemMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Redeem Code
                  </span>
                )}
              </Button>
            </form>

            {result && (
              <div
                className={`rounded-lg p-4 ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
                data-testid="container-result"
              >
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`font-semibold ${result.success ? "text-green-800" : "text-red-800"}`}>
                      {result.success ? "Success!" : "Failed"}
                    </p>
                    <p className={`text-sm ${result.success ? "text-green-700" : "text-red-700"}`}>
                      {result.message}
                    </p>
                  </div>
                </div>
                {result.success && (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={resetForm}
                    data-testid="button-redeem-another"
                  >
                    Redeem Another Code
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200" data-testid="card-help">
          <CardContent className="p-4">
            <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              How this works
            </h4>
            <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
              <li>Customers claim deals in the Rise Local app</li>
              <li>They receive a 6-digit code valid for 10 minutes</li>
              <li>Enter their code here to complete the redemption</li>
              <li>Expired or already-used codes will be rejected</li>
            </ul>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Link href="/dashboard" className="flex-1">
            <Button variant="outline" className="w-full" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
