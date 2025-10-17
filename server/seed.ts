import { storage } from "./storage";

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Get existing vendors
    const vendors = await storage.getVendors();
    if (vendors.length === 0) {
      console.log("⚠️  No vendors found. Please create vendors first.");
      return;
    }

    console.log(`Found ${vendors.length} vendors`);

    // Seed products for different vendors
    const products = [
      // Roots & Harvest (Produce vendor)
      {
        vendorId: vendors.find(v => v.businessName === "Roots & Harvest")?.id || vendors[0].id,
        name: "Organic Heirloom Tomatoes",
        priceCents: 599, // $5.99
        stock: 50,
        category: "Produce",
        description: "Fresh locally-grown heirloom tomatoes in assorted varieties. Perfect for salads and sandwiches.",
        imageUrl: "/images/products/tomatoes.jpg",
      },
      {
        vendorId: vendors.find(v => v.businessName === "Roots & Harvest")?.id || vendors[0].id,
        name: "Fresh Basil Bunch",
        priceCents: 349, // $3.49
        stock: 30,
        category: "Herbs",
        description: "Aromatic fresh basil, hand-picked this morning. Great for pesto and Italian cooking.",
        imageUrl: "/images/products/basil.jpg",
      },
      {
        vendorId: vendors.find(v => v.businessName === "Roots & Harvest")?.id || vendors[0].id,
        name: "Organic Baby Spinach",
        priceCents: 449, // $4.49
        stock: 40,
        category: "Produce",
        description: "Tender baby spinach leaves, perfect for salads or cooking. Certified organic.",
        imageUrl: "/images/products/spinach.jpg",
      },

      // Epiphany's Gluten Free Bakery
      {
        vendorId: vendors.find(v => v.businessName === "Epiphany's Gluten Free Bakery")?.id || vendors[1].id,
        name: "Sourdough Bread (Gluten-Free)",
        priceCents: 899, // $8.99
        stock: 15,
        category: "Baked Goods",
        description: "Artisan gluten-free sourdough bread with a perfect crust and chewy interior.",
        imageUrl: "/images/products/sourdough.jpg",
      },
      {
        vendorId: vendors.find(v => v.businessName === "Epiphany's Gluten Free Bakery")?.id || vendors[1].id,
        name: "Chocolate Chip Cookies (6-pack)",
        priceCents: 699, // $6.99
        stock: 25,
        category: "Baked Goods",
        description: "Classic chocolate chip cookies, gluten-free and delicious. Made with organic ingredients.",
        imageUrl: "/images/products/cookies.jpg",
      },
      {
        vendorId: vendors.find(v => v.businessName === "Epiphany's Gluten Free Bakery")?.id || vendors[1].id,
        name: "Blueberry Muffins (4-pack)",
        priceCents: 799, // $7.99
        stock: 20,
        category: "Baked Goods",
        description: "Moist blueberry muffins bursting with fresh berries. Gluten-free and dairy-free options available.",
        imageUrl: "/images/products/muffins.jpg",
      },

      // Flying Eagle Kombucha
      {
        vendorId: vendors.find(v => v.businessName === "Flying Eagle Kombucha")?.id || vendors[2].id,
        name: "Original Kombucha (16oz)",
        priceCents: 499, // $4.99
        stock: 60,
        category: "Beverages",
        description: "Classic kombucha with a tangy, refreshing taste. Probiotic-rich and naturally carbonated.",
        imageUrl: "/images/products/kombucha-original.jpg",
      },
      {
        vendorId: vendors.find(v => v.businessName === "Flying Eagle Kombucha")?.id || vendors[2].id,
        name: "Ginger Lemon Kombucha (16oz)",
        priceCents: 549, // $5.49
        stock: 45,
        category: "Beverages",
        description: "Zesty ginger and bright lemon create the perfect balance in this energizing kombucha.",
        imageUrl: "/images/products/kombucha-ginger.jpg",
      },

      // Gulf Coast Beekeepers
      {
        vendorId: vendors.find(v => v.businessName === "Gulf Coast Beekeepers")?.id || vendors[3].id,
        name: "Raw Local Honey (12oz)",
        priceCents: 1299, // $12.99
        stock: 35,
        category: "Honey & Preserves",
        description: "Pure raw honey from local Southwest Florida bees. Unfiltered and unprocessed.",
        imageUrl: "/images/products/honey.jpg",
      },
      {
        vendorId: vendors.find(v => v.businessName === "Gulf Coast Beekeepers")?.id || vendors[3].id,
        name: "Honeycomb Square",
        priceCents: 1599, // $15.99
        stock: 20,
        category: "Honey & Preserves",
        description: "Natural honeycomb straight from the hive. A unique and delicious treat.",
        imageUrl: "/images/products/honeycomb.jpg",
      },

      // Lotus Wellness Studio (wellness products)
      {
        vendorId: vendors.find(v => v.businessName === "Lotus Wellness Studio")?.id || vendors[4].id,
        name: "Lavender Essential Oil (10ml)",
        priceCents: 1899, // $18.99
        stock: 25,
        category: "Wellness",
        description: "Pure therapeutic-grade lavender essential oil. Perfect for relaxation and aromatherapy.",
        imageUrl: "/images/products/lavender-oil.jpg",
      },
      {
        vendorId: vendors.find(v => v.businessName === "Lotus Wellness Studio")?.id || vendors[4].id,
        name: "Yoga Mat - Eco Cork",
        priceCents: 5999, // $59.99
        stock: 12,
        category: "Wellness",
        description: "Sustainable cork yoga mat with excellent grip. Non-toxic and biodegradable.",
        imageUrl: "/images/products/yoga-mat.jpg",
      },
    ];

    // Insert all products
    for (const product of products) {
      const created = await storage.createProduct(product);
      console.log(`✓ Created: ${created.name} - $${(created.priceCents / 100).toFixed(2)}`);
    }

    console.log(`\n✅ Successfully seeded ${products.length} products!`);

  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("🎉 Seed complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Seed error:", error);
    process.exit(1);
  });
