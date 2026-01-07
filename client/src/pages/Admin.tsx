import { CheckCircle, XCircle, Users, ShoppingBag, Mail, Phone, Store, CreditCard, Link2, Search, AlertTriangle, RefreshCw, UserPlus, Plus, Tag, Trash2, Eye, Edit, History, ClipboardList, Download } from "lucide-react";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, Deal } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, Component, ErrorInfo, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AdminErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Admin Error Boundary] Caught error:', error);
    console.error('[Admin Error Boundary] Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background">
          <Header />
          <div className="h-16" aria-hidden="true" />
          <main className="max-w-4xl mx-auto px-4 py-8">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Admin Dashboard Error
                </CardTitle>
                <CardDescription>
                  Something went wrong while loading the admin dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm">
                  <strong>Error:</strong> {this.state.error?.message || 'Unknown error'}
                </div>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                  {this.state.error?.stack || 'No stack trace available'}
                </pre>
                <Button onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}

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

interface AdminVendor {
  id: string;
  businessName: string;
  city: string;
  vendorType: string;
  isVerified: boolean;
}

interface AdminDeal extends Deal {
  vendorName: string;
  vendorCity: string;
}

interface AdminRedemption {
  id: string;
  dealId: string;
  vendorId: string;
  userId: string;
  status: string;
  redeemedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  dealTitle?: string;
  vendorName?: string;
  userName?: string;
  userEmail?: string;
  isPremiumDeal?: boolean;
}

interface AdminAuditLog {
  id: string;
  adminUserId: string;
  adminEmail: string | null;
  actionType: string;
  entityType: string;
  entityId: string;
  entityName: string | null;
  previousState: any;
  newState: any;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string | null;
}

const DEAL_CATEGORIES = ["Food & Drink", "Retail", "Beauty", "Fitness", "Services", "Experiences"];
const DEAL_CITIES = ["Fort Myers", "Cape Coral", "Bonita Springs", "Estero", "Naples"];

