import { db } from "./storage";
import { 
  vendors, 
  products, 
  events, 
  vendorReviews, 
  vendorFAQs,
  users 
} from "@shared/schema";

async function seed() {
  console.log("🌱 Starting seed...");

  try {
    // Create a user to own the vendor with unique username
    const timestamp = Date.now();
    const [user] = await db.insert(users).values({
      username: `sunshinegrovedemo_${timestamp}`,
      password: "demo123",
    }).returning();
    console.log("✓ Created user:", user.username);

    // Create Sunshine Grove Farm vendor
    const [vendor] = await db.insert(vendors).values({
      ownerId: user.id,
      businessName: "Sunshine Grove Farm",
      contactName: "Maria Martinez",
      tagline: "Seasonal produce grown with regenerative practices",
      bio: `Sunshine Grove Farm is a 15-acre family farm in Fort Myers, Florida, specializing in certified organic vegetables, herbs, and seasonal fruits. Founded in 2015 by the Martinez family, we're committed to regenerative agriculture that builds soil health while providing nutrient-dense food for our community.

Our farm operates on principles of biodiversity, crop rotation, and natural pest management. We never use synthetic pesticides or fertilizers, instead relying on composting, cover cropping, and companion planting to create a thriving ecosystem.

Beyond growing food, we're passionate about education. We offer weekly farm tours, seasonal workshops, and host school field trips to connect people with where their food comes from. Our CSA program serves 75 local families year-round, and we're proud to supply several Fort Myers restaurants with fresh, seasonal produce.`,
      category: "Produce",
      categories: ["Produce", "Herbs", "Farm Experiences"],
      locationType: "Physical storefront",
      address: "1234 Farm Road",
      city: "Fort Myers",
      state: "FL",
      zipCode: "33901",
      serviceOptions: ["Pickup", "Delivery"],
      paymentMethod: "Direct to Vendor",
      paymentMethods: ["Cash", "Venmo", "Credit Card", "Check"],
      businessValues: ["Certified Organic", "Regenerative Agriculture", "Family-Owned", "Educational Programs"],
      isVerified: true,
      followerCount: 342,
      logoUrl: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400",
      heroImageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200",
      website: "https://sunshinegovefarm.example.com",
      instagram: "@sunshinegovefarm",
      badges: ["Certified Organic", "Woman-Owned", "Carbon Neutral", "Living Wage Employer"],
      certifications: [
        {
          name: "USDA Organic Certification",
          issuedBy: "USDA",
          year: 2016,
          imageUrl: "https://images.unsplash.com/photo-1595855759920-86582396756e?w=200"
        },
        {
          name: "Certified Naturally Grown",
          issuedBy: "CNG",
          year: 2015,
          imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200"
        }
      ],
      localSourcingPercent: 95,
      fulfillmentOptions: ["Pickup", "Delivery"],
      hours: {
        monday: { open: "8:00 AM", close: "5:00 PM" },
        tuesday: { open: "8:00 AM", close: "5:00 PM" },
        wednesday: { open: "8:00 AM", close: "5:00 PM" },
        thursday: { open: "8:00 AM", close: "5:00 PM" },
        friday: { open: "8:00 AM", close: "6:00 PM" },
        saturday: { open: "7:00 AM", close: "3:00 PM" },
        sunday: { open: "Closed", close: "Closed" }
      },
      contactEmail: "hello@sunshinegovefarm.example.com",
      contactPhone: "(239) 555-0123",
      policies: {
        returns: "We stand behind the quality of our produce. If you're not satisfied with your purchase, please contact us within 24 hours for a refund or exchange.",
        delivery: "Free delivery on orders over $50 within 10 miles of the farm. $5 delivery fee for smaller orders. We deliver Tuesday, Thursday, and Saturday.",
        pickup: "Farm pickup available daily during business hours. Please order at least 24 hours in advance.",
        cancellation: "CSA members can skip weeks with 48 hours notice. Market orders can be cancelled up to 12 hours before pickup/delivery."
      },
      gallery: [
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600",
        "https://images.unsplash.com/photo-1592419044706-39796d40f98c?w=600",
        "https://images.unsplash.com/photo-1595855759920-86582396756e?w=600",
        "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600",
        "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600",
        "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=600"
      ]
    }).returning();
    console.log("✓ Created vendor:", vendor.businessName);

    // Create products
    const productData = [
      {
        vendorId: vendor.id,
        name: "Heirloom Tomato Mix",
        description: "A vibrant mix of heirloom tomatoes in various colors and sizes. Includes Cherokee Purple, Brandywine, and Green Zebra varieties.",
        priceCents: 650,
        stock: 45,
        category: "Produce",
        imageUrl: "https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=400",
        valueTags: ["Organic", "Heirloom", "Locally Grown"],
        sourceFarm: "Sunshine Grove Farm - Field 3",
        harvestDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
        leadTimeDays: 0,
        inventoryStatus: "In Stock"
      },
      {
        vendorId: vendor.id,
        name: "Baby Lettuce Mix",
        description: "Tender blend of baby lettuces including red oak, buttercrunch, and romaine. Perfect for salads.",
        priceCents: 450,
        stock: 60,
        category: "Produce",
        imageUrl: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400",
        valueTags: ["Organic", "Freshly Harvested"],
        sourceFarm: "Sunshine Grove Farm - Greenhouse 2",
        harvestDate: new Date(),
        leadTimeDays: 0,
        inventoryStatus: "In Stock"
      },
      {
        vendorId: vendor.id,
        name: "Fresh Basil Bunch",
        description: "Fragrant Genovese basil, perfect for pesto, caprese salad, or pasta dishes.",
        priceCents: 350,
        stock: 30,
        category: "Herbs",
        imageUrl: "https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=400",
        valueTags: ["Organic", "Freshly Cut"],
        sourceFarm: "Sunshine Grove Farm - Herb Garden",
        harvestDate: new Date(),
        leadTimeDays: 0,
        inventoryStatus: "In Stock"
      },
      {
        vendorId: vendor.id,
        name: "Rainbow Carrots",
        description: "Sweet, crunchy carrots in purple, yellow, orange, and white. Beautiful and delicious!",
        priceCents: 500,
        stock: 35,
        category: "Produce",
        imageUrl: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400",
        valueTags: ["Organic", "Heirloom"],
        sourceFarm: "Sunshine Grove Farm - Field 1",
        harvestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        leadTimeDays: 0,
        inventoryStatus: "In Stock"
      }
    ];

    for (const product of productData) {
      const [p] = await db.insert(products).values(product).returning();
      console.log("✓ Created product:", p.name);
    }

    // Create events
    const eventData = [
      {
        organizerId: vendor.id,
        title: "Farm Tour & Tasting",
        description: "Join us for a guided tour of our farm followed by a tasting of seasonal produce. Learn about our regenerative farming practices and meet the farmers!",
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        location: "Sunshine Grove Farm, Fort Myers",
        category: "Workshop",
        ticketsAvailable: 20,
        rsvpCount: 12
      },
      {
        organizerId: vendor.id,
        title: "Seed Saving Workshop",
        description: "Learn the art of saving seeds from your garden. We'll cover selection, harvesting, cleaning, and storage techniques for various vegetable seeds.",
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        location: "Sunshine Grove Farm, Fort Myers",
        category: "Workshop",
        ticketsAvailable: 15,
        rsvpCount: 8
      },
      {
        organizerId: vendor.id,
        title: "Harvest Festival",
        description: "Celebrate the fall harvest with us! Family-friendly activities, live music, farm-to-table food, and U-pick vegetables. Bring the whole family!",
        dateTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month from now
        location: "Sunshine Grove Farm, Fort Myers",
        category: "Festival",
        ticketsAvailable: 200,
        rsvpCount: 67
      }
    ];

    for (const event of eventData) {
      const [e] = await db.insert(events).values(event).returning();
      console.log("✓ Created event:", e.title);
    }

    // Create reviews
    const reviewData = [
      {
        vendorId: vendor.id,
        authorName: "Sarah Johnson",
        rating: 5,
        comment: "Best produce in Fort Myers! The tomatoes are incredible - so much flavor compared to store-bought. Love knowing exactly where my food comes from.",
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        vendorId: vendor.id,
        authorName: "Michael Chen",
        rating: 5,
        comment: "Been a CSA member for 2 years and couldn't be happier. The variety is amazing and the quality is always top-notch. The farm tour was educational and fun!",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        vendorId: vendor.id,
        authorName: "Emily Rodriguez",
        rating: 5,
        comment: "The Martinez family has created something truly special. You can taste the care they put into everything they grow. Highly recommend!",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        vendorId: vendor.id,
        authorName: "David Thompson",
        rating: 4,
        comment: "Great farm with excellent produce. Only minor issue is they sometimes run out of popular items quickly. Get there early on Saturday!",
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const review of reviewData) {
      const [r] = await db.insert(vendorReviews).values(review).returning();
      console.log("✓ Created review from:", r.authorName);
    }

    // Create FAQs
    const faqData = [
      {
        vendorId: vendor.id,
        question: "What's included in the CSA box?",
        answer: "Our CSA boxes vary by season and include 8-12 items of fresh, organic produce. You'll always get a mix of greens, root vegetables, and seasonal specialties. We email the contents list on Monday for that week's Thursday delivery.",
        displayOrder: 1
      },
      {
        vendorId: vendor.id,
        question: "Do you use any pesticides?",
        answer: "Never! We are USDA Certified Organic and follow strict organic practices. We use companion planting, beneficial insects, and crop rotation to manage pests naturally.",
        displayOrder: 2
      },
      {
        vendorId: vendor.id,
        question: "Can I visit the farm?",
        answer: "Absolutely! We love visitors. Farm tours are available every Saturday at 9 AM (free, no reservation needed). We also offer private group tours by appointment.",
        displayOrder: 3
      },
      {
        vendorId: vendor.id,
        question: "What are your delivery zones?",
        answer: "We deliver to Fort Myers, Cape Coral, and Bonita Springs. Delivery is free for orders over $50 within 10 miles of the farm. For areas further out, there's a small delivery fee.",
        displayOrder: 4
      },
      {
        vendorId: vendor.id,
        question: "How do I store the produce?",
        answer: "Most vegetables store best in the crisper drawer of your refrigerator. Tomatoes and basil should be kept at room temperature. We include storage tips with each CSA delivery!",
        displayOrder: 5
      }
    ];

    for (const faq of faqData) {
      const [f] = await db.insert(vendorFAQs).values(faq).returning();
      console.log("✓ Created FAQ:", f.question);
    }

    console.log("\n✨ Seed completed successfully!");
    console.log(`\nVendor ID: ${vendor.id}`);
    console.log(`Visit: http://localhost:5000/vendor/${vendor.id}`);
    console.log(`Dashboard: http://localhost:5000/dashboard (mock vendor ID in code)`);

  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
