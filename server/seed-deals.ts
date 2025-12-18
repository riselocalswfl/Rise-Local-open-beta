import { db } from "./storage";
import { 
  vendors, 
  deals,
  users 
} from "@shared/schema";

async function seedDeals() {
  console.log("🌱 Starting deals seed...");

  try {
    const timestamp = Date.now();

    // Create 3 vendor users
    console.log("\n📝 Creating vendor users...");
    
    const [user1] = await db.insert(users).values({
      username: `palmcafe_${timestamp}`,
      password: "demo123",
      role: "vendor",
      email: `palmcafe_${timestamp}@example.com`,
      firstName: "Miguel",
      lastName: "Santos",
      onboardingComplete: true,
    }).returning();
    console.log("✓ Created user:", user1.username);

    const [user2] = await db.insert(users).values({
      username: `gulfcoast_${timestamp}`,
      password: "demo123",
      role: "vendor",
      email: `gulfcoast_${timestamp}@example.com`,
      firstName: "Lisa",
      lastName: "Thompson",
      onboardingComplete: true,
    }).returning();
    console.log("✓ Created user:", user2.username);

    const [user3] = await db.insert(users).values({
      username: `swflspa_${timestamp}`,
      password: "demo123",
      role: "vendor",
      email: `swflspa_${timestamp}@example.com`,
      firstName: "Rachel",
      lastName: "Kim",
      onboardingComplete: true,
    }).returning();
    console.log("✓ Created user:", user3.username);

    // Create 3 vendors
    console.log("\n🏪 Creating vendors...");

    const [vendor1] = await db.insert(vendors).values({
      ownerId: user1.id,
      vendorType: "dine",
      businessName: "Palm Cafe & Bistro",
      contactName: "Miguel Santos",
      tagline: "Farm-to-table dining in downtown Fort Myers",
      bio: "Palm Cafe brings fresh, locally-sourced cuisine to downtown Fort Myers. We partner with local farms and fishermen to deliver seasonal dishes that celebrate Florida's finest ingredients.",
      categories: ["Dining", "Breakfast", "Lunch"],
      locationType: "Physical storefront",
      address: "2145 First Street",
      city: "Fort Myers",
      state: "FL",
      zipCode: "33901",
      latitude: "26.6406",
      longitude: "-81.8723",
      serviceOptions: ["Dine-in", "Takeout"],
      paymentMethod: "Direct to Vendor",
      paymentMethods: ["Cash", "Credit Card", "Apple Pay"],
      businessValues: ["Farm-to-Table", "Locally Sourced", "Sustainable"],
      isVerified: true,
      followerCount: 245,
      logoUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400",
      heroImageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200",
      capabilities: { menu: true, services: false, products: false },
      hours: {
        monday: { open: "7:00 AM", close: "3:00 PM" },
        tuesday: { open: "7:00 AM", close: "3:00 PM" },
        wednesday: { open: "7:00 AM", close: "3:00 PM" },
        thursday: { open: "7:00 AM", close: "9:00 PM" },
        friday: { open: "7:00 AM", close: "9:00 PM" },
        saturday: { open: "8:00 AM", close: "9:00 PM" },
        sunday: { open: "8:00 AM", close: "3:00 PM" }
      },
      contactEmail: "hello@palmcafe.example.com",
      contactPhone: "(239) 555-0201",
    } as any).returning();
    console.log("✓ Created vendor:", vendor1.businessName);

    const [vendor2] = await db.insert(vendors).values({
      ownerId: user2.id,
      vendorType: "shop",
      businessName: "Gulf Coast Goods",
      contactName: "Lisa Thompson",
      tagline: "Handcrafted gifts & local artisan products",
      bio: "Gulf Coast Goods showcases the best of Southwest Florida's artisans. From handmade soaps to locally crafted jewelry, we curate unique gifts that celebrate our coastal community.",
      categories: ["Gifts", "Artisan", "Home Goods"],
      locationType: "Physical storefront",
      address: "1875 Colonial Blvd",
      city: "Fort Myers",
      state: "FL",
      zipCode: "33907",
      latitude: "26.5786",
      longitude: "-81.8901",
      serviceOptions: ["Pickup", "Delivery"],
      paymentMethod: "Direct to Vendor",
      paymentMethods: ["Cash", "Credit Card", "Venmo"],
      businessValues: ["Handcrafted", "Local Artisans", "Sustainable"],
      isVerified: true,
      followerCount: 178,
      logoUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400",
      heroImageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200",
      capabilities: { menu: false, services: false, products: true },
      hours: {
        monday: { open: "10:00 AM", close: "6:00 PM" },
        tuesday: { open: "10:00 AM", close: "6:00 PM" },
        wednesday: { open: "10:00 AM", close: "6:00 PM" },
        thursday: { open: "10:00 AM", close: "8:00 PM" },
        friday: { open: "10:00 AM", close: "8:00 PM" },
        saturday: { open: "9:00 AM", close: "8:00 PM" },
        sunday: { open: "11:00 AM", close: "5:00 PM" }
      },
      contactEmail: "shop@gulfcoastgoods.example.com",
      contactPhone: "(239) 555-0302",
    } as any).returning();
    console.log("✓ Created vendor:", vendor2.businessName);

    const [vendor3] = await db.insert(vendors).values({
      ownerId: user3.id,
      vendorType: "service",
      businessName: "SWFL Wellness Spa",
      contactName: "Rachel Kim",
      tagline: "Your escape to relaxation in Fort Myers",
      bio: "SWFL Wellness Spa offers a sanctuary of relaxation in the heart of Fort Myers. Our certified therapists specialize in massage therapy, facials, and holistic wellness treatments.",
      categories: ["Wellness", "Spa", "Beauty"],
      locationType: "Physical storefront",
      address: "4521 Cleveland Ave",
      city: "Fort Myers",
      state: "FL",
      zipCode: "33901",
      latitude: "26.6102",
      longitude: "-81.8654",
      serviceOptions: ["By Appointment"],
      paymentMethod: "Direct to Vendor",
      paymentMethods: ["Cash", "Credit Card", "HSA/FSA"],
      businessValues: ["Holistic Wellness", "Licensed Therapists", "Organic Products"],
      isVerified: true,
      followerCount: 312,
      logoUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400",
      heroImageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200",
      capabilities: { menu: false, services: true, products: false },
      hours: {
        monday: { open: "9:00 AM", close: "7:00 PM" },
        tuesday: { open: "9:00 AM", close: "7:00 PM" },
        wednesday: { open: "9:00 AM", close: "7:00 PM" },
        thursday: { open: "9:00 AM", close: "8:00 PM" },
        friday: { open: "9:00 AM", close: "8:00 PM" },
        saturday: { open: "10:00 AM", close: "6:00 PM" },
        sunday: { open: "Closed", close: "Closed" }
      },
      contactEmail: "book@swflwellness.example.com",
      contactPhone: "(239) 555-0403",
    } as any).returning();
    console.log("✓ Created vendor:", vendor3.businessName);

    // Create 8 deals
    console.log("\n🎁 Creating deals...");

    const dealData = [
      // Palm Cafe deals (3)
      {
        vendorId: vendor1.id,
        title: "Free Coffee with Any Breakfast",
        description: "Start your day right! Get a complimentary drip coffee or iced coffee with any breakfast entree purchase.",
        tier: "free",
        isFree: true,
        isActive: true,
        isPassLocked: false,
        discountType: "free_item",
        finePrint: "One per customer per visit. Valid for drip or iced coffee only. Cannot be combined with other offers.",
        savingsAmount: 450,
        imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      {
        vendorId: vendor1.id,
        title: "20% Off Lunch (Pass Members)",
        description: "Exclusive for Rise Local Pass members! Enjoy 20% off your entire lunch bill Monday through Thursday.",
        tier: "member",
        isFree: false,
        isActive: true,
        isPassLocked: true,
        discountType: "percent",
        discountValue: 20,
        finePrint: "Valid Mon-Thu 11am-3pm. Excludes alcohol. Rise Local Pass required.",
        savingsAmount: null,
        imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600",
        startsAt: new Date(),
        endsAt: null, // No expiration
      },
      {
        vendorId: vendor1.id,
        title: "Buy 1 Get 1 Free Mimosas",
        description: "Weekend brunch just got better! Buy one mimosa, get the second one free. Perfect for celebrating with friends.",
        tier: "standard",
        isFree: false,
        isActive: true,
        isPassLocked: false,
        discountType: "bogo",
        finePrint: "Valid Sat-Sun 9am-2pm only. Must be 21+. One offer per table.",
        savingsAmount: 800,
        imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      },

      // Gulf Coast Goods deals (3)
      {
        vendorId: vendor2.id,
        title: "$10 Off $50+ Purchase",
        description: "Save $10 on your next purchase of $50 or more. Perfect for stocking up on gifts or treating yourself!",
        tier: "standard",
        isFree: false,
        isActive: true,
        isPassLocked: false,
        discountType: "dollar",
        discountValue: 10,
        finePrint: "Minimum $50 purchase required before discount. Cannot be combined with other coupons.",
        savingsAmount: 1000,
        imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
      },
      {
        vendorId: vendor2.id,
        title: "Free Gift Wrapping (Pass Members)",
        description: "Rise Local Pass members receive complimentary gift wrapping on all purchases. Make every gift special!",
        tier: "member",
        isFree: true,
        isActive: true,
        isPassLocked: true,
        discountType: "free_item",
        finePrint: "Rise Local Pass required. Standard gift wrap styles only.",
        savingsAmount: 500,
        imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600",
        startsAt: new Date(),
        endsAt: null, // No expiration
      },
      {
        vendorId: vendor2.id,
        title: "25% Off All Candles",
        description: "Light up your home with our locally-made candles at 25% off! Choose from coastal, floral, and seasonal scents.",
        tier: "standard",
        isFree: false,
        isActive: true,
        isPassLocked: false,
        discountType: "percent",
        discountValue: 25,
        finePrint: "Applies to in-stock candles only. While supplies last.",
        savingsAmount: null,
        imageUrl: "https://images.unsplash.com/photo-1602607625082-0a8e42c9a7c8?w=600",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      },

      // SWFL Wellness Spa deals (2)
      {
        vendorId: vendor3.id,
        title: "$15 Off First Massage",
        description: "New clients save $15 on their first 60-minute or 90-minute massage. Experience true relaxation!",
        tier: "standard",
        isFree: false,
        isActive: true,
        isPassLocked: false,
        discountType: "dollar",
        discountValue: 15,
        finePrint: "New clients only. Valid for 60-min or 90-min sessions. Must book in advance.",
        savingsAmount: 1500,
        imageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
      {
        vendorId: vendor3.id,
        title: "Free Add-On Service (Pass Members)",
        description: "Rise Local Pass members get a free aromatherapy or hot stone upgrade with any service booking!",
        tier: "member",
        isFree: true,
        isActive: true,
        isPassLocked: true,
        discountType: "free_item",
        finePrint: "Rise Local Pass required. Choose aromatherapy OR hot stone upgrade. One per booking.",
        savingsAmount: 2000,
        imageUrl: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=600",
        startsAt: new Date(),
        endsAt: null, // No expiration
      },
    ];

    for (const deal of dealData) {
      const [d] = await db.insert(deals).values(deal).returning();
      console.log(`✓ Created deal: "${d.title}" (${d.tier})`);
    }

    console.log("\n✨ Deals seed completed successfully!");
    console.log("\nVendors created:");
    console.log(`  - ${vendor1.businessName} (ID: ${vendor1.id})`);
    console.log(`  - ${vendor2.businessName} (ID: ${vendor2.id})`);
    console.log(`  - ${vendor3.businessName} (ID: ${vendor3.id})`);
    console.log("\nDeals created: 8 total (3 free, 5 member/standard)");
    console.log("\nVisit: http://localhost:5000/discover to see deals");

  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

seedDeals()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
