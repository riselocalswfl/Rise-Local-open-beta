import { Link } from "wouter";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/layout/AppShell";

export default function CheckoutCancel() {
  return (
    <AppShell hideTabs>
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-3" data-testid="heading-checkout-cancel">
              Payment Cancelled
            </h1>
            
            <p className="text-muted-foreground mb-8">
              No worries! Your payment was not processed. You can try again whenever you're ready.
            </p>

            <div className="space-y-3">
              <Link href="/checkout">
                <Button size="lg" className="w-full" data-testid="button-try-again">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </Link>
              
              <Link href="/discover">
                <Button size="lg" variant="outline" className="w-full" data-testid="button-back-to-discover">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Discover
                </Button>
              </Link>
            </div>

            <p className="text-xs text-muted-foreground mt-8">
              Have questions? Contact us at support@riselocal.com
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
