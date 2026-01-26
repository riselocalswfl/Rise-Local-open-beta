import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertTriangle,
  MapPin,
  RefreshCw,
  ShoppingBag,
  Activity,
  Target,
  BarChart3,
  Percent,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { queryClient } from "@/lib/queryClient";

interface RevenueAnalytics {
  mrr: number;
  mrrGrowth: number;
  churnRate: number;
  arpu: number;
  ltv: number;
  totalPassMembers: number;
  monthlyData: Array<{
    month: string;
    mrr: number;
    newSubscriptions: number;
    cancellations: number;
  }>;
}

interface UserAnalytics {
  totalUsers: number;
  passMembers: number;
  freeUsers: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  conversionRate: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyData: Array<{
    month: string;
    totalUsers: number;
    passMembers: number;
    freeUsers: number;
    newSignups: number;
  }>;
  geographicBreakdown: Array<{
    city: string;
    count: number;
  }>;
  cohortRetention: {
    thirtyDay: number;
    sixtyDay: number;
    ninetyDay: number;
  };
}

interface DealAnalytics {
  totalDeals: number;
  activeDeals: number;
  premiumDeals: number;
  freeDeals: number;
  totalRedemptions: number;
  redemptionRate: number;
  topDeals: Array<{
    id: string;
    title: string;
    vendorName: string;
    redemptionCount: number;
    isPremium: boolean;
  }>;
  underperformingDeals: Array<{
    id: string;
    title: string;
    vendorName: string;
    redemptionCount: number;
    daysSinceCreated: number;
  }>;
  categoryPerformance: Array<{
    category: string;
    dealCount: number;
    redemptionCount: number;
  }>;
}

interface HealthAnalytics {
  churnRiskUsers: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    daysSinceLastRedemption: number;
    passExpiresAt: string | null;
  }>;
  inactiveVendors: Array<{
    id: string;
    businessName: string;
    city: string;
    daysSinceUpdate: number;
    dealCount: number;
  }>;
  activeVendors: number;
  engagementScore: number;
  revenueConcentration: number;
  pendingVerifications: number;
  orphanedSubscriptions: number;
}

const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  muted: "hsl(var(--muted))",
  accent: "hsl(var(--accent))",
};

const PIE_COLORS = ["#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0"];

