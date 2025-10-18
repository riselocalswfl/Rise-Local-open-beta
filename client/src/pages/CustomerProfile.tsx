import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import LoyaltyDisplay from "@/components/LoyaltyDisplay";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Package, Award, Clock, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Order, LoyaltyTransaction } from "@shared/schema";

export default function CustomerProfile() {
  const { user, isLoading: userLoading } = useAuth();
  
  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<LoyaltyTransaction[]>({
    queryKey: ["/api/loyalty/my-transactions"],
    enabled: !!user,
  });

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Please log in to view your profile.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const userOrders = orders?.filter(order => order.email === user.email) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" data-testid="heading-customer-profile">
            My Account
          </h1>
          <p className="text-muted-foreground">
            Manage your account, view orders, and track your loyalty rewards
          </p>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-profile">
            <TabsTrigger value="account" data-testid="tab-account">
              <User className="h-4 w-4 mr-2" />
              Account
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">
              <Package className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="loyalty" data-testid="tab-loyalty">
              <Award className="h-4 w-4 mr-2" />
              Rewards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            <Card data-testid="card-account-info">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-base" data-testid="text-user-name">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.username}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-base" data-testid="text-user-email">{user.email}</p>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                    <div className="mt-1">
                      <Badge variant="secondary" data-testid="badge-user-role">
                        {user.role === "buyer" ? "Customer" : user.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card data-testid="card-order-history">
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>View your past orders and their status</CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : userOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No orders yet. Start shopping to see your orders here!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-start justify-between p-4 rounded-md border hover-elevate"
                        data-testid={`order-${order.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium" data-testid="text-order-id">
                              Order #{order.id.substring(0, 8)}
                            </p>
                            <Badge className={getStatusColor(order.status)} data-testid="badge-order-status">
                              {order.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {order.createdAt && formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                            </span>
                            {order.shippingMethod && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {order.shippingMethod}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold font-mono" data-testid="text-order-total">
                            ${(order.totalCents / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loyalty" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <LoyaltyDisplay />
              </div>
              
              <div className="md:col-span-2">
                <Card data-testid="card-recent-transactions">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>Your latest loyalty point transactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {transactionsLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                        ))}
                      </div>
                    ) : !transactions || transactions.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        No transactions yet. Start shopping to earn points!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {transactions.slice(0, 5).map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-start justify-between p-3 rounded-md border"
                            data-testid={`transaction-${transaction.id}`}
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium" data-testid="text-transaction-desc">
                                {transaction.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {transaction.createdAt && formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className={`font-bold ${
                                  transaction.points > 0 ? "text-green-600" : "text-red-600"
                                }`}
                                data-testid="text-transaction-pts"
                              >
                                {transaction.points > 0 ? "+" : ""}
                                {transaction.points} pts
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
