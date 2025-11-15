// Hierarchical category system for Rise Local

export interface CategoryGroup {
  parent: string;
  children: string[];
}

// Alias for components that use CategoryNode naming
export type CategoryNode = CategoryGroup;

// SHOP LOCAL - Categories
export const SHOP_CATEGORIES: CategoryGroup[] = [
  {
    parent: "Food & Farm",
    children: [
      "Fresh Produce",
      "Meat & Seafood",
      "Dairy & Eggs",
      "Baked Goods",
      "Specialty Foods",
      "Plants & Flowers",
    ],
  },
  {
    parent: "Handmade Goods",
    children: [
      "Home Décor",
      "Jewelry",
      "Candles & Soaps",
      "Art & Prints",
      "Clothing & Accessories",
      "Gifts & Seasonal",
    ],
  },
  {
    parent: "Wellness & Lifestyle",
    children: [
      "Self-Care Products",
      "Vitamins & Supplements",
      "Herbal/Organic Goods",
      "Fitness Gear",
      "Pet Products",
    ],
  },
  {
    parent: "Local Favorites",
    children: [
      "SWFL-Themed Goods",
      "Local Merch",
      "Limited Edition / Small Batch",
    ],
  },
];

// DINE LOCAL - Categories
export const DINE_CATEGORIES: CategoryGroup[] = [
  {
    parent: "Cuisine Types",
    children: [
      "American",
      "Italian",
      "Mexican",
      "Latin/Caribbean",
      "Asian",
      "Seafood",
      "BBQ",
      "Vegan/Vegetarian",
      "Coffee Shops",
      "Dessert & Bakeries",
    ],
  },
  {
    parent: "Dining Experience",
    children: [
      "Casual Dining",
      "Fine Dining",
      "Family-Friendly",
      "Food Trucks",
      "Waterfront",
      "Breakfast/Brunch",
    ],
  },
  {
    parent: "Values & Sourcing",
    children: [
      "Farm-to-Table",
      "Locally Sourced",
      "Organic Options",
      "Allergy-Friendly",
      "Sustainable Practices",
    ],
  },
];

// SERVICES - Categories
export const SERVICES_CATEGORIES: CategoryGroup[] = [
  {
    parent: "Home & Property",
    children: [
      "Cleaning Services",
      "Landscaping",
      "Handyman",
      "Pool Care",
      "Pressure Washing",
      "Home Organization",
    ],
  },
  {
    parent: "Health & Wellness",
    children: [
      "Personal Training",
      "Yoga & Fitness Classes",
      "Massage / Bodywork",
      "Nutrition Coaching",
      "Mental Wellness / Life Coaching",
    ],
  },
  {
    parent: "Beauty & Personal Care",
    children: [
      "Hair Services",
      "Nails",
      "Skincare",
      "Aesthetics",
      "Personal Styling",
    ],
  },
  {
    parent: "Professional & Creative",
    children: [
      "Photography",
      "Videography",
      "Marketing & Branding",
      "Web/App Services",
      "Bookkeeping",
      "Small Business Consulting",
    ],
  },
  {
    parent: "Events & Experiences",
    children: [
      "Event Planning",
      "Party Rentals",
      "DJs, Artists, Musicians",
      "Outdoor/Adventure Guides",
    ],
  },
];

// EVENTS - Categories
export const EVENTS_CATEGORIES: CategoryGroup[] = [
  {
    parent: "Markets & Pop-Ups",
    children: [
      "Farmers Markets",
      "Vendor Markets",
      "Pop-Up Shops",
    ],
  },
  {
    parent: "Food & Drink",
    children: [
      "Restaurant Specials",
      "Wine & Beer Events",
      "Tastings",
      "Cooking Classes",
    ],
  },
  {
    parent: "Health & Wellness",
    children: [
      "Yoga Classes",
      "Fitness Classes",
      "Wellness Workshops",
      "Guided Outdoor Activities",
    ],
  },
  {
    parent: "Arts & Entertainment",
    children: [
      "Live Music",
      "Art Exhibits",
      "Theater & Performances",
      "Festivals",
    ],
  },
  {
    parent: "Community & Family",
    children: [
      "Kids Activities",
      "Volunteer Events",
      "Community Gatherings",
      "Educational Workshops",
    ],
  },
];

// Helper function to get all child categories from selected parents
export function getChildrenFromParents(
  categories: CategoryGroup[],
  selectedParents: string[]
): string[] {
  const children: string[] = [];
  categories.forEach((group) => {
    if (selectedParents.includes(group.parent)) {
      children.push(...group.children);
    }
  });
  return children;
}

// Helper function to get all categories (parent + children) as flat array
export function getAllCategories(categories: CategoryGroup[]): string[] {
  const all: string[] = [];
  categories.forEach((group) => {
    all.push(group.parent);
    all.push(...group.children);
  });
  return all;
}

// Helper function to check if a category list matches a filter
export function categoriesMatch(
  itemCategories: string[],
  filterCategories: string[],
  categoryGroups: CategoryGroup[]
): boolean {
  if (filterCategories.length === 0) return true;
  
  // Check if any filter category matches
  for (const filter of filterCategories) {
    // Check if filter is a parent category
    const group = categoryGroups.find((g) => g.parent === filter);
    if (group) {
      // If it's a parent, check if item has any of its children
      if (group.children.some((child) => itemCategories.includes(child))) {
        return true;
      }
    } else {
      // If it's a child category, check directly
      if (itemCategories.includes(filter)) {
        return true;
      }
    }
  }
  
  return false;
}
