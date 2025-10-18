import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import LoyaltyDisplay from "@/components/LoyaltyDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown } from "lucide-react";
import type { LoyaltyTransaction } from "@shared/schema";

export default function LoyaltyHistory() {
  const { data: transactions, isLoading } = useQuery<LoyaltyTransaction[]>({
    queryKey: ["/api/loyalty/my-transactions"],
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "purchase":
        return "bg-green-500";
      case "signup_bonus":
        return "bg-blue-500";
      case "referral":
        return "bg-purple-500";
      case "redemption":
        return "bg-red-500";
      case "adjustment":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold mb-8" data-testid="heading-loyalty-history">
          Loyalty Rewards
        </h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-1">
            <LoyaltyDisplay />
          </div>
          
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : !transactions || transactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No transactions yet. Start shopping to earn points!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-start justify-between p-4 rounded-md border hover-elevate"
                        data-testid={`transaction-${transaction.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getTypeColor(transaction.type)} data-testid="badge-transaction-type">
                              {transaction.type.replace("_", " ")}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(transaction.createdAt!)}
                            </span>
                          </div>
                          <p className="text-sm font-medium" data-testid="text-transaction-description">
                            {transaction.description}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <div
                            className={`flex items-center gap-1 text-lg font-bold ${
                              transaction.points > 0 ? "text-green-600" : "text-red-600"
                            }`}
                            data-testid="text-transaction-points"
                          >
                            {transaction.points > 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {transaction.points > 0 ? "+" : ""}
                            {transaction.points}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Balance: {transaction.balanceAfter}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
