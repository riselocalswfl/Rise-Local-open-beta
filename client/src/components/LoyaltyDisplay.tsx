import { Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LoyaltyDisplayProps {
  balance: number;
}

export default function LoyaltyDisplay({ balance }: LoyaltyDisplayProps) {
  return (
    <Card className="bg-primary text-primary-foreground border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Award className="w-4 h-4" />
          Loyalty Points
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold font-mono" data-testid="text-loyalty-balance">
          {balance}
        </div>
        <p className="text-xs text-primary-foreground/80 mt-2">
          Earn 10 points per order
        </p>
      </CardContent>
    </Card>
  );
}
