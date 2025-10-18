import { db } from "./storage";
import { loyaltyTiers } from "@shared/schema";

async function seedLoyaltyTiers() {
  console.log("Seeding loyalty tiers...");

  const tiers = [
    {
      name: "Bronze",
      minPoints: 0,
      maxPoints: 499,
      color: "#CD7F32",
      benefits: ["Earn 10 points per $1 spent", "Birthday surprise"],
      discountPercent: 0,
      displayOrder: 1,
    },
    {
      name: "Silver",
      minPoints: 500,
      maxPoints: 1499,
      color: "#C0C0C0",
      benefits: ["Earn 10 points per $1 spent", "5% off all purchases", "Early access to new products", "Birthday surprise"],
      discountPercent: 5,
      displayOrder: 2,
    },
    {
      name: "Gold",
      minPoints: 1500,
      maxPoints: 2999,
      color: "#FFD700",
      benefits: ["Earn 10 points per $1 spent", "10% off all purchases", "Early access to new products", "Free local delivery", "Birthday surprise"],
      discountPercent: 10,
      displayOrder: 3,
    },
    {
      name: "Platinum",
      minPoints: 3000,
      maxPoints: null,
      color: "#E5E4E2",
      benefits: ["Earn 10 points per $1 spent", "15% off all purchases", "Priority early access", "Free local delivery", "Exclusive events access", "Birthday surprise"],
      discountPercent: 15,
      displayOrder: 4,
    },
  ];

  for (const tier of tiers) {
    await db.insert(loyaltyTiers).values(tier).onConflictDoNothing();
  }

  console.log("✓ Loyalty tiers seeded successfully!");
}

seedLoyaltyTiers().catch(console.error);
