import { CheckCircle, XCircle, Users, ShoppingBag, Calendar, DollarSign, Mail, Phone, Store, Utensils, Wrench } from "lucide-react";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface AdminStats {
  users: {
    total: number;
  };
  vendors: {
    total: number;
    verified: number;
    unverified: number;
    pendingVerifications: Array<{
      id: string;
      businessName: string;
      contactEmail: string;
      city: string;
      type: 'vendor';
    }>;
  };
  restaurants: {
    total: number;
    verified: number;
    unverified: number;
    pendingVerifications: Array<{
      id: string;
      businessName: string;
      contactEmail: string;
      city: string;
      type: 'restaurant';
    }>;
  };
  serviceProviders: {
    total: number;
    verified: number;
    unverified: number;
    pendingVerifications: Array<{
      id: string;
      businessName: string;
      contactEmail: string;
      city: string;
      type: 'service_provider';
    }>;
  };
  products: {
    total: number;
  };
  menuItems: {
    total: number;
  };
  serviceOfferings: {
    total: number;
  };
  events: {
    total: number;
  };
  orders: {
    total: number;
    paid: number;
    pending: number;
  };
  revenue: {
    totalCents: number;
    paidCents: number;
    pendingCents: number;
  };
}

function UserAccountsList() {
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No users registered yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-start justify-between p-4 border rounded-lg hover-elevate"
          data-testid={`user-card-${user.id}`}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user.username || user.email?.split('@')[0] || 'Unknown User'}
              </h3>
              <Badge variant={
                user.role === 'admin' ? 'destructive' : 
                user.role === 'vendor' || user.role === 'restaurant' || user.role === 'service_provider' ? 'default' : 
                'secondary'
              }>
                {user.role}
              </Badge>
            </div>
            <div className="space-y-1">
              {user.email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </p>
              )}
              {user.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {user.phone}
                </p>
              )}
              {user.zipCode && (
                <p className="text-sm text-muted-foreground">
                  Zip: {user.zipCode}
                </p>
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {user.createdAt && new Date(user.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const { toast } = useToast();

  // Fetch admin statistics
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Verify vendor mutation
  const verifyVendorMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'vendor' | 'restaurant' | 'service_provider' }) => {
      const endpoint = type === 'vendor' 
        ? `/api/admin/vendors/${id}/verify`
        : type === 'restaurant'
        ? `/api/admin/restaurants/${id}/verify`
        : `/api/admin/service-providers/${id}/verify`;
      
      return await apiRequest('PATCH', endpoint, { isVerified: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  // Reject vendor mutation
  const rejectVendorMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'vendor' | 'restaurant' | 'service_provider' }) => {
      const endpoint = type === 'vendor' 
        ? `/api/admin/vendors/${id}/verify`
        : type === 'restaurant'
        ? `/api/admin/restaurants/${id}/verify`
        : `/api/admin/service-providers/${id}/verify`;
      
      return await apiRequest('PATCH', endpoint, { isVerified: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  const handleVerify = (id: string, name: string, type: 'vendor' | 'restaurant' | 'service_provider') => {
    verifyVendorMutation.mutate({ id, type }, {
      onSuccess: () => {
        toast({
          title: "Business Verified",
          description: `${name} has been verified successfully.`,
        });
      },
      onError: () => {
        toast({
          title: "Verification Failed",
          description: "Failed to verify the business. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleReject = (id: string, name: string, type: 'vendor' | 'restaurant' | 'service_provider') => {
    rejectVendorMutation.mutate({ id, type }, {
      onSuccess: () => {
        toast({
          title: "Business Rejected",
          description: `${name}'s application has been rejected.`,
          variant: "destructive",
        });
      },
      onError: () => {
        toast({
          title: "Rejection Failed",
          description: "Failed to reject the business. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  // Combine all pending verifications
  const allPendingVerifications = [
    ...(stats?.vendors.pendingVerifications || []),
    ...(stats?.restaurants.pendingVerifications || []),
    ...(stats?.serviceProviders.pendingVerifications || []),
  ];

  // Calculate totals
  const totalVendorTypes = (stats?.vendors.total || 0) + (stats?.restaurants.total || 0) + (stats?.serviceProviders.total || 0);
  const totalListings = (stats?.products.total || 0) + (stats?.menuItems.total || 0) + (stats?.serviceOfferings.total || 0);

  const dashboardStats = [
    { label: "Total Users", value: stats?.users.total || 0, icon: Users, color: "text-chart-1" },
    { label: "All Businesses", value: totalVendorTypes, icon: Store, color: "text-chart-2" },
    { label: "Total Listings", value: totalListings, icon: ShoppingBag, color: "text-chart-3" },
    { label: "Events", value: stats?.events.total || 0, icon: Calendar, color: "text-chart-4" },
    { label: "Total Orders", value: stats?.orders.total || 0, icon: ShoppingBag, color: "text-chart-1" },
    { label: "Paid Orders", value: stats?.orders.paid || 0, icon: DollarSign, color: "text-chart-2" },
    { 
      label: "Total Revenue", 
      value: `$${((stats?.revenue.totalCents || 0) / 100).toFixed(2)}`, 
      icon: DollarSign, 
      color: "text-chart-3" 
    },
    { 
      label: "Paid Revenue", 
      value: `$${((stats?.revenue.paidCents || 0) / 100).toFixed(2)}`, 
      icon: DollarSign, 
      color: "text-chart-4" 
    },
  ];

  const getVendorTypeIcon = (type: 'vendor' | 'restaurant' | 'service_provider') => {
    switch (type) {
      case 'vendor':
        return Store;
      case 'restaurant':
        return Utensils;
      case 'service_provider':
        return Wrench;
    }
  };

  const getVendorTypeLabel = (type: 'vendor' | 'restaurant' | 'service_provider') => {
    switch (type) {
      case 'vendor':
        return 'Shop';
      case 'restaurant':
        return 'Restaurant';
      case 'service_provider':
        return 'Service Provider';
    }
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="h-16" aria-hidden="true" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-16" aria-hidden="true" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold" data-testid="heading-admin-dashboard">Admin Dashboard</h1>
          <Badge variant="destructive">Admin Access</Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {dashboardStats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold font-mono" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Business Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Shop Vendors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-mono font-semibold">{stats?.vendors.total || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Verified</span>
                  <span className="font-mono font-semibold text-green-600">{stats?.vendors.verified || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="font-mono font-semibold text-amber-600">{stats?.vendors.unverified || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="w-5 h-5" />
                Restaurants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-mono font-semibold">{stats?.restaurants.total || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Verified</span>
                  <span className="font-mono font-semibold text-green-600">{stats?.restaurants.verified || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="font-mono font-semibold text-amber-600">{stats?.restaurants.unverified || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Service Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-mono font-semibold">{stats?.serviceProviders.total || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Verified</span>
                  <span className="font-mono font-semibold text-green-600">{stats?.serviceProviders.verified || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="font-mono font-semibold text-amber-600">{stats?.serviceProviders.unverified || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Business Verifications */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Pending Business Verifications</CardTitle>
            <CardDescription>
              Review and approve business applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allPendingVerifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-pending-verifications">
                No pending verifications
              </div>
            ) : (
              <div className="space-y-4">
                {allPendingVerifications.map((business) => {
                  const Icon = getVendorTypeIcon(business.type);
                  return (
                    <div
                      key={business.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                      data-testid={`business-verification-${business.id}`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className="w-5 h-5 mt-1 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{business.businessName}</h3>
                            <Badge variant="outline">{getVendorTypeLabel(business.type)}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {business.city} • {business.contactEmail}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleVerify(business.id, business.businessName, business.type)}
                          disabled={verifyVendorMutation.isPending}
                          data-testid={`button-verify-${business.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(business.id, business.businessName, business.type)}
                          disabled={rejectVendorMutation.isPending}
                          data-testid={`button-reject-${business.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>All User Accounts</CardTitle>
            <CardDescription>
              View and manage all registered users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserAccountsList />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
