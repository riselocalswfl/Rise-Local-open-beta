import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, ShoppingBag, ExternalLink, MapPin, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { format } from "date-fns";

interface VendorOrder {
  id: string;
  vendorId: string;
  masterOrderId: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  itemsJson: Array<{
    productId: string;
    productName: string;
    quantity: number;
    priceCents: number;
    variantId?: string;
    options?: Record<string, string>;
    image?: string;
  }>;
  subtotalCents: number;
  taxCents: number;
  feesCents: number;
  totalCents: number;
  fulfillmentType: string;
  fulfillmentDetails?: any;
  paymentMethod: string;
  paymentLink?: string;
  paymentStatus: string;
  status: string;
  vendorNotified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MasterOrderWithDetails {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  totalCents: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  vendorOrders: VendorOrder[];
}

interface Vendor {
  id: string;
  businessName: string;
  email?: string;
  phone?: string;
  address?: string;
}

export default function Orders() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  const { data: orders, isLoading: ordersLoading } = useQuery<MasterOrderWithDetails[]>({
    queryKey: ["/api/orders/me"],
    enabled: !!user,
  });

  const vendorIds = orders?.flatMap(o => o.vendorOrders.map(vo => vo.vendorId)) || [];
  const uniqueVendorIds = Array.from(new Set(vendorIds));
  
  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: [`/api/vendors?ids=${uniqueVendorIds.join(",")}`],
    enabled: uniqueVendorIds.length > 0,
  });

  const getVendorInfo = (vendorId: string) => {
    return vendors?.find(v => v.id === vendorId);
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'fulfilled':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return '';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return '';
    }
  };

  if (isLoading || ordersLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <Package className="w-8 h-8 animate-pulse text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-semibold mb-2" data-testid="heading-no-orders">No Orders Yet</h1>
            <p className="text-muted-foreground mb-6">
              You haven't placed any orders yet. Start shopping to support local Fort Myers vendors!
            </p>
            <Button asChild data-testid="button-shop-now">
              <Link href="/products">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Start Shopping
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="heading-orders">My Orders</h1>
          <p className="text-muted-foreground">
            View and track your orders from Fort Myers local vendors
          </p>
        </div>

        <div className="space-y-6">
          {orders.map((masterOrder) => (
            <Card key={masterOrder.id} data-testid={`card-master-order-${masterOrder.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl" data-testid={`text-order-number-${masterOrder.id}`}>
                      Order #{masterOrder.id.substring(0, 8).toUpperCase()}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(masterOrder.createdAt), "PPP")}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Total</p>
                    <p className="text-2xl font-bold" data-testid={`text-total-${masterOrder.id}`}>
                      ${formatCurrency(masterOrder.totalCents)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground">
                    Vendor Orders ({masterOrder.vendorOrders.length})
                  </h3>
                  
                  {masterOrder.vendorOrders.map((vendorOrder) => {
                    const vendor = getVendorInfo(vendorOrder.vendorId);
                    
                    return (
                      <Card key={vendorOrder.id} className="border-muted" data-testid={`card-vendor-order-${vendorOrder.id}`}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <Link href={`/vendor/${vendorOrder.vendorId}`}>
                                <h4 className="font-semibold hover:text-primary transition-colors" data-testid={`link-vendor-${vendorOrder.vendorId}`}>
                                  {vendor?.businessName || 'Vendor'}
                                </h4>
                              </Link>
                              <p className="text-sm text-muted-foreground">
                                Order #{vendorOrder.id.substring(0, 8).toUpperCase()}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              <Badge 
                                className={getStatusColor(vendorOrder.status)}
                                data-testid={`badge-status-${vendorOrder.id}`}
                              >
                                {vendorOrder.status}
                              </Badge>
                              <Badge 
                                variant="outline"
                                className={getPaymentStatusColor(vendorOrder.paymentStatus)}
                                data-testid={`badge-payment-${vendorOrder.id}`}
                              >
                                {vendorOrder.paymentStatus}
                              </Badge>
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            {vendorOrder.itemsJson.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-3 text-sm">
                                {item.image && (
                                  <img 
                                    src={item.image} 
                                    alt={item.productName}
                                    className="w-12 h-12 object-cover rounded"
                                    data-testid={`img-product-${idx}`}
                                  />
                                )}
                                <div className="flex-1">
                                  <p className="font-medium">{item.productName}</p>
                                  <p className="text-muted-foreground">Qty: {item.quantity}</p>
                                </div>
                                <span className="font-medium">
                                  ${formatCurrency(item.priceCents * item.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>

                          <Separator />

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              <span className="capitalize">{vendorOrder.fulfillmentType}</span>
                            </div>
                            <span className="font-semibold" data-testid={`text-vendor-total-${vendorOrder.id}`}>
                              Total: ${formatCurrency(vendorOrder.totalCents)}
                            </span>
                          </div>

                          {vendorOrder.paymentLink && vendorOrder.paymentStatus === 'pending' && (
                            <Button 
                              asChild 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              data-testid={`button-pay-${vendorOrder.id}`}
                            >
                              <a href={vendorOrder.paymentLink} target="_blank" rel="noopener noreferrer">
                                Complete Payment <ExternalLink className="w-4 h-4 ml-1" />
                              </a>
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button asChild variant="outline" data-testid="button-continue-shopping">
            <Link href="/products">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Continue Shopping
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
