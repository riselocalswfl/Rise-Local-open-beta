import { db } from "./storage";
import { 
  restaurants,
  menuItems,
  events,
  restaurantReviews,
  restaurantFAQs,
  users
} from "@shared/schema";

async function seedRestaurants() {
  console.log("🍽️  Starting restaurant seed...");

  try {
    // Create user for first restaurant
    const timestamp = Date.now();
    const [user1] = await db.insert(users).values({
      username: `harvesttable_${timestamp}`,
      password: "demo123",
      role: "vendor",
    }).returning();
    console.log("✓ Created user:", user1.username);

    // 1. HARVEST TABLE - Farm-to-Table Restaurant
    const [harvestTable] = await db.insert(restaurants).values({
      ownerId: user1.id,
      restaurantName: "The Harvest Table",
      contactName: "Chef Elena Rodriguez",
      tagline: "Farm-fresh dining featuring local ingredients",
      bio: `The Harvest Table is Fort Myers' premier farm-to-table restaurant, dedicated to showcasing the incredible bounty of Southwest Florida's farms and waters. Founded in 2018 by Chef Elena Rodriguez, our menu changes weekly based on what's fresh and available from our partner farms.

We believe that great food starts with great ingredients. That's why we work directly with over 20 local farms, fishermen, and artisans to source everything from heirloom tomatoes to line-caught grouper. Our menu is a celebration of seasonality - you'll never find the same dish twice, but you'll always find something extraordinary.

Our dining room features reclaimed wood from local barns, Edison bulb lighting, and an open kitchen where you can watch our chefs at work. We also offer cooking classes, chef's table dinners, and private events in our greenhouse dining room.`,
      cuisineType: "Farm-to-Table American",
      locationType: "Physical storefront",
      serviceOptions: ["Dine-in", "Takeout"],
      city: "Fort Myers",
      state: "FL",
      zipCode: "33901",
      address: "789 First Street",
      contactPhone: "(239) 555-0199",
      contactEmail: "hello@harvesttablefl.com",
      website: "https://harvesttablefl.example.com",
      instagram: "@harvesttablefl",
      paymentMethod: "Direct to Restaurant",
      paymentMethods: ["Credit Card", "Cash"],
      priceRange: "$$-$$$",
      seatingCapacity: 85,
      reservationsPhone: "(239) 555-0199",
      dietaryOptions: ["Vegetarian", "Vegan", "Gluten-Free"],
      isVerified: true,
      badges: ["Farm-to-Table Certified", "Sustainable Seafood Partner", "Zero Waste Kitchen"],
      certifications: [
        {
          name: "Green Restaurant Certification",
          issuedBy: "Green Restaurant Association",
          year: 2019,
          imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200"
        }
      ],
      heroImageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200",
      hours: {
        monday: { open: "Closed", close: "Closed" },
        tuesday: { open: "5:00 PM", close: "10:00 PM" },
        wednesday: { open: "5:00 PM", close: "10:00 PM" },
        thursday: { open: "5:00 PM", close: "10:00 PM" },
        friday: { open: "5:00 PM", close: "11:00 PM" },
        saturday: { open: "11:00 AM", close: "11:00 PM" },
        sunday: { open: "11:00 AM", close: "9:00 PM" }
      },
      policies: {
        cancellation: "Please cancel reservations at least 2 hours in advance. No-shows or late cancellations for parties of 6+ may be charged a $25/person fee.",
        dietary: "We can accommodate most dietary restrictions with advance notice. Our kitchen handles wheat, dairy, nuts, and shellfish.",
        kids: "Kids menu available. High chairs provided. We welcome families!",
        parking: "Street parking and municipal lot across the street. Valet available Friday-Saturday evenings."
      },
      gallery: [
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",
        "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600",
        "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600",
        "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600",
        "https://images.unsplash.com/photo-1592861956120-e524fc739696?w=600"
      ]
    }).returning();
    console.log("✓ Created restaurant:", harvestTable.restaurantName);

    // Menu items for Harvest Table
    const harvestTableMenu = [
      {
        restaurantId: harvestTable.id,
        name: "Heirloom Tomato Salad",
        description: "Locally grown heirloom tomatoes, burrata, basil, aged balsamic, extra virgin olive oil",
        priceCents: 1400,
        category: "Appetizers",
        imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
        ingredients: "Heirloom tomatoes, Burrata cheese, Fresh basil, Balsamic vinegar, Olive oil",
        allergens: ["Dairy"],
        isAvailable: true
      },
      {
        restaurantId: harvestTable.id,
        name: "Pan-Seared Grouper",
        description: "Line-caught Gulf grouper, roasted corn succotash, micro greens, citrus beurre blanc",
        priceCents: 3200,
        category: "Entrees",
        imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400",
        ingredients: "Gulf grouper, Sweet corn, Butter, Citrus, Micro greens",
        allergens: ["Fish", "Dairy"],
        isAvailable: true
      },
      {
        restaurantId: harvestTable.id,
        name: "Grass-Fed Ribeye",
        description: "12oz Florida grass-fed ribeye, smoked fingerling potatoes, seasonal vegetables, red wine reduction",
        priceCents: 4200,
        category: "Entrees",
        imageUrl: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400",
        ingredients: "Grass-fed beef, Fingerling potatoes, Seasonal vegetables, Red wine",
        allergens: [],
        isAvailable: true
      },
      {
        restaurantId: harvestTable.id,
        name: "Roasted Vegetable Bowl",
        description: "Seasonal roasted vegetables, quinoa, tahini drizzle, microgreens, toasted seeds",
        priceCents: 1900,
        category: "Entrees",
        imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
        ingredients: "Seasonal vegetables, Quinoa, Tahini, Mixed seeds, Microgreens",
        allergens: ["Sesame"],
        isAvailable: true
      },
      {
        restaurantId: harvestTable.id,
        name: "Key Lime Pie",
        description: "House-made Key lime pie with graham cracker crust and whipped cream",
        priceCents: 950,
        category: "Desserts",
        imageUrl: "https://images.unsplash.com/photo-1535920527002-b35e96722eb9?w=400",
        ingredients: "Key limes, Graham crackers, Cream, Sugar, Eggs",
        allergens: ["Gluten", "Dairy", "Eggs"],
        isAvailable: true
      },
      {
        restaurantId: harvestTable.id,
        name: "Craft Cocktails",
        description: "Rotating selection of cocktails featuring local spirits and fresh herbs from our garden",
        priceCents: 1200,
        category: "Drinks",
        imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400",
        ingredients: "Seasonal spirits, Fresh herbs, House-made syrups",
        allergens: [],
        isAvailable: true
      }
    ];

    for (const item of harvestTableMenu) {
      const [m] = await db.insert(menuItems).values(item).returning();
      console.log("✓ Created menu item:", m.name);
    }

    // Events for Harvest Table
    const harvestTableEvents = [
      {
        restaurantId: harvestTable.id,
        title: "Farm Dinner Series: Spring Harvest",
        description: "Join us for an exclusive 5-course dinner featuring ingredients from this week's farm deliveries. Meet the farmers and learn about each dish's origin story.",
        dateTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        location: "The Harvest Table - Greenhouse Dining Room",
        category: "Dining Event",
        ticketsAvailable: 30,
        rsvpCount: 22
      },
      {
        restaurantId: harvestTable.id,
        title: "Cooking Class: Seasonal Cooking",
        description: "Learn to cook with what's in season! Chef Elena teaches techniques for making the most of farmers market finds.",
        dateTime: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
        location: "The Harvest Table - Teaching Kitchen",
        category: "Workshop",
        ticketsAvailable: 12,
        rsvpCount: 12
      }
    ];

    for (const event of harvestTableEvents) {
      const [e] = await db.insert(events).values(event).returning();
      console.log("✓ Created event:", e.title);
    }

    // Reviews for Harvest Table
    const harvestTableReviews = [
      {
        restaurantId: harvestTable.id,
        authorName: "Jennifer Williams",
        rating: 5,
        comment: "Incredible dining experience! Every dish was perfectly executed and you can taste how fresh everything is. The grouper was the best I've ever had.",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        restaurantId: harvestTable.id,
        authorName: "Robert Martinez",
        rating: 5,
        comment: "This is what farm-to-table should be. They really walk the walk. Love supporting a restaurant that supports our local farmers.",
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
      },
      {
        restaurantId: harvestTable.id,
        authorName: "Amanda Chen",
        rating: 4,
        comment: "Beautiful atmosphere and excellent food. Menu changes weekly which is exciting but can be challenging if you have favorites!",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const review of harvestTableReviews) {
      const [r] = await db.insert(restaurantReviews).values(review).returning();
      console.log("✓ Created review from:", r.authorName);
    }

    // FAQs for Harvest Table
    const harvestTableFAQs = [
      {
        restaurantId: harvestTable.id,
        question: "Do you take reservations?",
        answer: "Yes! We highly recommend reservations, especially for weekend dinners. You can book online through our website or call us at (239) 555-0199. Walk-ins are always welcome at our bar.",
        displayOrder: 1
      },
      {
        restaurantId: harvestTable.id,
        question: "Can you accommodate dietary restrictions?",
        answer: "Absolutely. We offer vegetarian, vegan, and gluten-free options daily. Our menu is designed to be flexible, and our kitchen can modify dishes to accommodate most restrictions with advance notice.",
        displayOrder: 2
      },
      {
        restaurantId: harvestTable.id,
        question: "Does the menu really change weekly?",
        answer: "Yes! We update our menu every Monday based on what's available from our farm partners. We post the new menu on Instagram and our website. Some signature items rotate back seasonally.",
        displayOrder: 3
      }
    ];

    for (const faq of harvestTableFAQs) {
      const [f] = await db.insert(restaurantFAQs).values(faq).returning();
      console.log("✓ Created FAQ:", f.question);
    }

    // 2. VERDE VITA - Vegan Cafe
    const [user2] = await db.insert(users).values({
      username: `verdevita_${timestamp + 1}`,
      password: "demo123",
      role: "vendor",
    }).returning();

    const [verdeVita] = await db.insert(restaurants).values({
      ownerId: user2.id,
      restaurantName: "Verde Vita",
      contactName: "Maya Patel",
      tagline: "Plant-powered cafe with a passion for local produce",
      bio: `Verde Vita is Fort Myers' first 100% plant-based cafe, proving that vegan food can be creative, satisfying, and downright delicious. We opened in 2020 with a mission to make plant-based eating accessible and exciting for everyone - whether you're a longtime vegan or just curious.

Everything we serve is made from scratch using organic, locally-sourced ingredients whenever possible. Our menu features creative bowls, hearty sandwiches, fresh-pressed juices, and house-made pastries. We're especially proud of our relationships with local farms who grow specialty items just for us.

Beyond food, we're a community space. We host vegan cooking classes, nutrition workshops, and plant-based potlucks. We're here to show that eating plants is good for you, good for animals, and good for the planet.`,
      cuisineType: "Vegan",
      locationType: "Physical storefront",
      serviceOptions: ["Dine-in", "Takeout", "Delivery"],
      city: "Fort Myers",
      state: "FL",
      zipCode: "33901",
      address: "456 Green Street",
      contactPhone: "(239) 555-0177",
      contactEmail: "hello@verdevita.com",
      website: "https://verdevita.example.com",
      instagram: "@verdevitacafe",
      paymentMethod: "Direct to Restaurant",
      paymentMethods: ["Credit Card", "Cash", "Venmo"],
      priceRange: "$-$$",
      seatingCapacity: 45,
      dietaryOptions: ["Vegan", "Gluten-Free", "Soy-Free", "Nut-Free options"],
      isVerified: true,
      badges: ["100% Plant-Based", "Organic Certified", "Zero Waste"],
      certifications: [],
      heroImageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200",
      hours: {
        monday: { open: "8:00 AM", close: "6:00 PM" },
        tuesday: { open: "8:00 AM", close: "6:00 PM" },
        wednesday: { open: "8:00 AM", close: "6:00 PM" },
        thursday: { open: "8:00 AM", close: "6:00 PM" },
        friday: { open: "8:00 AM", close: "8:00 PM" },
        saturday: { open: "9:00 AM", close: "8:00 PM" },
        sunday: { open: "9:00 AM", close: "4:00 PM" }
      },
      policies: {
        allergies: "We're a plant-based kitchen free from eggs, dairy, and meat. We do use tree nuts, soy, and gluten. Please inform staff of any allergies.",
        takeout: "All packaging is compostable! Bring your own containers for 10% off.",
        wifi: "Free wifi available. Please be mindful of other customers during peak hours."
      },
      gallery: [
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600",
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
        "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600"
      ]
    }).returning();
    console.log("✓ Created restaurant:", verdeVita.restaurantName);

    // Menu items for Verde Vita
    const verdeVitaMenu = [
      {
        restaurantId: verdeVita.id,
        name: "Sunshine Bowl",
        description: "Turmeric quinoa, roasted sweet potato, massaged kale, chickpeas, tahini dressing, hemp seeds",
        priceCents: 1350,
        category: "Entrees",
        imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
        ingredients: "Quinoa, Sweet potato, Kale, Chickpeas, Tahini, Hemp seeds",
        allergens: ["Sesame"],
        isAvailable: true
      },
      {
        restaurantId: verdeVita.id,
        name: "Veggie Burger",
        description: "House-made black bean & beet patty, avocado, sprouts, tomato, chipotle aioli, whole grain bun",
        priceCents: 1200,
        category: "Entrees",
        imageUrl: "https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400",
        ingredients: "Black beans, Beets, Avocado, Sprouts, Tomato, Whole grain bun",
        allergens: ["Gluten", "Soy"],
        isAvailable: true
      },
      {
        restaurantId: verdeVita.id,
        name: "Green Goddess Smoothie",
        description: "Spinach, mango, banana, coconut milk, spirulina, dates",
        priceCents: 850,
        category: "Drinks",
        imageUrl: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400",
        ingredients: "Spinach, Mango, Banana, Coconut milk, Spirulina, Dates",
        allergens: [],
        isAvailable: true
      },
      {
        restaurantId: verdeVita.id,
        name: "Raw Chocolate Brownie",
        description: "Made with dates, walnuts, cacao, and topped with coconut cream",
        priceCents: 650,
        category: "Desserts",
        imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400",
        ingredients: "Dates, Walnuts, Cacao, Coconut cream",
        allergens: ["Tree Nuts"],
        isAvailable: true
      }
    ];

    for (const item of verdeVitaMenu) {
      const [m] = await db.insert(menuItems).values(item).returning();
      console.log("✓ Created menu item:", m.name);
    }

    // Reviews for Verde Vita
    const verdeVitaReviews = [
      {
        restaurantId: verdeVita.id,
        authorName: "Lisa Thompson",
        rating: 5,
        comment: "Even as a meat-eater, I'm blown away by how good this food is! The veggie burger is amazing and the smoothies are perfect.",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        restaurantId: verdeVita.id,
        authorName: "Marcus Johnson",
        rating: 5,
        comment: "Love the mission and the food. This is my go-to spot for healthy lunch. Sunshine bowl is life-changing!",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const review of verdeVitaReviews) {
      const [r] = await db.insert(restaurantReviews).values(review).returning();
      console.log("✓ Created review from:", r.authorName);
    }

    // FAQs for Verde Vita
    const verdeVitaFAQs = [
      {
        restaurantId: verdeVita.id,
        question: "Is everything really vegan?",
        answer: "Yes! 100% plant-based, all the time. No animal products whatsoever - no meat, dairy, eggs, or honey. We're a completely vegan kitchen.",
        displayOrder: 1
      },
      {
        restaurantId: verdeVita.id,
        question: "Do you have gluten-free options?",
        answer: "Many of our items are naturally gluten-free, including all our bowls and smoothies. We also offer gluten-free bread for sandwiches. Just ask your server!",
        displayOrder: 2
      }
    ];

    for (const faq of verdeVitaFAQs) {
      const [f] = await db.insert(restaurantFAQs).values(faq).returning();
      console.log("✓ Created FAQ:", f.question);
    }

    console.log("\n✨ Restaurant seed completed successfully!");
    console.log(`\nRestaurant IDs:`);
    console.log(`The Harvest Table: ${harvestTable.id}`);
    console.log(`Verde Vita: ${verdeVita.id}`);
    console.log(`\nVisit:`);
    console.log(`http://localhost:5000/restaurant/${harvestTable.id}`);
    console.log(`http://localhost:5000/restaurant/${verdeVita.id}`);
    console.log(`http://localhost:5000/eat-local`);

  } catch (error) {
    console.error("❌ Restaurant seed failed:", error);
    throw error;
  }
}

seedRestaurants()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