function DealManagement() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<AdminDeal | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [tierFilter, setTierFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dealForm, setDealForm] = useState({
    title: "",
    description: "",
    finePrint: "",
    category: "",
    city: "Fort Myers",
    discountType: "percent" as "percent" | "dollar" | "bogo" | "free_item",
    discountValue: "",
    discountCode: "",
    tier: "standard" as "standard" | "member",
    isActive: true,
    status: "published" as "draft" | "published" | "paused" | "expired",
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery<AdminVendor[]>({
    queryKey: ["/api/admin/vendors"],
  });

  const { data: deals = [], isLoading: dealsLoading } = useQuery<AdminDeal[]>({
    queryKey: ["/api/admin/deals"],
  });

  const createDealMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/deals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Deal Created", description: "The deal has been created successfully." });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Deal",
        description: error.message || "An error occurred while creating the deal.",
        variant: "destructive",
      });
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return await apiRequest("DELETE", `/api/admin/deals/${dealId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Deal Deleted", description: "The deal has been removed." });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Deal",
        description: error.message || "An error occurred.",
        variant: "destructive",
      });
    },
  });

  const updateDealMutation = useMutation({
    mutationFn: async ({ dealId, data }: { dealId: string; data: any }) => {
      return await apiRequest("PATCH", `/api/admin/deals/${dealId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Deal Updated", description: "The deal has been updated successfully." });
      setEditDialogOpen(false);
      setEditingDeal(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Deal",
        description: error.message || "An error occurred.",
        variant: "destructive",
      });
    },
  });

  const duplicateDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return await apiRequest("POST", `/api/admin/deals/${dealId}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Deal Duplicated", description: "A copy of the deal has been created." });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Duplicate Deal",
        description: error.message || "An error occurred.",
        variant: "destructive",
      });
    },
  });

  const handleEditDeal = (deal: AdminDeal) => {
    setEditingDeal(deal);
    setDealForm({
      title: deal.title,
      description: deal.description || "",
      finePrint: deal.finePrint || "",
      category: deal.category || "",
      city: deal.vendorCity || "Fort Myers",
      discountType: (deal.discountType as "percent" | "dollar" | "bogo" | "free_item") || "percent",
      discountValue: deal.discountValue?.toString() || "",
      discountCode: deal.discountCode || "",
      tier: deal.tier === "member" || deal.tier === "premium" ? "member" : "standard",
      isActive: deal.isActive,
      status: deal.status as "draft" | "published" | "paused" | "expired",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeal) return;
    if (!dealForm.title || !dealForm.description) {
      toast({ title: "Missing Fields", description: "Title and description are required.", variant: "destructive" });
      return;
    }

    const discountValue = (dealForm.discountType === "bogo" || dealForm.discountType === "free_item")
      ? undefined
      : dealForm.discountValue ? parseFloat(dealForm.discountValue) : undefined;

    const updateData = {
      title: dealForm.title,
      description: dealForm.description,
      finePrint: dealForm.finePrint || undefined,
      category: dealForm.category || undefined,
      discountType: dealForm.discountType,
      discountValue,
      discountCode: dealForm.discountCode || undefined,
      tier: dealForm.tier,
      isActive: dealForm.isActive,
      status: dealForm.status,
      isPassLocked: dealForm.tier === "member",
    };

    updateDealMutation.mutate({ dealId: editingDeal.id, data: updateData });
  };

  const resetForm = () => {
    setSelectedVendorId("");
    setDealForm({
      title: "",
      description: "",
      finePrint: "",
      category: "",
      city: "Fort Myers",
      discountType: "percent",
      discountValue: "",
      discountCode: "",
      tier: "standard",
      isActive: true,
      status: "published",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) {
      toast({ title: "Select a Business", description: "Please select a business for this deal.", variant: "destructive" });
      return;
    }
    if (!dealForm.title || !dealForm.description) {
      toast({ title: "Missing Fields", description: "Title and description are required.", variant: "destructive" });
      return;
    }

    // For bogo/free_item, discountValue should be undefined (not required)
    const discountValue = (dealForm.discountType === "bogo" || dealForm.discountType === "free_item")
      ? undefined
      : dealForm.discountValue ? parseFloat(dealForm.discountValue) : undefined;

    const dealData = {
      vendorId: selectedVendorId,
      title: dealForm.title,
      description: dealForm.description,
      finePrint: dealForm.finePrint || undefined,
      category: dealForm.category || undefined,
      city: dealForm.city,
      discountType: dealForm.discountType,
      discountValue,
      discountCode: dealForm.discountCode || undefined,
      tier: dealForm.tier,
      dealType: dealForm.discountType === "bogo" ? "bogo" : dealForm.discountType === "percent" ? "percent" : "addon",
      isActive: dealForm.isActive,
      status: dealForm.status,
      isPassLocked: dealForm.tier === "member",
      redemptionFrequency: "weekly",
      maxRedemptionsPerUser: 1,
    };

    createDealMutation.mutate(dealData);
  };

  const publishedDeals = deals.filter(d => d.status === "published");
  const draftDeals = deals.filter(d => d.status === "draft");
  const pausedDeals = deals.filter(d => d.status === "paused");

  // Apply filters
  const filteredDeals = deals.filter(deal => {
    if (statusFilter && deal.status !== statusFilter) return false;
    if (tierFilter === "member" && deal.tier !== "member" && deal.tier !== "premium") return false;
    if (tierFilter === "standard" && (deal.tier === "member" || deal.tier === "premium")) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!deal.title.toLowerCase().includes(search) && 
          !deal.vendorName?.toLowerCase().includes(search)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32" data-testid="select-deal-status-filter">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All ({deals.length})</SelectItem>
                <SelectItem value="published">Published ({publishedDeals.length})</SelectItem>
                <SelectItem value="draft">Draft ({draftDeals.length})</SelectItem>
                <SelectItem value="paused">Paused ({pausedDeals.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tier</Label>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-32" data-testid="select-deal-tier-filter">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="member">Premium Only</SelectItem>
                <SelectItem value="standard">Free</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Search</Label>
            <Input
              placeholder="Title or business..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
              data-testid="input-deal-search"
            />
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-deal-admin">
          <Plus className="w-4 h-4 mr-2" />
          Create Deal
        </Button>
      </div>

      {dealsLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-no-deals">
          {deals.length === 0 ? "No deals found. Create your first deal above." : "No deals match your filters."}
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredDeals.map((deal) => (
            <div
              key={deal.id}
              className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
              data-testid={`deal-row-${deal.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{deal.title}</span>
                  <Badge variant={deal.status === "published" ? "default" : deal.status === "paused" ? "secondary" : "outline"}>
                    {deal.status}
                  </Badge>
                  {(deal.tier === "member" || deal.tier === "premium") && (
                    <Badge variant="secondary" className="text-xs">Pass Only</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {deal.vendorName} • {deal.vendorCity}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleEditDeal(deal)}
                  data-testid={`button-edit-deal-${deal.id}`}
                  title="Edit deal"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => duplicateDealMutation.mutate(deal.id)}
                  disabled={duplicateDealMutation.isPending}
                  data-testid={`button-duplicate-deal-${deal.id}`}
                  title="Duplicate deal"
                >
                  <Download className="w-4 h-4 rotate-180" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteDealMutation.mutate(deal.id)}
                  disabled={deleteDealMutation.isPending}
                  data-testid={`button-delete-deal-${deal.id}`}
                  title="Delete deal"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Deal for Business</DialogTitle>
            <DialogDescription>
              Create a deal on behalf of any business
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Business *</Label>
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId} disabled={vendorsLoading}>
                <SelectTrigger data-testid="select-vendor-for-deal">
                  <SelectValue placeholder={vendorsLoading ? "Loading businesses..." : "Select a business"} />
                </SelectTrigger>
                <SelectContent>
                  {vendorsLoading ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                  ) : vendors.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No businesses found</div>
                  ) : (
                    vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.businessName} ({vendor.city})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Deal Title *</Label>
              <Input
                value={dealForm.title}
                onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                placeholder="e.g., Buy One Get One Free"
                data-testid="input-admin-deal-title"
              />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={dealForm.description}
                onChange={(e) => setDealForm({ ...dealForm, description: e.target.value })}
                placeholder="Describe the deal..."
                rows={3}
                data-testid="input-admin-deal-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={dealForm.discountType}
                  onValueChange={(v: "percent" | "dollar" | "bogo" | "free_item") => setDealForm({ ...dealForm, discountType: v })}
                >
                  <SelectTrigger data-testid="select-admin-discount-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage Off</SelectItem>
                    <SelectItem value="dollar">Dollar Off</SelectItem>
                    <SelectItem value="bogo">Buy One Get One</SelectItem>
                    <SelectItem value="free_item">Free Item</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {dealForm.discountType === "percent" ? "Percentage" : "Amount"}
                </Label>
                <Input
                  type="number"
                  value={dealForm.discountValue}
                  onChange={(e) => setDealForm({ ...dealForm, discountValue: e.target.value })}
                  placeholder={dealForm.discountType === "percent" ? "e.g., 20" : "e.g., 10"}
                  disabled={dealForm.discountType === "bogo" || dealForm.discountType === "free_item"}
                  data-testid="input-admin-discount-value"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={dealForm.category}
                  onValueChange={(v) => setDealForm({ ...dealForm, category: v })}
                >
                  <SelectTrigger data-testid="select-admin-deal-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>City</Label>
                <Select
                  value={dealForm.city}
                  onValueChange={(v) => setDealForm({ ...dealForm, city: v })}
                >
                  <SelectTrigger data-testid="select-admin-deal-city">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_CITIES.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fine Print</Label>
              <Textarea
                value={dealForm.finePrint}
                onChange={(e) => setDealForm({ ...dealForm, finePrint: e.target.value })}
                placeholder="Any terms or restrictions..."
                rows={2}
                data-testid="input-admin-deal-fine-print"
              />
            </div>

            <div className="space-y-2">
              <Label>Discount Code (Optional)</Label>
              <Input
                value={dealForm.discountCode}
                onChange={(e) => setDealForm({ ...dealForm, discountCode: e.target.value })}
                placeholder="e.g., SAVE20"
                data-testid="input-admin-discount-code"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select
                  value={dealForm.tier}
                  onValueChange={(v: "standard" | "member") => setDealForm({ ...dealForm, tier: v })}
                >
                  <SelectTrigger data-testid="select-admin-deal-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (Free)</SelectItem>
                    <SelectItem value="member">Member Only (Pass Required)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={dealForm.status}
                  onValueChange={(v: "draft" | "published" | "paused" | "expired") => setDealForm({ ...dealForm, status: v })}
                >
                  <SelectTrigger data-testid="select-admin-deal-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Make this deal visible</p>
              </div>
              <Switch
                checked={dealForm.isActive}
                onCheckedChange={(checked) => setDealForm({ ...dealForm, isActive: checked })}
                data-testid="switch-admin-deal-active"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDealMutation.isPending} data-testid="button-submit-admin-deal">
                {createDealMutation.isPending ? "Creating..." : "Create Deal"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Deal Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingDeal(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
            <DialogDescription>
              Update deal details for {editingDeal?.vendorName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Deal Title *</Label>
              <Input
                value={dealForm.title}
                onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                placeholder="e.g., Buy One Get One Free"
                data-testid="input-edit-deal-title"
              />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={dealForm.description}
                onChange={(e) => setDealForm({ ...dealForm, description: e.target.value })}
                placeholder="Describe the deal..."
                rows={3}
                data-testid="input-edit-deal-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={dealForm.discountType}
                  onValueChange={(v: "percent" | "dollar" | "bogo" | "free_item") => setDealForm({ ...dealForm, discountType: v })}
                >
                  <SelectTrigger data-testid="select-edit-discount-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent Off</SelectItem>
                    <SelectItem value="dollar">Dollar Off</SelectItem>
                    <SelectItem value="bogo">BOGO</SelectItem>
                    <SelectItem value="free_item">Free Item</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(dealForm.discountType === "percent" || dealForm.discountType === "dollar") && (
                <div className="space-y-2">
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    value={dealForm.discountValue}
                    onChange={(e) => setDealForm({ ...dealForm, discountValue: e.target.value })}
                    placeholder={dealForm.discountType === "percent" ? "e.g., 20" : "e.g., 5"}
                    data-testid="input-edit-discount-value"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Discount Code (optional)</Label>
              <Input
                value={dealForm.discountCode}
                onChange={(e) => setDealForm({ ...dealForm, discountCode: e.target.value })}
                placeholder="e.g., SAVE20"
                data-testid="input-edit-discount-code"
              />
            </div>

            <div className="space-y-2">
              <Label>Fine Print (optional)</Label>
              <Textarea
                value={dealForm.finePrint}
                onChange={(e) => setDealForm({ ...dealForm, finePrint: e.target.value })}
                placeholder="Terms and conditions..."
                rows={2}
                data-testid="input-edit-fine-print"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select
                  value={dealForm.tier}
                  onValueChange={(v: "standard" | "member") => setDealForm({ ...dealForm, tier: v })}
                >
                  <SelectTrigger data-testid="select-edit-deal-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (Free)</SelectItem>
                    <SelectItem value="member">Member Only (Pass Required)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={dealForm.status}
                  onValueChange={(v: "draft" | "published" | "paused" | "expired") => setDealForm({ ...dealForm, status: v })}
                >
                  <SelectTrigger data-testid="select-edit-deal-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Make this deal visible</p>
              </div>
              <Switch
                checked={dealForm.isActive}
                onCheckedChange={(checked) => setDealForm({ ...dealForm, isActive: checked })}
                data-testid="switch-edit-deal-active"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setEditDialogOpen(false); setEditingDeal(null); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateDealMutation.isPending} data-testid="button-save-edit-deal">
                {updateDealMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RedemptionManagement() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    status: '',
    isPremium: '',
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(0);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<AdminRedemption | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const pageSize = 20;

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.set('limit', String(pageSize));
    params.set('offset', String(page * pageSize));
    if (filters.status) params.set('status', filters.status);
    if (filters.isPremium) params.set('isPremium', filters.isPremium);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    return params.toString();
  };

  const { data, isLoading, refetch } = useQuery<{ redemptions: AdminRedemption[]; total: number }>({
    queryKey: ['/api/admin/redemptions', filters, page],
    queryFn: async () => {
      const response = await fetch(`/api/admin/redemptions?${buildQueryString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch redemptions');
      return response.json();
    },
  });

  const voidMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await apiRequest('POST', `/api/admin/redemptions/${id}/void`, { reason });
    },
    onSuccess: () => {
      toast({ title: 'Redemption Voided', description: 'The redemption has been voided.' });
      setVoidDialogOpen(false);
      setVoidTarget(null);
      setVoidReason('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to Void', description: error.message, variant: 'destructive' });
    },
  });

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.isPremium) params.set('isPremium', filters.isPremium);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    window.open(`/api/admin/redemptions/export?${params.toString()}`, '_blank');
  };

  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={filters.status} onValueChange={(v) => { setFilters({ ...filters, status: v }); setPage(0); }}>
            <SelectTrigger className="w-32" data-testid="select-redemption-status">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="redeemed">Redeemed</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Deal Tier</Label>
          <Select value={filters.isPremium} onValueChange={(v) => { setFilters({ ...filters, isPremium: v }); setPage(0); }}>
            <SelectTrigger className="w-32" data-testid="select-redemption-tier">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="true">Premium</SelectItem>
              <SelectItem value="false">Free</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input 
            type="date" 
            value={filters.startDate} 
            onChange={(e) => { setFilters({ ...filters, startDate: e.target.value }); setPage(0); }}
            className="w-36"
            data-testid="input-redemption-start-date"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input 
            type="date" 
            value={filters.endDate} 
            onChange={(e) => { setFilters({ ...filters, endDate: e.target.value }); setPage(0); }}
            className="w-36"
            data-testid="input-redemption-end-date"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export-redemptions">
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : data?.redemptions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-no-redemptions">
          No redemptions found
        </div>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Deal</th>
                  <th className="text-left p-3 font-medium">Vendor</th>
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.redemptions.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30" data-testid={`row-redemption-${r.id}`}>
                    <td className="p-3">
                      <div className="font-medium">{r.dealTitle || 'Unknown Deal'}</div>
                      {r.isPremiumDeal && <Badge variant="secondary" className="text-xs mt-1">Premium</Badge>}
                    </td>
                    <td className="p-3 text-muted-foreground">{r.vendorName || 'Unknown'}</td>
                    <td className="p-3">
                      <div>{r.userName || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{r.userEmail}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {r.redeemedAt ? new Date(r.redeemedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-3">
                      <Badge variant={r.status === 'voided' ? 'destructive' : 'outline'}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      {r.status !== 'voided' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => { setVoidTarget(r); setVoidDialogOpen(true); }}
                          data-testid={`button-void-${r.id}`}
                        >
                          Void
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, data?.total || 0)} of {data?.total || 0}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(Math.max(0, page - 1))} 
                disabled={page === 0}
                data-testid="button-prev-page"
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(page + 1)} 
                disabled={page >= totalPages - 1}
                data-testid="button-next-page"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <AlertDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Redemption</AlertDialogTitle>
            <AlertDialogDescription>
              This will void the redemption for "{voidTarget?.dealTitle}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Reason (required)</Label>
            <Textarea 
              value={voidReason} 
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Enter reason for voiding this redemption..."
              className="mt-2"
              data-testid="input-void-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setVoidTarget(null); setVoidReason(''); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => voidTarget && voidMutation.mutate({ id: voidTarget.id, reason: voidReason })}
              disabled={voidReason.length < 5 || voidMutation.isPending}
              data-testid="button-confirm-void"
            >
              {voidMutation.isPending ? 'Voiding...' : 'Void Redemption'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AuditLogViewer() {
  const [filters, setFilters] = useState({
    actionType: '',
    entityType: '',
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.set('limit', String(pageSize));
    params.set('offset', String(page * pageSize));
    if (filters.actionType) params.set('actionType', filters.actionType);
    if (filters.entityType) params.set('entityType', filters.entityType);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    return params.toString();
  };

  const { data, isLoading } = useQuery<{ logs: AdminAuditLog[]; total: number }>({
    queryKey: ['/api/admin/audit-logs', filters, page],
    queryFn: async () => {
      const response = await fetch(`/api/admin/audit-logs?${buildQueryString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Action Type</Label>
          <Select value={filters.actionType} onValueChange={(v) => { setFilters({ ...filters, actionType: v }); setPage(0); }}>
            <SelectTrigger className="w-40" data-testid="select-audit-action">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Actions</SelectItem>
              <SelectItem value="deal_create">Deal Create</SelectItem>
              <SelectItem value="deal_update">Deal Update</SelectItem>
              <SelectItem value="deal_delete">Deal Delete</SelectItem>
              <SelectItem value="deal_duplicate">Deal Duplicate</SelectItem>
              <SelectItem value="redemption_void">Redemption Void</SelectItem>
              <SelectItem value="membership_grant">Membership Grant</SelectItem>
              <SelectItem value="membership_revoke">Membership Revoke</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Entity Type</Label>
          <Select value={filters.entityType} onValueChange={(v) => { setFilters({ ...filters, entityType: v }); setPage(0); }}>
            <SelectTrigger className="w-32" data-testid="select-audit-entity">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="deal">Deal</SelectItem>
              <SelectItem value="redemption">Redemption</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input 
            type="date" 
            value={filters.startDate} 
            onChange={(e) => { setFilters({ ...filters, startDate: e.target.value }); setPage(0); }}
            className="w-36"
            data-testid="input-audit-start-date"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input 
            type="date" 
            value={filters.endDate} 
            onChange={(e) => { setFilters({ ...filters, endDate: e.target.value }); setPage(0); }}
            className="w-36"
            data-testid="input-audit-end-date"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : data?.logs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-no-audit-logs">
          No audit logs found
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {data?.logs.map((log) => (
              <div 
                key={log.id} 
                className="p-3 border rounded-lg hover:bg-muted/30"
                data-testid={`audit-log-${log.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{formatAction(log.actionType)}</Badge>
                      <Badge variant="secondary">{log.entityType}</Badge>
                      {log.entityName && <span className="text-sm font-medium">{log.entityName}</span>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      by {log.adminEmail || log.adminUserId}
                    </div>
                    {log.reason && (
                      <div className="text-sm mt-1">
                        <span className="text-muted-foreground">Reason:</span> {log.reason}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground text-right">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, data?.total || 0)} of {data?.total || 0}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(Math.max(0, page - 1))} 
                disabled={page === 0}
                data-testid="button-audit-prev"
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(page + 1)} 
                disabled={page >= totalPages - 1}
                data-testid="button-audit-next"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
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
                    (user.isAdmin === true || user.role === 'admin') ? 'destructive' : 
                    (user.isVendor === true || user.role === 'vendor') ? 'default' : 
                    'secondary'
                  }>
                    {(user.isAdmin && user.isVendor) ? 'admin+vendor' : 
                     user.isAdmin ? 'admin' : 
                     (user.isVendor || user.role === 'vendor') ? 'business' : user.role}
                  </Badge>
                  {user.isAdmin && user.isVendor && (
                    <Badge variant="outline" className="text-purple-600 border-purple-600">Multi-Role</Badge>
                  )}
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
                {(user.role === 'buyer' || user.isVendor === true || user.role === 'vendor') && (
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

function AdminContent() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // Fetch admin statistics
  const { data: stats, isLoading: statsLoading, error: statsError, isError: statsIsError } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Grant Pass to self mutation
  const grantPassToSelfMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.id) throw new Error("No user ID available");
      return await apiRequest('PATCH', `/api/admin/users/${currentUser.id}/membership`, { isPassMember: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Pass Granted",
        description: "You now have Rise Local Pass access.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Grant Pass",
        description: error.message || "An error occurred.",
        variant: "destructive",
      });
    },
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
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Rise Local Pass Memberships
                </CardTitle>
                <CardDescription>Are people buying the Pass?</CardDescription>
              </div>
              {currentUser && !currentUser.isPassMember && (
                <Button
                  size="sm"
                  onClick={() => grantPassToSelfMutation.mutate()}
                  disabled={grantPassToSelfMutation.isPending}
                  data-testid="button-grant-pass-to-me"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {grantPassToSelfMutation.isPending ? "Granting..." : "Grant Pass to Me"}
                </Button>
              )}
              {currentUser?.isPassMember && (
                <Badge variant="secondary" data-testid="badge-admin-has-pass">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  You have the Pass
                </Badge>
              )}
            </div>
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

        {/* Deal Management */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Deal Management
            </CardTitle>
            <CardDescription>Create and manage deals for any business</CardDescription>
          </CardHeader>
          <CardContent>
            <DealManagement />
          </CardContent>
        </Card>

        {/* Redemption Analytics */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Redemption Analytics
            </CardTitle>
            <CardDescription>Track and manage deal redemptions across all businesses</CardDescription>
          </CardHeader>
          <CardContent>
            <RedemptionManagement />
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Admin Audit Log
            </CardTitle>
            <CardDescription>Track all administrative actions for accountability</CardDescription>
          </CardHeader>
          <CardContent>
            <AuditLogViewer />
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

export default function Admin() {
  return (
    <AdminErrorBoundary>
      <AdminContent />
    </AdminErrorBoundary>
  );
}
