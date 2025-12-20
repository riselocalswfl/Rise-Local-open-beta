import { useQuery } from "@tanstack/react-query";
import type { Deal } from "@shared/schema";

export interface DealFilters {
  category?: string;
  city?: string;
  tier?: string;
  isActive?: boolean;
  vendorId?: string;
  status?: string;
  includeAll?: boolean;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
}

export const DEALS_QUERY_KEY = "/api/deals";

function buildDealsEndpoint(filters?: DealFilters): string {
  const params = new URLSearchParams();
  
  if (filters?.category) params.set("category", filters.category);
  if (filters?.city) params.set("city", filters.city);
  if (filters?.tier) params.set("tier", filters.tier);
  if (filters?.isActive !== undefined) params.set("isActive", String(filters.isActive));
  if (filters?.vendorId) params.set("vendorId", filters.vendorId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.includeAll) params.set("includeAll", "true");
  if (filters?.lat !== undefined) params.set("lat", String(filters.lat));
  if (filters?.lng !== undefined) params.set("lng", String(filters.lng));
  if (filters?.radiusMiles !== undefined) params.set("radiusMiles", String(filters.radiusMiles));
  
  const queryString = params.toString();
  return queryString ? `/api/deals?${queryString}` : "/api/deals";
}

export function buildDealsQueryKey(filters?: DealFilters): (string | DealFilters | undefined)[] {
  return [DEALS_QUERY_KEY, filters];
}

export function useDeals(filters?: DealFilters, options?: { enabled?: boolean }) {
  const endpoint = buildDealsEndpoint(filters);
  
  return useQuery<Deal[]>({
    queryKey: buildDealsQueryKey(filters),
    queryFn: async () => {
      const res = await fetch(endpoint, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deals");
      return res.json();
    },
    enabled: options?.enabled !== false,
  });
}

export function useDeal(id: string) {
  return useQuery<Deal>({
    queryKey: [DEALS_QUERY_KEY, id],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deal");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useVendorDeals(vendorId: string | undefined, enabled: boolean = true) {
  const shouldFetch = !!vendorId && enabled;
  return useDeals(
    shouldFetch ? { vendorId, includeAll: true } : undefined,
    { enabled: shouldFetch }
  );
}

export function usePublishedDeals(filters?: Omit<DealFilters, 'status' | 'includeAll'>) {
  return useDeals({
    ...filters,
    status: 'published',
  });
}
