import { db } from "./storage";
import { 
  conversations, 
  conversationMessages,
  users,
  vendors,
  deals
} from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedConversations() {
  console.log("💬 Starting B2C conversations seed...");

  try {
    const existingVendors = await db.select().from(vendors).limit(3);
    
    if (existingVendors.length === 0) {
      console.log("⚠️  No vendors found. Please run 'npx tsx server/seed-deals.ts' first.");
      process.exit(1);
    }

    const existingDeals = await db.select().from(deals).limit(5);
    
    const timestamp = Date.now();
    
    console.log("\n👤 Creating test consumer user...");
    const [consumer] = await db.insert(users).values({
      username: `shopper_${timestamp}`,
      password: "demo123",
      role: "buyer",
      email: `shopper_${timestamp}@example.com`,
      firstName: "Alex",
      lastName: "Johnson",
      onboardingComplete: true,
    }).returning();
    console.log(`✓ Created consumer: ${consumer.firstName} ${consumer.lastName}`);

    console.log("\n💬 Creating test conversations...");
    
    for (let i = 0; i < Math.min(3, existingVendors.length); i++) {
      const vendor = existingVendors[i];
      const deal = existingDeals[i] || null;
      
      const [conversation] = await db.insert(conversations).values({
        consumerId: consumer.id,
        vendorId: vendor.id,
        dealId: deal?.id || null,
        lastMessageAt: new Date(),
      }).returning();
      
      console.log(`✓ Created conversation with ${vendor.businessName}`);
      
      await db.insert(conversationMessages).values({
        conversationId: conversation.id,
        senderId: consumer.id,
        senderRole: "consumer",
        content: deal 
          ? `Hi! I saw your deal "${deal.title}" and I have a question. Can I use this with other promotions?`
          : `Hi! I'm interested in your business. What are your hours today?`,
      });
      console.log(`  ✓ Added consumer message`);
      
      await db.insert(conversationMessages).values({
        conversationId: conversation.id,
        senderId: vendor.ownerId,
        senderRole: "vendor",
        content: deal
          ? `Thanks for reaching out! Unfortunately, this deal cannot be combined with other promotions, but it's already a great value. Let us know if you have any other questions!`
          : `Thanks for your interest! We're open today from 10am to 8pm. Come visit us!`,
      });
      console.log(`  ✓ Added vendor reply`);
      
      await db.insert(conversationMessages).values({
        conversationId: conversation.id,
        senderId: consumer.id,
        senderRole: "consumer",
        content: "That sounds great, thank you! I'll definitely stop by this week.",
      });
      console.log(`  ✓ Added consumer follow-up`);
    }

    console.log("\n✨ B2C conversations seed completed successfully!");
    console.log(`\nTest consumer credentials:`);
    console.log(`  Username: ${consumer.username}`);
    console.log(`  Password: demo123`);
    console.log(`\nConversations created: ${Math.min(3, existingVendors.length)}`);
    console.log("\nTo view conversations:");
    console.log("  - Consumer: Log in and go to /messages");
    console.log("  - Vendor: Log in as vendor and go to Dashboard > Messages tab");

  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

seedConversations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
