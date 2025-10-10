export type ValueTag =
  | "organic"
  | "local"
  | "nonGMO"
  | "regenerative"
  | "fairTrade"
  | "womanOwned"
  | "veteranOwned"
  | "glutenFree"
  | "vegan"
  | "artisan"
  | "lowWaste"
  | "plasticFree";

export const VALUE_META: Record<ValueTag, { label: string; description: string; icon: string }> = {
  organic: { 
    label: "Organic", 
    description: "Certified or verifiably grown/produced without synthetic inputs.",
    icon: "Sprout"
  },
  local: { 
    label: "Local", 
    description: "Produced within ~100 miles of Fort Myers.",
    icon: "MapPin"
  },
  nonGMO: { 
    label: "Non-GMO", 
    description: "No genetically modified ingredients.",
    icon: "Wheat"
  },
  regenerative: { 
    label: "Regenerative", 
    description: "Practices that improve soil health and biodiversity.",
    icon: "Globe"
  },
  fairTrade: { 
    label: "Fair Trade", 
    description: "Ethical labor and fair pricing.",
    icon: "Handshake"
  },
  womanOwned: { 
    label: "Woman-Owned", 
    description: "Majority owned/operated by women.",
    icon: "Users"
  },
  veteranOwned: { 
    label: "Veteran-Owned", 
    description: "Majority owned/operated by veterans.",
    icon: "Shield"
  },
  glutenFree: { 
    label: "Gluten-Free", 
    description: "No gluten ingredients; dedicated process where applicable.",
    icon: "Ban"
  },
  vegan: { 
    label: "Vegan", 
    description: "No animal ingredients.",
    icon: "Leaf"
  },
  artisan: { 
    label: "Artisan", 
    description: "Small-batch, handcrafted goods.",
    icon: "Paintbrush"
  },
  lowWaste: { 
    label: "Low-Waste", 
    description: "Packaging/practices that reduce waste.",
    icon: "Recycle"
  },
  plasticFree: { 
    label: "Plastic-Free", 
    description: "No plastic packaging/components.",
    icon: "Ban"
  },
};

export const ALL_VALUE_TAGS: ValueTag[] = Object.keys(VALUE_META) as ValueTag[];