function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  trend,
  loading,
}: {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: typeof DollarSign;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          {value}
        </div>
        {change !== undefined && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            {trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
            {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
            <span className={trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : ""}>
              {change > 0 ? "+" : ""}{change}%
            </span>
            {changeLabel && <span className="text-muted-foreground">{changeLabel}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueSection({ data, isLoading }: { data?: RevenueAnalytics; isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <DollarSign className="h-5 w-5" />
        Revenue & Growth
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Monthly Revenue"
          value={`$${data?.mrr?.toFixed(2) || "0.00"}`}
          change={data?.mrrGrowth}
          changeLabel="vs last month"
          icon={DollarSign}
          trend={data?.mrrGrowth && data.mrrGrowth > 0 ? "up" : data?.mrrGrowth && data.mrrGrowth < 0 ? "down" : "neutral"}
          loading={isLoading}
        />
        <MetricCard
          title="Pass Members"
          value={data?.totalPassMembers?.toString() || "0"}
          icon={Users}
          loading={isLoading}
        />
        <MetricCard
          title="Churn Rate"
          value={`${data?.churnRate?.toFixed(1) || "0"}%`}
          icon={TrendingDown}
          trend={data?.churnRate && data.churnRate > 5 ? "down" : "up"}
          loading={isLoading}
        />
        <MetricCard
          title="LTV Estimate"
          value={`$${data?.ltv?.toFixed(2) || "0.00"}`}
          icon={Target}
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">MRR Trend (6 Months)</CardTitle>
          <CardDescription>Monthly recurring revenue over time</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data?.monthlyData || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "MRR"]}
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="mrr" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UserSection({ data, isLoading }: { data?: UserAnalytics; isLoading: boolean }) {
  const signupGrowth = data?.newUsersLastMonth && data.newUsersLastMonth > 0
    ? ((data.newUsersThisMonth - data.newUsersLastMonth) / data.newUsersLastMonth) * 100
    : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5" />
        User Growth & Engagement
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={data?.totalUsers?.toString() || "0"}
          icon={Users}
          loading={isLoading}
        />
        <MetricCard
          title="New This Month"
          value={data?.newUsersThisMonth?.toString() || "0"}
          change={Math.round(signupGrowth)}
          changeLabel="vs last month"
          icon={TrendingUp}
          trend={signupGrowth > 0 ? "up" : signupGrowth < 0 ? "down" : "neutral"}
          loading={isLoading}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${data?.conversionRate?.toFixed(1) || "0"}%`}
          icon={Percent}
          loading={isLoading}
        />
        <MetricCard
          title="Weekly Active"
          value={data?.weeklyActiveUsers?.toString() || "0"}
          icon={Activity}
          loading={isLoading}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Growth (6 Months)</CardTitle>
            <CardDescription>Total users and Pass members over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data?.monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalUsers" 
                    name="Total Users"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="passMembers" 
                    name="Pass Members"
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Geographic Breakdown</CardTitle>
            <CardDescription>Users by location (Top 5)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data?.geographicBreakdown || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="city" type="category" className="text-xs" width={100} />
                  <Tooltip 
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Retention Cohorts</CardTitle>
          <CardDescription>Percentage of users still active/subscribed after signup</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{data?.cohortRetention?.thirtyDay || 0}%</div>
                <div className="text-sm text-muted-foreground">30-Day Retention</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{data?.cohortRetention?.sixtyDay || 0}%</div>
                <div className="text-sm text-muted-foreground">60-Day Retention</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{data?.cohortRetention?.ninetyDay || 0}%</div>
                <div className="text-sm text-muted-foreground">90-Day Retention</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DealSection({ data, isLoading }: { data?: DealAnalytics; isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <ShoppingBag className="h-5 w-5" />
        Deal Performance
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Active Deals"
          value={data?.activeDeals?.toString() || "0"}
          icon={ShoppingBag}
          loading={isLoading}
        />
        <MetricCard
          title="Total Redemptions"
          value={data?.totalRedemptions?.toString() || "0"}
          icon={Target}
          loading={isLoading}
        />
        <MetricCard
          title="Member Redemption Rate"
          value={`${data?.redemptionRate?.toFixed(1) || "0"}%`}
          icon={Activity}
          loading={isLoading}
        />
        <MetricCard
          title="Premium Deals"
          value={data?.premiumDeals?.toString() || "0"}
          icon={BarChart3}
          loading={isLoading}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Performing Deals</CardTitle>
            <CardDescription>Most redeemed in last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : data?.topDeals?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No redemptions in the last 30 days</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data?.topDeals?.slice(0, 8).map((deal, index) => (
                  <div key={deal.id} className="flex items-center justify-between p-2 rounded-lg hover-elevate">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg font-bold text-muted-foreground w-6">#{index + 1}</span>
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm">{deal.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{deal.vendorName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {deal.isPremium && <Badge variant="secondary" className="text-xs">Pass</Badge>}
                      <Badge variant="outline">{deal.redemptionCount}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Underperforming Deals</CardTitle>
            <CardDescription>Low redemptions, consider review</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : data?.underperformingDeals?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">All deals performing well</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data?.underperformingDeals?.slice(0, 8).map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">{deal.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{deal.vendorName}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">{deal.daysSinceCreated}d old</span>
                      <Badge variant="outline" className="text-red-500">{deal.redemptionCount}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category Performance</CardTitle>
          <CardDescription>Deals and redemptions by category</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.categoryPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="category" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="dealCount" name="Deals" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="redemptionCount" name="Redemptions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HealthSection({ data, isLoading }: { data?: HealthAnalytics; isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        Business Health Indicators
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Engagement Score"
          value={`${data?.engagementScore?.toFixed(0) || "0"}/100`}
          icon={Activity}
          loading={isLoading}
        />
        <MetricCard
          title="Active Vendors"
          value={data?.activeVendors?.toString() || "0"}
          icon={MapPin}
          loading={isLoading}
        />
        <MetricCard
          title="Revenue Concentration"
          value={`${data?.revenueConcentration?.toFixed(0) || "0"}%`}
          icon={BarChart3}
          loading={isLoading}
        />
        <MetricCard
          title="Pending Verifications"
          value={data?.pendingVerifications?.toString() || "0"}
          icon={AlertTriangle}
          loading={isLoading}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Churn Risk Alerts
            </CardTitle>
            <CardDescription>Pass members with no recent activity</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : data?.churnRiskUsers?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No churn risks detected</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data?.churnRiskUsers?.slice(0, 10).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">
                        {user.firstName || user.lastName ? `${user.firstName} ${user.lastName}`.trim() : "User"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-amber-600">
                        {user.daysSinceLastRedemption === 999 ? "Never" : `${user.daysSinceLastRedemption}d`}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Inactive Vendors
            </CardTitle>
            <CardDescription>No updates in 60+ days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : data?.inactiveVendors?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">All vendors active</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data?.inactiveVendors?.slice(0, 10).map((vendor) => (
                  <div key={vendor.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">{vendor.businessName}</p>
                      <p className="text-xs text-muted-foreground">{vendor.city} • {vendor.dealCount} deals</p>
                    </div>
                    <Badge variant="outline" className="text-muted-foreground">
                      {vendor.daysSinceUpdate}d
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: revenueData, isLoading: revenueLoading } = useQuery<RevenueAnalytics>({
    queryKey: ["/api/admin/analytics/revenue"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: userData, isLoading: userLoading } = useQuery<UserAnalytics>({
    queryKey: ["/api/admin/analytics/users"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: dealData, isLoading: dealLoading } = useQuery<DealAnalytics>({
    queryKey: ["/api/admin/analytics/deals"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: healthData, isLoading: healthLoading } = useQuery<HealthAnalytics>({
    queryKey: ["/api/admin/analytics/health"],
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/revenue"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/users"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/deals"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/health"] }),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="space-y-8" data-testid="analytics-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Business Analytics</h2>
          <p className="text-muted-foreground">Key metrics and insights for Rise Local</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          data-testid="button-refresh-analytics"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <RevenueSection data={revenueData} isLoading={revenueLoading} />
      <UserSection data={userData} isLoading={userLoading} />
      <DealSection data={dealData} isLoading={dealLoading} />
      <HealthSection data={healthData} isLoading={healthLoading} />
    </div>
  );
}
