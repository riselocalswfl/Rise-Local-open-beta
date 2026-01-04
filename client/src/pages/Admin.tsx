import { CheckCircle, XCircle, Users, ShoppingBag, Mail, Phone, Store, CreditCard, Link2, Search, AlertTriangle, RefreshCw } from "lucide-react";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface OrphanedSubscription {
  subscriptionId: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  status: string;
  currentPeriodEnd: string;
  created: string;
}

interface SearchedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  isPassMember: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

interface AdminStats {
  deals: {
    total: number;
    premium: number;
    free: number;
  };
  redemptions: {
    total: number;
    premium: number;
    free: number;
  };
  membership: {
    passHolders: number;
    nonPassUsers: number;
    totalUsers: number;
    conversionRate: number;
  };
  businesses: {
    total: number;
    withDeals: number;
    withPremiumDeals: number;
    withNoDeals: number;
    needingOutreach: Array<{
      id: string;
      businessName: string;
      contactEmail: string;
      city: string;
    }>;
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
}

function UserAccountsList() {
  const { toast } = useToast();
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
  const [membershipTarget, setMembershipTarget] = useState<{ id: string; name: string; isPassMember: boolean; hasStripe: boolean } | null>(null);

  const { data: users, isLoading, error, isError } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });


  const toggleMembershipMutation = useMutation({
    mutationFn: async ({ userId, isPassMember }: { userId: string; isPassMember: boolean }) => {
      return await apiRequest('PATCH', `/api/admin/users/${userId}/membership`, { isPassMember });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: variables.isPassMember ? "Pass Granted" : "Pass Revoked",
        description: variables.isPassMember 
          ? "User now has Rise Local Pass access."
          : "Pass access has been removed.",
      });
      setMembershipDialogOpen(false);
      setMembershipTarget(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Membership",
        description: error.message || "An error occurred while updating membership.",
        variant: "destructive",
      });
      setMembershipDialogOpen(false);
    },
  });

  const syncFromStripeMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      return await apiRequest('POST', '/api/admin/sync-membership', { email });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Synced from Stripe",
        description: data.message || "Membership updated from Stripe subscription.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Sync from Stripe",
        description: error.message || "Could not sync membership from Stripe.",
        variant: "destructive",
      });
    },
  });


  const handleMembershipToggle = (user: User) => {
    const userName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`
      : user.username || user.email?.split('@')[0] || 'Unknown User';
    
    setMembershipTarget({
      id: user.id,
      name: userName,
      isPassMember: user.isPassMember || false,
      hasStripe: !!user.stripeSubscriptionId
    });
    setMembershipDialogOpen(true);
  };

  const confirmMembershipToggle = () => {
    if (membershipTarget) {
      toggleMembershipMutation.mutate({
        userId: membershipTarget.id,
        isPassMember: !membershipTarget.isPassMember
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-destructive font-medium">
          Failed to load users
        </div>
        <div className="text-sm text-muted-foreground">
          Error: {error instanceof Error ? error.message : 'Unknown error occurred'}
        </div>
        <div className="text-xs text-muted-foreground">
          Check browser console (F12) for more details
        </div>
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
    <>
      <div className="space-y-3">
        {users.map((user) => {
          return (
            <div
              key={user.id}
              className="flex items-start justify-between gap-4 p-4 border rounded-lg hover-elevate"
              data-testid={`user-card-${user.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-medium">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.username || user.email?.split('@')[0] || 'Unknown User'}
                  </h3>
                  <Badge variant={
                    user.role === 'admin' ? 'destructive' : 
                    user.role === 'vendor' ? 'default' : 
                    'secondary'
                  }>
                    {user.role === 'vendor' ? 'business' : user.role}
                  </Badge>
                  {user.isPassMember && (
                    <Badge 
                      variant="outline" 
                      className="text-green-600 border-green-600"
                      data-testid={`badge-pass-member-${user.id}`}
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Pass Member
                      {user.stripeSubscriptionId ? ' (Stripe)' : ' (Manual)'}
                    </Badge>
                  )}
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
                  {user.isPassMember && user.passExpiresAt && (
                    <div className="text-xs space-y-0.5">
                      <p className="text-green-600">
                        Pass expires: {new Date(user.passExpiresAt).toLocaleDateString()}
                      </p>
                      {user.updatedAt && (
                        <p className="text-muted-foreground">
                          Last updated: {new Date(user.updatedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <div className="text-xs text-muted-foreground">
                  {user.createdAt && new Date(user.createdAt).toLocaleDateString()}
                </div>
                
                {/* Pass Toggle Button - show for buyers and vendors */}
                {(user.role === 'buyer' || user.role === 'vendor') && (
                  <div className="flex gap-2">
                    {user.stripeSubscriptionId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => user.email && syncFromStripeMutation.mutate({ email: user.email })}
                        disabled={syncFromStripeMutation.isPending || !user.email}
                        data-testid={`button-sync-stripe-${user.id}`}
                        title="Sync membership from Stripe subscription"
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${syncFromStripeMutation.isPending ? 'animate-spin' : ''}`} />
                        Sync Stripe
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={user.isPassMember ? "outline" : "default"}
                      onClick={() => handleMembershipToggle(user)}
                      disabled={toggleMembershipMutation.isPending}
                      data-testid={`button-toggle-pass-${user.id}`}
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      {user.isPassMember ? 'Revoke Pass' : 'Grant Pass'}
                    </Button>
                  </div>
                )}
                
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={membershipDialogOpen} onOpenChange={setMembershipDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {membershipTarget?.isPassMember ? 'Revoke Pass Access?' : 'Grant Pass Access?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {membershipTarget && (
                <>
                  {membershipTarget.isPassMember ? (
                    <>
                      You are about to remove Rise Local Pass access from <strong>{membershipTarget.name}</strong>.
                      {membershipTarget.hasStripe && (
                        <>
                          <br /><br />
                          <strong className="text-amber-600">Note:</strong> This user has an active Stripe subscription. 
                          Revoking access manually will not cancel their billing. Consider contacting them first.
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      You are about to grant Rise Local Pass access to <strong>{membershipTarget.name}</strong>.
                      <br /><br />
                      This will be marked as a manual override (not a Stripe subscription). 
                      The user will have full Pass benefits until the end of this month.
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-membership">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmMembershipToggle}
              data-testid="button-confirm-membership"
              disabled={toggleMembershipMutation.isPending}
              className={membershipTarget?.isPassMember ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {toggleMembershipMutation.isPending 
                ? 'Updating...' 
                : membershipTarget?.isPassMember 
                  ? 'Revoke Pass' 
                  : 'Grant Pass'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SubscriptionReconciliation() {
  const { toast } = useToast();
  const [selectedSub, setSelectedSub] = useState<OrphanedSubscription | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: orphanedSubs, isLoading, refetch } = useQuery<OrphanedSubscription[]>({
    queryKey: ["/api/admin/orphaned-subscriptions"],
  });

  const linkMutation = useMutation({
    mutationFn: async ({ subscriptionId, customerId, targetUserId }: { subscriptionId: string; customerId: string; targetUserId: string }) => {
      return await apiRequest('POST', '/api/admin/link-subscription', { subscriptionId, customerId, targetUserId });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Subscription Linked",
        description: data.message || "User now has Rise Local Pass access.",
      });
      setSelectedSub(null);
      setSearchQuery('');
      setSearchResults([]);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Link",
        description: error.message || "An error occurred.",
        variant: "destructive",
      });
    },
  });

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setIsSearching(true);
    try {
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`);
      const users = await response.json();
      setSearchResults(users);
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLink = (user: SearchedUser) => {
    if (!selectedSub) return;
    linkMutation.mutate({
      subscriptionId: selectedSub.subscriptionId,
      customerId: selectedSub.customerId,
      targetUserId: user.id,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (!orphanedSubs || orphanedSubs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground" data-testid="text-no-orphaned-subscriptions">
        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
        All active subscriptions are linked to users
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-amber-600 mb-4">
        <AlertTriangle className="w-5 h-5" />
        <span className="text-sm font-medium">{orphanedSubs.length} subscription(s) need to be linked to app users</span>
      </div>

      {orphanedSubs.map((sub) => (
        <div
          key={sub.subscriptionId}
          className={`p-4 border rounded-lg ${selectedSub?.subscriptionId === sub.subscriptionId ? 'ring-2 ring-primary' : ''}`}
          data-testid={`orphaned-sub-${sub.subscriptionId}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{sub.customerEmail || 'No email'}</span>
                <Badge variant="outline" className="text-green-600">{sub.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Customer: {sub.customerName || 'Unknown'}</div>
                <div>Expires: {new Date(sub.currentPeriodEnd).toLocaleDateString()}</div>
                <div className="font-mono text-xs">{sub.subscriptionId}</div>
              </div>
            </div>
            <Button
              size="sm"
              variant={selectedSub?.subscriptionId === sub.subscriptionId ? "secondary" : "outline"}
              onClick={() => {
                setSelectedSub(selectedSub?.subscriptionId === sub.subscriptionId ? null : sub);
                setSearchQuery('');
                setSearchResults([]);
              }}
              data-testid={`button-select-sub-${sub.subscriptionId}`}
            >
              {selectedSub?.subscriptionId === sub.subscriptionId ? 'Cancel' : 'Link to User'}
            </Button>
          </div>

          {selectedSub?.subscriptionId === sub.subscriptionId && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  data-testid="input-user-search"
                />
                <Button
                  onClick={handleSearch}
                  disabled={searchQuery.length < 2 || isSearching}
                  data-testid="button-search-users"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 border rounded hover-elevate"
                      data-testid={`search-result-${user.id}`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {user.firstName} {user.lastName} {user.username && `(@${user.username})`}
                        </div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                        {user.isPassMember && (
                          <Badge variant="secondary" className="text-xs mt-1">Already has Pass</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleLink(user)}
                        disabled={linkMutation.isPending}
                        data-testid={`button-link-user-${user.id}`}
                      >
                        <Link2 className="w-3 h-3 mr-1" />
                        Link
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No users found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const { toast } = useToast();

  // Fetch admin statistics
  const { data: stats, isLoading: statsLoading, error: statsError, isError: statsIsError } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Verify vendor mutation
  const verifyVendorMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      return await apiRequest('PATCH', `/api/admin/vendors/${id}/verify`, { isVerified: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  // Reject vendor mutation
  const rejectVendorMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      return await apiRequest('PATCH', `/api/admin/vendors/${id}/verify`, { isVerified: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  const handleVerify = (id: string, name: string) => {
    verifyVendorMutation.mutate({ id }, {
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

  const handleReject = (id: string, name: string) => {
    rejectVendorMutation.mutate({ id }, {
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

  // All pending verifications from unified vendors table
  const allPendingVerifications = stats?.vendors.pendingVerifications || [];

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

  if (statsIsError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="h-16" aria-hidden="true" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
            <Badge variant="destructive">Admin Access</Badge>
          </div>
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Failed to Load Statistics</CardTitle>
              <CardDescription>
                Unable to fetch admin statistics from the server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                <strong>Error:</strong> {statsError instanceof Error ? statsError.message : 'Unknown error occurred'}
              </div>
              <div className="text-sm text-muted-foreground">
                This usually means:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>You're not logged in as an admin</li>
                  <li>Your admin role is not recognized by the server</li>
                  <li>There's a server connection issue</li>
                </ul>
              </div>
              <div className="text-xs text-muted-foreground">
                Press F12 and check the Console tab for detailed error messages
              </div>
            </CardContent>
          </Card>
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

        {/* Deal Metrics - Core KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Active Deals
              </CardTitle>
              <CardDescription>Are businesses participating?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Deals</span>
                  <span className="text-3xl font-bold font-mono" data-testid="stat-total-deals">{stats?.deals.total || 0}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Premium (Pass-only)</span>
                    <span className="text-xl font-semibold font-mono text-primary" data-testid="stat-premium-deals">{stats?.deals.premium || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Free (Public)</span>
                    <span className="text-xl font-semibold font-mono" data-testid="stat-free-deals">{stats?.deals.free || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Deal Redemptions
              </CardTitle>
              <CardDescription>Are deals being used?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Redemptions</span>
                  <span className="text-3xl font-bold font-mono" data-testid="stat-total-redemptions">{stats?.redemptions.total || 0}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Premium Deals</span>
                    <span className="text-xl font-semibold font-mono text-primary" data-testid="stat-premium-redemptions">{stats?.redemptions.premium || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Free Deals</span>
                    <span className="text-xl font-semibold font-mono" data-testid="stat-free-redemptions">{stats?.redemptions.free || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Membership Metrics - High Priority */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Rise Local Pass Memberships
            </CardTitle>
            <CardDescription>Are people buying the Pass?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Pass Holders</span>
                <span className="text-3xl font-bold font-mono text-green-600" data-testid="stat-pass-holders">{stats?.membership.passHolders || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Non-Pass Users</span>
                <span className="text-3xl font-bold font-mono" data-testid="stat-non-pass-users">{stats?.membership.nonPassUsers || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Total Users</span>
                <span className="text-3xl font-bold font-mono" data-testid="stat-total-users">{stats?.membership.totalUsers || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Conversion Rate</span>
                <span className="text-3xl font-bold font-mono text-primary" data-testid="stat-conversion-rate">{stats?.membership.conversionRate || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Participation Health */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              Business Participation
            </CardTitle>
            <CardDescription>Are businesses actually participating?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Total Businesses</span>
                <span className="text-2xl font-bold font-mono" data-testid="stat-total-businesses">{stats?.businesses.total || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">With Active Deals</span>
                <span className="text-2xl font-bold font-mono text-green-600" data-testid="stat-businesses-with-deals">{stats?.businesses.withDeals || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">With Premium Deals</span>
                <span className="text-2xl font-bold font-mono text-primary" data-testid="stat-businesses-with-premium">{stats?.businesses.withPremiumDeals || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">No Deals (Need Outreach)</span>
                <span className="text-2xl font-bold font-mono text-amber-600" data-testid="stat-businesses-no-deals">{stats?.businesses.withNoDeals || 0}</span>
              </div>
            </div>
            
            {(stats?.businesses.needingOutreach?.length ?? 0) > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3 text-amber-600">Businesses Needing Outreach</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {stats?.businesses.needingOutreach.slice(0, 6).map((business) => (
                    <div key={business.id} className="flex items-center justify-between p-2 border rounded text-sm">
                      <span className="font-medium">{business.businessName}</span>
                      <span className="text-muted-foreground text-xs">{business.city}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Stats */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="w-4 h-4" />
              Business Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="font-mono text-2xl font-semibold">{stats?.vendors.total || 0}</div>
                <div className="text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50">
                <div className="font-mono text-2xl font-semibold text-green-600">{stats?.vendors.verified || 0}</div>
                <div className="text-muted-foreground">Verified</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-50">
                <div className="font-mono text-2xl font-semibold text-amber-600">{stats?.vendors.unverified || 0}</div>
                <div className="text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                {allPendingVerifications.map((business) => (
                  <div
                    key={business.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`business-verification-${business.id}`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <Store className="w-5 h-5 mt-1 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{business.businessName}</h3>
                          <Badge variant="outline">Business</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {business.city} • {business.contactEmail}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleVerify(business.id, business.businessName)}
                        disabled={verifyVendorMutation.isPending}
                        data-testid={`button-verify-${business.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(business.id, business.businessName)}
                        disabled={rejectVendorMutation.isPending}
                        data-testid={`button-reject-${business.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Reconciliation */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Subscription Reconciliation
            </CardTitle>
            <CardDescription>
              Link active Stripe subscriptions to app users who haven't received their Rise Local Pass
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionReconciliation />
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
