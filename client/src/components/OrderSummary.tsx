import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface OrderSummaryProps {
  subtotal: number;
  tax?: number;
}

export default function OrderSummary({
  subtotal,
  tax = 0,
}: OrderSummaryProps) {
  const total = subtotal + tax;

  return (
    <Card className="le-card transition-all duration-200">
      <CardHeader>
        <CardTitle className="font-serif">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono" data-testid="text-subtotal">${subtotal.toFixed(2)}</span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax (7%)</span>
              <span className="font-mono text-muted-foreground" data-testid="text-tax">
                ${tax.toFixed(2)}
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
          Platform revenue comes from vendor membership fees ($89/month).
        </p>
      </CardContent>
    </Card>
  );
}
