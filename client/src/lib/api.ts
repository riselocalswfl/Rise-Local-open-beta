import type { Product, Vendor, Event } from "@shared/schema";

export interface ProductWithVendor extends Omit<Product, 'priceCents' | 'stock'> {
  price: string | null;
  inventory: number;
  vendorName: string;
  isVerifiedVendor: boolean;
}

export interface EventWithOrganizer extends Event {
  organizerName: string;
}

interface TransformedProduct {
  id: string;
  vendorId: string;
  name: string;
  price: string | null;
  inventory: number;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
}

export async function getProductsWithVendors(): Promise<ProductWithVendor[]> {
  const [products, vendors] = await Promise.all([
    fetch("/api/products").then(res => res.json()),
    fetch("/api/vendors").then(res => res.json())
  ]);

  return products.map((product: TransformedProduct) => {
    const vendor = vendors.find((v: Vendor) => v.id === product.vendorId);
    return {
      ...product,
      vendorName: vendor?.businessName || "Unknown Vendor",
      isVerifiedVendor: vendor?.isVerified || false
    };
  });
}

export async function getEventsWithOrganizers(): Promise<EventWithOrganizer[]> {
  const [events, vendors] = await Promise.all([
    fetch("/api/events").then(res => res.json()),
    fetch("/api/vendors").then(res => res.json())
  ]);

  return events.map((event: Event) => {
    const organizer = vendors.find((v: Vendor) => v.id === event.organizerId);
    return {
      ...event,
      organizerName: organizer?.name || "Unknown Organizer"
    };
  });
}
