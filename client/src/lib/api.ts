import type { Vendor } from "@shared/schema";

export async function getVendors(): Promise<Vendor[]> {
  return fetch("/api/vendors").then(res => res.json());
}
