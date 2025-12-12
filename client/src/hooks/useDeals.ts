import { useQuery } from "@tanstack/react-query";
import type { Deal } from "@shared/schema";

export interface DealFilters {
  category?: string;
  city?: string;
  tier?: string;
  isActive?: boolean;
  vendorId?: string;
}

export function useDeals(filters?: DealFilters) {
  const queryParams = new URLSearchParams();
  
  if (filters?.category) queryParams.set("category", filters.category);
  if (filters?.city) queryParams.set("city", filters.city);
  if (filters?.tier) queryParams.set("tier", filters.tier);
  if (filters?.isActive !== undefined) queryParams.set("isActive", String(filters.isActive));
  if (filters?.vendorId) queryParams.set("vendorId", filters.vendorId);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/api/deals?${queryString}` : "/api/deals";

  return useQuery<Deal[]>({
    queryKey: ["/api/deals", filters],
  });
}

export function useDeal(id: string) {
  return useQuery<Deal>({
    queryKey: ["/api/deals", id],
    enabled: !!id,
  });
}
