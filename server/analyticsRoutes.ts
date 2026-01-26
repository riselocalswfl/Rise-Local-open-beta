import type { Express } from "express";
import { storage } from "./storage";
import { requireAuth } from "./replitAuth";

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

async function isAdmin(userId: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  return user?.isAdmin === true || user?.role === "admin";
}

export function setupAnalyticsRoutes(app: Express): void {
  app.get("/api/admin/analytics/revenue", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!(await isAdmin(userId))) {
        return res.status(403).json({ error: "Unauthorized - Admin access required" });
      }

      const allUsers = await storage.getUsers();
      const now = new Date();
      const monthlyPrice = 4.99;
      
      const passMembers = allUsers.filter(
        (u: any) =>
          u.isPassMember === true &&
          u.passExpiresAt &&
          new Date(u.passExpiresAt) > now
      );

      const currentMrr = passMembers.length * monthlyPrice;

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyData: RevenueAnalytics["monthlyData"] = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0);
        monthEnd.setHours(23, 59, 59, 999);

        const usersAtMonthEnd = allUsers.filter((u: any) => {
          const created = u.createdAt ? new Date(u.createdAt) : null;
          return created && created <= monthEnd;
        });

        const passAtMonthEnd = usersAtMonthEnd.filter((u: any) => {
          const passExpires = u.passExpiresAt ? new Date(u.passExpiresAt) : null;
          return u.isPassMember === true && passExpires && passExpires > monthEnd;
        });

        const newSubs = allUsers.filter((u: any) => {
          const created = u.createdAt ? new Date(u.createdAt) : null;
          return created && created >= monthStart && created <= monthEnd && u.isPassMember === true;
        }).length;

        const cancellations = usersAtMonthEnd.filter((u: any) => {
          const passExpires = u.passExpiresAt ? new Date(u.passExpiresAt) : null;
          return passExpires && passExpires >= monthStart && passExpires <= monthEnd && !u.isPassMember;
        }).length;

        monthlyData.push({
          month: monthStart.toLocaleString("default", { month: "short", year: "2-digit" }),
          mrr: passAtMonthEnd.length * monthlyPrice,
          newSubscriptions: newSubs,
          cancellations,
        });
      }

      const lastMonthMrr = monthlyData.length >= 2 ? monthlyData[monthlyData.length - 2].mrr : 0;
      const mrrGrowth = lastMonthMrr > 0 ? ((currentMrr - lastMonthMrr) / lastMonthMrr) * 100 : 0;

      const cancelledThisMonth = allUsers.filter((u: any) => {
        const passExpires = u.passExpiresAt ? new Date(u.passExpiresAt) : null;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return passExpires && passExpires >= thirtyDaysAgo && !u.isPassMember;
      }).length;

      const churnRate = passMembers.length > 0 ? (cancelledThisMonth / (passMembers.length + cancelledThisMonth)) * 100 : 0;

      const arpu = passMembers.length > 0 ? currentMrr / passMembers.length : 0;

      const avgSubscriptionLengthMonths = 8;
      const ltv = arpu * avgSubscriptionLengthMonths;

      const analytics: RevenueAnalytics = {
        mrr: Math.round(currentMrr * 100) / 100,
        mrrGrowth: Math.round(mrrGrowth * 10) / 10,
        churnRate: Math.round(churnRate * 10) / 10,
        arpu: Math.round(arpu * 100) / 100,
        ltv: Math.round(ltv * 100) / 100,
        totalPassMembers: passMembers.length,
        monthlyData,
      };

      res.json(analytics);
    } catch (error) {
      console.error("[Analytics Revenue Error]:", error);
      res.status(500).json({ error: "Failed to fetch revenue analytics" });
    }
  });

  app.get("/api/admin/analytics/users", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!(await isAdmin(userId))) {
        return res.status(403).json({ error: "Unauthorized - Admin access required" });
      }

      const allUsers = await storage.getUsers();
      const allVendors = await storage.getVendors();
      const allRedemptions = await storage.getAllDealRedemptions();
      const now = new Date();
      
      const passMembers = allUsers.filter(
        (u: any) =>
          u.isPassMember === true &&
          u.passExpiresAt &&
          new Date(u.passExpiresAt) > now
      );

      const freeUsers = allUsers.filter(
        (u: any) => !u.isPassMember || !u.passExpiresAt || new Date(u.passExpiresAt) <= now
      );

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const newUsersThisMonth = allUsers.filter((u: any) => {
        const created = u.createdAt ? new Date(u.createdAt) : null;
        return created && created >= thirtyDaysAgo;
      }).length;

      const newUsersLastMonth = allUsers.filter((u: any) => {
        const created = u.createdAt ? new Date(u.createdAt) : null;
        return created && created >= sixtyDaysAgo && created < thirtyDaysAgo;
      }).length;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const dailyActiveUsers = new Set(
        allRedemptions
          .filter((r: any) => {
            const redeemed = r.redeemedAt ? new Date(r.redeemedAt) : null;
            return redeemed && redeemed >= yesterday;
          })
          .map((r: any) => r.userId)
      ).size;

      const weeklyActiveUsers = new Set(
        allRedemptions
          .filter((r: any) => {
            const redeemed = r.redeemedAt ? new Date(r.redeemedAt) : null;
            return redeemed && redeemed >= sevenDaysAgo;
          })
          .map((r: any) => r.userId)
      ).size;

      const cityCount: Record<string, number> = {};
      
      const vendorOwnerIds = new Set(allVendors.map((v: any) => v.ownerId));
      const buyerUsers = allUsers.filter((u: any) => !vendorOwnerIds.has(u.id));
      
      for (const user of buyerUsers) {
        const zip = (user as any).zipCode;
        if (zip) {
          const city = zipToCity(zip) || "Unknown";
          cityCount[city] = (cityCount[city] || 0) + 1;
        }
      }

      for (const vendor of allVendors) {
        const city = (vendor as any).city || "Unknown";
        cityCount[city] = (cityCount[city] || 0) + 1;
      }

      const geographicBreakdown = Object.entries(cityCount)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const cohortsThirty = allUsers.filter((u: any) => {
        const created = u.createdAt ? new Date(u.createdAt) : null;
        return created && created <= thirtyDaysAgo;
      });

      const cohortsSixty = allUsers.filter((u: any) => {
        const created = u.createdAt ? new Date(u.createdAt) : null;
        return created && created <= sixtyDaysAgo;
      });

      const cohortsNinety = allUsers.filter((u: any) => {
        const created = u.createdAt ? new Date(u.createdAt) : null;
        return created && created <= ninetyDaysAgo;
      });

      const activeUserIds = new Set(allRedemptions.map((r: any) => r.userId));

      const thirtyDayRetention = cohortsThirty.length > 0
        ? (cohortsThirty.filter((u: any) => activeUserIds.has(u.id) || (u.isPassMember === true)).length / cohortsThirty.length) * 100
        : 0;

      const sixtyDayRetention = cohortsSixty.length > 0
        ? (cohortsSixty.filter((u: any) => activeUserIds.has(u.id) || (u.isPassMember === true)).length / cohortsSixty.length) * 100
        : 0;

      const ninetyDayRetention = cohortsNinety.length > 0
        ? (cohortsNinety.filter((u: any) => activeUserIds.has(u.id) || (u.isPassMember === true)).length / cohortsNinety.length) * 100
        : 0;

      const monthlyData: UserAnalytics["monthlyData"] = [];

      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0);
        monthEnd.setHours(23, 59, 59, 999);

        const usersAtMonthEnd = allUsers.filter((u: any) => {
          const created = u.createdAt ? new Date(u.createdAt) : null;
          return created && created <= monthEnd;
        });

        const passAtMonthEnd = usersAtMonthEnd.filter((u: any) => {
          const passExpires = u.passExpiresAt ? new Date(u.passExpiresAt) : null;
          return u.isPassMember === true && passExpires && passExpires > monthEnd;
        });

        const newSignups = allUsers.filter((u: any) => {
          const created = u.createdAt ? new Date(u.createdAt) : null;
          return created && created >= monthStart && created <= monthEnd;
        }).length;

        monthlyData.push({
          month: monthStart.toLocaleString("default", { month: "short", year: "2-digit" }),
          totalUsers: usersAtMonthEnd.length,
          passMembers: passAtMonthEnd.length,
          freeUsers: usersAtMonthEnd.length - passAtMonthEnd.length,
          newSignups,
        });
      }

      const conversionRate = allUsers.length > 0 ? (passMembers.length / allUsers.length) * 100 : 0;

      const analytics: UserAnalytics = {
        totalUsers: allUsers.length,
        passMembers: passMembers.length,
        freeUsers: freeUsers.length,
        newUsersThisMonth,
        newUsersLastMonth,
        conversionRate: Math.round(conversionRate * 10) / 10,
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyData,
        geographicBreakdown,
        cohortRetention: {
          thirtyDay: Math.round(thirtyDayRetention * 10) / 10,
          sixtyDay: Math.round(sixtyDayRetention * 10) / 10,
          ninetyDay: Math.round(ninetyDayRetention * 10) / 10,
        },
      };

      res.json(analytics);
    } catch (error) {
      console.error("[Analytics Users Error]:", error);
      res.status(500).json({ error: "Failed to fetch user analytics" });
    }
  });

  app.get("/api/admin/analytics/deals", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!(await isAdmin(userId))) {
        return res.status(403).json({ error: "Unauthorized - Admin access required" });
      }

      const [allDeals, allRedemptions, allVendors, allUsers] = await Promise.all([
        storage.getAllDeals(),
        storage.getAllDealRedemptions(),
        storage.getVendors(),
        storage.getUsers(),
      ]);

      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeDeals = allDeals.filter((d: any) => d.status === "published" && d.isActive);
      const premiumDeals = activeDeals.filter((d: any) => 
        d.isPassLocked || d.tier === "premium" || d.tier === "member"
      );
      const freeDeals = activeDeals.filter((d: any) => 
        !d.isPassLocked && d.tier !== "premium" && d.tier !== "member"
      );

      const vendorMap = new Map(allVendors.map((v: any) => [v.id, v]));

      const dealRedemptionCounts: Record<string, number> = {};
      const recentRedemptions = allRedemptions.filter((r: any) => {
        const redeemed = r.redeemedAt ? new Date(r.redeemedAt) : null;
        return redeemed && redeemed >= thirtyDaysAgo;
      });

      for (const redemption of recentRedemptions) {
        dealRedemptionCounts[redemption.dealId] = (dealRedemptionCounts[redemption.dealId] || 0) + 1;
      }

      const topDeals = activeDeals
        .map((deal: any) => {
          const vendor = vendorMap.get(deal.vendorId);
          return {
            id: deal.id,
            title: deal.title,
            vendorName: vendor?.businessName || "Unknown",
            redemptionCount: dealRedemptionCounts[deal.id] || 0,
            isPremium: deal.isPassLocked || deal.tier === "premium" || deal.tier === "member",
          };
        })
        .sort((a: any, b: any) => b.redemptionCount - a.redemptionCount)
        .slice(0, 10);

      const allRedemptionCounts: Record<string, number> = {};
      for (const redemption of allRedemptions) {
        allRedemptionCounts[redemption.dealId] = (allRedemptionCounts[redemption.dealId] || 0) + 1;
      }

      const underperformingDeals = activeDeals
        .map((deal: any) => {
          const vendor = vendorMap.get(deal.vendorId);
          const created = deal.createdAt ? new Date(deal.createdAt) : new Date();
          const daysSinceCreated = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: deal.id,
            title: deal.title,
            vendorName: vendor?.businessName || "Unknown",
            redemptionCount: allRedemptionCounts[deal.id] || 0,
            daysSinceCreated,
          };
        })
        .filter((d: any) => d.daysSinceCreated >= 14 && d.redemptionCount < 3)
        .sort((a: any, b: any) => a.redemptionCount - b.redemptionCount)
        .slice(0, 10);

      const categoryPerformance: Record<string, { dealCount: number; redemptionCount: number }> = {};
      
      for (const deal of activeDeals) {
        const category = (deal as any).category || "Uncategorized";
        if (!categoryPerformance[category]) {
          categoryPerformance[category] = { dealCount: 0, redemptionCount: 0 };
        }
        categoryPerformance[category].dealCount++;
        categoryPerformance[category].redemptionCount += allRedemptionCounts[deal.id] || 0;
      }

      const passMembers = allUsers.filter(
        (u: any) =>
          u.isPassMember === true &&
          u.passExpiresAt &&
          new Date(u.passExpiresAt) > now
      );

      const passMemberIds = new Set(passMembers.map((u: any) => u.id));
      const activeMemberRedemptions = new Set(
        allRedemptions
          .filter((r: any) => passMemberIds.has(r.userId))
          .map((r: any) => r.userId)
      ).size;

      const redemptionRate = passMembers.length > 0 ? (activeMemberRedemptions / passMembers.length) * 100 : 0;

      const analytics: DealAnalytics = {
        totalDeals: allDeals.length,
        activeDeals: activeDeals.length,
        premiumDeals: premiumDeals.length,
        freeDeals: freeDeals.length,
        totalRedemptions: allRedemptions.length,
        redemptionRate: Math.round(redemptionRate * 10) / 10,
        topDeals,
        underperformingDeals,
        categoryPerformance: Object.entries(categoryPerformance)
          .map(([category, stats]) => ({ category, ...stats }))
          .sort((a, b) => b.redemptionCount - a.redemptionCount),
      };

      res.json(analytics);
    } catch (error) {
      console.error("[Analytics Deals Error]:", error);
      res.status(500).json({ error: "Failed to fetch deal analytics" });
    }
  });

  app.get("/api/admin/analytics/health", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!(await isAdmin(userId))) {
        return res.status(403).json({ error: "Unauthorized - Admin access required" });
      }

      const [allUsers, allVendors, allDeals, allRedemptions] = await Promise.all([
        storage.getUsers(),
        storage.getVendors(),
        storage.getAllDeals(),
        storage.getAllDealRedemptions(),
      ]);

      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const passMembers = allUsers.filter(
        (u: any) =>
          u.isPassMember === true &&
          u.passExpiresAt &&
          new Date(u.passExpiresAt) > now
      );

      const userRedemptionMap: Record<string, Date> = {};
      for (const redemption of allRedemptions) {
        const redeemed = redemption.redeemedAt ? new Date(redemption.redeemedAt) : null;
        if (redeemed) {
          if (!userRedemptionMap[redemption.userId] || redeemed > userRedemptionMap[redemption.userId]) {
            userRedemptionMap[redemption.userId] = redeemed;
          }
        }
      }

      const churnRiskUsers = passMembers
        .filter((user: any) => {
          const lastRedemption = userRedemptionMap[user.id];
          if (!lastRedemption) return true;
          return lastRedemption < thirtyDaysAgo;
        })
        .map((user: any) => {
          const lastRedemption = userRedemptionMap[user.id];
          const daysSinceLastRedemption = lastRedemption
            ? Math.floor((now.getTime() - lastRedemption.getTime()) / (1000 * 60 * 60 * 24))
            : 999;
          return {
            id: user.id,
            email: user.email || "",
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            daysSinceLastRedemption,
            passExpiresAt: user.passExpiresAt ? new Date(user.passExpiresAt).toISOString() : null,
          };
        })
        .sort((a: any, b: any) => b.daysSinceLastRedemption - a.daysSinceLastRedemption)
        .slice(0, 15);

      const vendorDealCounts: Record<string, number> = {};
      for (const deal of allDeals) {
        if ((deal as any).status === "published" && (deal as any).isActive) {
          vendorDealCounts[(deal as any).vendorId] = (vendorDealCounts[(deal as any).vendorId] || 0) + 1;
        }
      }

      const inactiveVendors = allVendors
        .filter((vendor: any) => {
          const updated = vendor.updatedAt ? new Date(vendor.updatedAt) : null;
          return updated && updated < sixtyDaysAgo;
        })
        .map((vendor: any) => {
          const updated = new Date(vendor.updatedAt);
          const daysSinceUpdate = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: vendor.id,
            businessName: vendor.businessName,
            city: vendor.city || "",
            daysSinceUpdate,
            dealCount: vendorDealCounts[vendor.id] || 0,
          };
        })
        .sort((a: any, b: any) => b.daysSinceUpdate - a.daysSinceUpdate)
        .slice(0, 10);

      const activeVendors = allVendors.filter((vendor: any) => {
        const updated = vendor.updatedAt ? new Date(vendor.updatedAt) : null;
        return updated && updated >= sixtyDaysAgo;
      }).length;

      const passMemberRedemptions = allRedemptions.filter((r: any) => {
        const redeemed = r.redeemedAt ? new Date(r.redeemedAt) : null;
        return redeemed && redeemed >= thirtyDaysAgo;
      });

      const avgRedemptionsPerMember = passMembers.length > 0
        ? passMemberRedemptions.length / passMembers.length
        : 0;

      const engagementScore = Math.min(100, avgRedemptionsPerMember * 25);

      const userRedemptionCounts: Record<string, number> = {};
      for (const redemption of allRedemptions) {
        userRedemptionCounts[redemption.userId] = (userRedemptionCounts[redemption.userId] || 0) + 1;
      }

      const sortedCounts = Object.values(userRedemptionCounts).sort((a, b) => b - a);
      const topTenPercent = Math.max(1, Math.ceil(sortedCounts.length * 0.1));
      const topUsersRedemptions = sortedCounts.slice(0, topTenPercent).reduce((a, b) => a + b, 0);
      const totalRedemptions = sortedCounts.reduce((a, b) => a + b, 0);

      const revenueConcentration = totalRedemptions > 0 ? (topUsersRedemptions / totalRedemptions) * 100 : 0;

      const pendingVerifications = allVendors.filter((v: any) => !v.isVerified).length;

      const analytics: HealthAnalytics = {
        churnRiskUsers,
        inactiveVendors,
        activeVendors,
        engagementScore: Math.round(engagementScore * 10) / 10,
        revenueConcentration: Math.round(revenueConcentration * 10) / 10,
        pendingVerifications,
        orphanedSubscriptions: 0,
      };

      res.json(analytics);
    } catch (error) {
      console.error("[Analytics Health Error]:", error);
      res.status(500).json({ error: "Failed to fetch health analytics" });
    }
  });
}

