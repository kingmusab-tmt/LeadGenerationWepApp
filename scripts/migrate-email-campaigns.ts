/**
 * Migration script to enable new feature flags for all existing users and tiers
 * Features: emailCampaignsEnabled, smsCampaignsEnabled, aiGenerativeEnabled, imports
 * Run with: npx tsx scripts/migrate-email-campaigns.ts
 */

import mongoose from "mongoose";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in environment variables");
  process.exit(1);
}

async function migrate() {
  console.log("🔄 Connecting to MongoDB...");

  await mongoose.connect(MONGODB_URI as string);
  console.log("✅ Connected to MongoDB");

  const db = mongoose.connection.db;
  if (!db) {
    console.error("❌ Database connection failed");
    process.exit(1);
  }

  // Update all users
  console.log("\n📧 Updating users...");
  const userResult = await db.collection("users").updateMany(
    {},
    {
      $set: {
        "subscription.subscriptionLimits.emailCampaignsEnabled": true,
        "subscription.subscriptionLimits.smsCampaignsEnabled": true,
        "subscription.subscriptionLimits.aiGenerativeEnabled": true,
        "subscription.subscriptionLimits.imports": true,
      },
    },
  );
  console.log(
    `✅ Users updated: ${userResult.modifiedCount}/${userResult.matchedCount}`,
  );

  // Update all tiers
  console.log("\n📦 Updating tiers...");
  const tierResult = await db.collection("tiers").updateMany(
    {},
    {
      $set: {
        "tierLimits.emailCampaignsEnabled": true,
        "tierLimits.smsCampaignsEnabled": true,
        "tierLimits.aiGenerativeEnabled": true,
        "tierLimits.imports": true,
      },
    },
  );
  console.log(
    `✅ Tiers updated: ${tierResult.modifiedCount}/${tierResult.matchedCount}`,
  );

  console.log("\n🎉 Migration complete!");

  await mongoose.disconnect();
  console.log("👋 Disconnected from MongoDB");
  process.exit(0);
}

migrate().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
