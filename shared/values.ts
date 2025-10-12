export type ValueTag =
  // Environmental & Sustainability
  | "sustainability"
  | "organic"
  | "nonGMO"
  | "regenerative"
  | "lowWaste"
  | "plasticFree"
  | "carbonNeutral"
  | "ecoFriendly"
  // Social & Identity
  | "fairTrade"
  | "womanOwned"
  | "veteranOwned"
  | "minorityOwned"
  | "lgbtqOwned"
  | "familyOwned"
  // Health & Diet
  | "glutenFree"
  | "vegan"
  | "dairyFree"
  | "vegetarian"
  | "lowSugar"
  | "nutFree"
  // Craft & Quality
  | "artisan"
  | "handmade"
  | "smallBatch"
  | "localIngredients";

export const VALUE_META: Record<ValueTag, { label: string; description: string; icon: string }> = {
  // Environmental & Sustainability
  sustainability: { 
    label: "Sustainability", 
    description: "Committed to environmental responsibility and sustainable practices.",
    icon: "Sprout"
  },
  organic: { 
    label: "Organic", 
    description: "Certified or verifiably grown/produced without synthetic inputs.",
    icon: "Leaf"
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
  carbonNeutral: { 
    label: "Carbon Neutral", 
    description: "Net-zero carbon emissions through offsetting or reduction.",
    icon: "CloudRain"
  },
  ecoFriendly: { 
    label: "Eco-Friendly", 
    description: "Environmentally conscious materials and processes.",
    icon: "Trees"
  },
  // Social & Identity
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
  minorityOwned: { 
    label: "Minority-Owned", 
    description: "Majority owned/operated by people from minority backgrounds.",
    icon: "Users"
  },
  lgbtqOwned: { 
    label: "LGBTQ+ Owned", 
    description: "Majority owned/operated by LGBTQ+ individuals.",
    icon: "Heart"
  },
  familyOwned: { 
    label: "Family-Owned", 
    description: "Independently owned and operated by a family.",
    icon: "Home"
  },
  // Health & Diet
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
  dairyFree: { 
    label: "Dairy-Free", 
    description: "No dairy or lactose-containing ingredients.",
    icon: "Droplet"
  },
  vegetarian: { 
    label: "Vegetarian", 
    description: "No meat or fish ingredients.",
    icon: "Apple"
  },
  lowSugar: { 
    label: "Low-Sugar", 
    description: "Reduced or minimal sugar content.",
    icon: "Candy"
  },
  nutFree: { 
    label: "Nut-Free", 
    description: "No tree nuts or peanuts; safe processing environment.",
    icon: "Ban"
  },
  // Craft & Quality
  artisan: { 
    label: "Artisan", 
    description: "Small-batch, handcrafted goods.",
    icon: "Paintbrush"
  },
  handmade: { 
    label: "Handmade", 
    description: "Crafted by hand with care and attention to detail.",
    icon: "Hand"
  },
  smallBatch: { 
    label: "Small-Batch", 
    description: "Produced in limited quantities for quality control.",
    icon: "Package"
  },
  localIngredients: { 
    label: "Local Ingredients", 
    description: "Primarily sources ingredients from local suppliers.",
    icon: "MapPin"
  },
};

export const ALL_VALUE_TAGS: ValueTag[] = Object.keys(VALUE_META) as ValueTag[];

// Categories for organizing values in forms
export const VALUE_CATEGORIES = {
  environmental: ["sustainability", "organic", "nonGMO", "regenerative", "lowWaste", "plasticFree", "carbonNeutral", "ecoFriendly"] as ValueTag[],
  social: ["fairTrade", "womanOwned", "veteranOwned", "minorityOwned", "lgbtqOwned", "familyOwned"] as ValueTag[],
  dietary: ["glutenFree", "vegan", "dairyFree", "vegetarian", "lowSugar", "nutFree"] as ValueTag[],
  quality: ["artisan", "handmade", "smallBatch", "localIngredients"] as ValueTag[],
};
