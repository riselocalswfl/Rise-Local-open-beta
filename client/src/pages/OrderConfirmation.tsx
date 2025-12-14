import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Package, ExternalLink, ShoppingBag, MapPin, Phone, Mail, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import DetailHeader from "@/components/layout/DetailHeader";

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

interface MasterOrder {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  totalCents: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderConfirmationData {
  masterOrder: MasterOrder;
  vendorOrders: VendorOrder[];
}

interface Vendor {
  id: string;
  businessName: string;
  email?: string;
  phone?: string;
  address?: string;
}

export default function OrderConfirmation() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  const orderData = sessionStorage.getItem("lastOrder");
  const lastOrder: OrderConfirmationData | null = orderData ? JSON.parse(orderData) : null;

  const vendorIds = lastOrder?.vendorOrders?.map(o => o.vendorId) || [];
  
  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: [`/api/vendors?ids=${vendorIds.join(",")}`],
    enabled: vendorIds.length > 0,
  });

  if (!lastOrder) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader title="Order Not Found" />
        <div className="container mx-auto px-4 py-16 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-semibold mb-2">No Order Found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find your order. Please check your email for confirmation.
          </p>
          <Button asChild data-testid="button-home">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { masterOrder, vendorOrders } = lastOrder;

  const getVendorInfo = (vendorId: string) => {
    return vendors?.find(v => v.id === vendorId);
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const getPaymentInstructions = (order: VendorOrder) => {
    const vendor = getVendorInfo(order.vendorId);
    
    switch (order.paymentMethod) {
      case 'stripe_connect':
        return {
          title: 'Pay with Stripe',
          description: 'A secure payment link will be sent to your email shortly.',
          action: null,
        };
      case 'venmo':
        return {
          title: 'Pay with Venmo',
          description: `Send $${formatCurrency(order.totalCents)} to ${order.paymentLink}`,
          action: order.paymentLink ? (
            <Button asChild variant="outline" size="sm" data-testid={`button-pay-venmo-${order.id}`}>
              <a href={order.paymentLink} target="_blank" rel="noopener noreferrer">
                Open Venmo <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            </Button>
          ) : null,
        };
      case 'cashapp':
        return {
          title: 'Pay with Cash App',
          description: `Send $${formatCurrency(order.totalCents)} to ${order.paymentLink}`,
          action: order.paymentLink ? (
            <Button asChild variant="outline" size="sm" data-testid={`button-pay-cashapp-${order.id}`}>
              <a href={order.paymentLink} target="_blank" rel="noopener noreferrer">
                Open Cash App <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            </Button>
          ) : null,
        };
      case 'zelle':
        return {
          title: 'Pay with Zelle',
          description: `Send $${formatCurrency(order.totalCents)} to ${order.paymentLink || vendor?.email}`,
          action: null,
        };
      case 'paypal':
        return {
          title: 'Pay with PayPal',
          description: `Send $${formatCurrency(order.totalCents)} via PayPal`,
          action: order.paymentLink ? (
            <Button asChild variant="outline" size="sm" data-testid={`button-pay-paypal-${order.id}`}>
              <a href={order.paymentLink} target="_blank" rel="noopener noreferrer">
                Open PayPal <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            </Button>
          ) : null,
        };
      default:
        return {
          title: 'Pay with Cash',
          description: `Bring $${formatCurrency(order.totalCents)} when picking up your order`,
          action: null,
        };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DetailHeader title="Order Confirmation" showBack={false} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-primary" data-testid="icon-success" />
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-confirmation">Order Confirmed!</h1>
        <p className="text-muted-foreground" data-testid="text-confirmation-message">
          Thank you for supporting local Fort Myers vendors
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
          <CardDescription data-testid="text-order-id">
            Order #{masterOrder.id.substring(0, 8).toUpperCase()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm" data-testid="text-buyer-email">{masterOrder.buyerEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm" data-testid="text-buyer-phone">{masterOrder.buyerPhone}</span>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <span className="font-medium">Total</span>
            <span className="text-2xl font-bold" data-testid="text-total">
              ${formatCurrency(masterOrder.totalCents)}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Vendor Orders</h2>
        
        {vendorOrders.map((order) => {
          const vendor = getVendorInfo(order.vendorId);
          const payment = getPaymentInstructions(order);
          
          return (
            <Card key={order.id} data-testid={`card-vendor-order-${order.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg" data-testid={`text-vendor-name-${order.vendorId}`}>
                      {vendor?.businessName || 'Vendor'}
                    </CardTitle>
                    <CardDescription data-testid={`text-vendor-order-id-${order.id}`}>
                      Order #{order.id.substring(0, 8).toUpperCase()}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" data-testid={`badge-status-${order.id}`}>
                    {order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {order.itemsJson.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img 
                            src={item.image} 
                            alt={item.productName}
                            className="w-12 h-12 object-cover rounded"
                            data-testid={`img-product-${idx}`}
                          />
                        )}
                        <div>
                          <p className="font-medium" data-testid={`text-product-name-${idx}`}>
                            {item.productName}
                          </p>
                          <p className="text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <span className="font-medium" data-testid={`text-item-price-${idx}`}>
                        ${formatCurrency(item.priceCents * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span data-testid={`text-subtotal-${order.id}`}>
                      ${formatCurrency(order.subtotalCents)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (7%)</span>
                    <span data-testid={`text-tax-${order.id}`}>
                      ${formatCurrency(order.taxCents)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Buyer Fee (3%)</span>
                    <span data-testid={`text-fee-${order.id}`}>
                      ${formatCurrency(order.feesCents)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Order Total</span>
                    <span data-testid={`text-order-total-${order.id}`}>
                      ${formatCurrency(order.totalCents)}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Fulfillment</p>
                      <p className="text-sm text-muted-foreground capitalize" data-testid={`text-fulfillment-${order.id}`}>
                        {order.fulfillmentType}
                      </p>
                      {vendor?.address && order.fulfillmentType === 'pickup' && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {vendor.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-1">{payment.title}</p>
                    <p className="text-sm text-muted-foreground mb-3">{payment.description}</p>
                    {payment.action}
                  </div>

                  {vendor?.email && (
                    <p className="text-xs text-muted-foreground">
                      Questions? Contact {vendor.businessName} at {vendor.email}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 flex gap-4 justify-center">
          <Button asChild variant="outline" data-testid="button-view-orders">
            <Link href="/orders">View My Orders</Link>
          </Button>
          <Button asChild data-testid="button-continue-shopping">
            <Link href="/products">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Continue Shopping
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