function zipToCity(zip: string): string | null {
  const zipCityMap: Record<string, string> = {
    "33901": "Fort Myers", "33902": "Fort Myers", "33903": "Fort Myers", "33904": "Cape Coral",
    "33905": "Fort Myers", "33906": "Fort Myers", "33907": "Fort Myers", "33908": "Fort Myers",
    "33909": "Cape Coral", "33910": "Cape Coral", "33911": "Fort Myers", "33912": "Fort Myers",
    "33913": "Fort Myers", "33914": "Cape Coral", "33915": "Cape Coral", "33916": "Fort Myers",
    "33917": "Fort Myers", "33918": "Fort Myers", "33919": "Fort Myers", "33920": "Alva",
    "33921": "Boca Grande", "33922": "Bokeelia", "33924": "Captiva", "33928": "Estero",
    "33929": "Estero", "33931": "Fort Myers Beach", "33932": "Fort Myers Beach", "33935": "Labelle",
    "33936": "Lehigh Acres", "33957": "Sanibel", "33965": "Fort Myers", "33966": "Fort Myers",
    "33967": "Fort Myers", "33971": "Lehigh Acres", "33972": "Lehigh Acres", "33973": "Lehigh Acres",
    "33974": "Lehigh Acres", "33976": "Lehigh Acres", "34102": "Naples", "34103": "Naples",
    "34104": "Naples", "34105": "Naples", "34108": "Naples", "34109": "Naples", "34110": "Naples",
    "34112": "Naples", "34113": "Naples", "34114": "Naples", "34116": "Naples", "34117": "Naples",
    "34119": "Naples", "34120": "Naples", "34134": "Bonita Springs", "34135": "Bonita Springs",
  };
  return zipCityMap[zip] || null;
}
