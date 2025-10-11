import { ALL_VALUE_TAGS, type ValueTag } from "@/../../shared/values";
import type { Vendor, Product } from "@/../../shared/schema";

export type ValueIndex = {
  [K in ValueTag]: {
    vendors: Set<string>;
    products: Set<string>;
  };
};

export function buildValueIndex(vendors: Vendor[], products: Product[]): ValueIndex {
  const index = {} as ValueIndex;
  
  ALL_VALUE_TAGS.forEach(tag => {
    index[tag] = {
      vendors: new Set<string>(),
      products: new Set<string>()
    };
  });
  
  vendors.forEach(vendor => {
    vendor.values.forEach(value => {
      const tag = value as ValueTag;
      if (index[tag]) {
        index[tag].vendors.add(vendor.id);
      }
    });
  });
  
  products.forEach(product => {
    product.values.forEach(value => {
      const tag = value as ValueTag;
      if (index[tag]) {
        index[tag].products.add(product.id);
      }
    });
  });
  
  return index;
}

export function getValueCounts(index: ValueIndex): Record<ValueTag, { vendors: number; products: number }> {
  const counts = {} as Record<ValueTag, { vendors: number; products: number }>;
  
  (Object.keys(index) as ValueTag[]).forEach(tag => {
    counts[tag] = {
      vendors: index[tag].vendors.size,
      products: index[tag].products.size
    };
  });
  
  return counts;
}
