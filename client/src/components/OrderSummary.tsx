import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface OrderSummaryProps {
  subtotal: number;
  buyerFeePercentage?: number;
  showFees?: boolean;
}

export default function OrderSummary({
  subtotal,
  buyerFeePercentage = 3,
  showFees = true,
}: OrderSummaryProps) {
  const buyerFee = subtotal * (buyerFeePercentage / 100);
  const total = subtotal + buyerFee;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono" data-testid="text-subtotal">${subtotal.toFixed(2)}</span>
          </div>
          {showFees && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Buyer Fee ({buyerFeePercentage}%)</span>
              <span className="font-mono text-muted-foreground" data-testid="text-buyer-fee">
                ${buyerFee.toFixed(2)}
              </span>
            </div>
          )}
        </div>
        <Separator />
        <div className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span className="font-mono" data-testid="text-total">${total.toFixed(2)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {showFees && `Buyer fee supports platform maintenance. `}
          Vendors pay a flat $150/month membership.
        </p>
      </CardContent>
    </Card>
  );
}
