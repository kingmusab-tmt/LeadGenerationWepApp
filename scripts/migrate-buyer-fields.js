/**
 * Migration Script: Add New Buyer Configuration Fields
 *
 * This script updates existing buyer documents to include new configuration fields
 * that were added to match the BUSINESS_WORKFLOWS_AND_INTEGRATIONS.md specification.
 *
 * New fields added:
 * - industries[] (replaces single industry string)
 * - vacationMode{}
 * - budgetCapType
 * - budgetLimitAmount
 * - currentPeriodSpent
 * - periodStartDate
 * - volumeLimitCount
 * - currentPeriodCount
 * - maxConcurrentLeads
 * - restrictedZones[]
 * - radiusFlexibility
 * - webhookConfig{}
 * - notifyOnWeekends
 *
 * Run with: node scripts/migrate-buyer-fields.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/leadgeneration";

async function migrateBuyerFields() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const buyersCollection = db.collection("leadbuyers");

    console.log("\n📊 Checking existing buyer documents...");
    const totalBuyers = await buyersCollection.countDocuments();
    console.log(`Found ${totalBuyers} buyer documents`);

    if (totalBuyers === 0) {
      console.log("⚠️  No buyers found. Migration not needed.");
      await mongoose.connection.close();
      return;
    }

    console.log("\n🔄 Starting migration...\n");

    // Migration 1: Convert leadPreferences.industry (string) to industries (array)
    console.log("1️⃣  Migrating industry field to industries array...");
    const result1 = await buyersCollection.updateMany(
      {
        "leadPreferences.industry": { $exists: true, $type: "string" },
        "leadPreferences.industries": { $exists: false },
      },
      [
        {
          $set: {
            "leadPreferences.industries": {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$leadPreferences.industry", ""] },
                    { $ne: ["$leadPreferences.industry", null] },
                  ],
                },
                then: ["$leadPreferences.industry"],
                else: [],
              },
            },
          },
        },
      ],
    );
    console.log(
      `   ✅ Updated ${result1.modifiedCount} buyers with industries array`,
    );

    // Migration 2: Add vacation mode
    console.log("2️⃣  Adding vacation mode configuration...");
    const result2 = await buyersCollection.updateMany(
      { vacationMode: { $exists: false } },
      {
        $set: {
          vacationMode: {
            enabled: false,
            pauseUntil: null,
            autoReject: true,
          },
        },
      },
    );
    console.log(
      `   ✅ Updated ${result2.modifiedCount} buyers with vacation mode`,
    );

    // Migration 3: Add period-based budget tracking
    console.log("3️⃣  Adding period-based budget tracking...");
    const result3 = await buyersCollection.updateMany(
      {
        $or: [
          { budgetCapType: { $exists: false } },
          { budgetLimitAmount: { $exists: false } },
        ],
      },
      {
        $set: {
          budgetCapType: "monthly",
          budgetLimitAmount: 0, // 0 means unlimited
          currentPeriodSpent: 0,
          periodStartDate: new Date(),
          volumeLimitCount: 0, // 0 means unlimited
          currentPeriodCount: 0,
        },
      },
    );
    console.log(
      `   ✅ Updated ${result3.modifiedCount} buyers with budget tracking`,
    );

    // Migration 5: Add concurrent leads limit
    console.log("5️⃣  Adding concurrent leads limit...");
    const result5 = await buyersCollection.updateMany(
      { maxConcurrentLeads: { $exists: false } },
      {
        $set: {
          maxConcurrentLeads: 0, // 0 means unlimited
        },
      },
    );
    console.log(
      `   ✅ Updated ${result5.modifiedCount} buyers with concurrent limit`,
    );

    // Migration 6: Add location restrictions
    console.log("6️⃣  Adding restricted zones and radius flexibility...");
    const result6 = await buyersCollection.updateMany(
      {
        $or: [
          { restrictedZones: { $exists: false } },
          { radiusFlexibility: { $exists: false } },
        ],
      },
      {
        $set: {
          restrictedZones: [],
          radiusFlexibility: "flexible",
        },
      },
    );
    console.log(
      `   ✅ Updated ${result6.modifiedCount} buyers with location restrictions`,
    );

    // Migration 7: Add webhook configuration
    console.log("7️⃣  Adding webhook configuration...");
    const result7 = await buyersCollection.updateMany(
      { webhookConfig: { $exists: false } },
      {
        $set: {
          webhookConfig: {
            enabled: false,
            url: "",
            authToken: "",
          },
        },
      },
    );
    console.log(
      `   ✅ Updated ${result7.modifiedCount} buyers with webhook config`,
    );

    // Migration 8: Add weekend notification preference
    console.log("8️⃣  Adding weekend notification preference...");
    const result8 = await buyersCollection.updateMany(
      { notifyOnWeekends: { $exists: false } },
      {
        $set: {
          notifyOnWeekends: true, // Default to accepting weekend leads
        },
      },
    );
    console.log(
      `   ✅ Updated ${result8.modifiedCount} buyers with weekend preference`,
    );

    // Migration 9: Remove old industry field (optional cleanup)
    console.log("9️⃣  Cleaning up old industry field...");
    const result9 = await buyersCollection.updateMany(
      { "leadPreferences.industry": { $exists: true } },
      {
        $unset: { "leadPreferences.industry": "" },
      },
    );
    console.log(
      `   ✅ Removed old industry field from ${result9.modifiedCount} buyers`,
    );

    console.log("\n✅ Migration completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - Total buyers processed: ${totalBuyers}`);
    console.log(`   - Industries array: ${result1.modifiedCount}`);
    console.log(`   - Industry filters: ${result2.modifiedCount}`);
    console.log(`   - Vacation mode: ${result2.modifiedCount}`);
    console.log(`   - Budget tracking: ${result3.modifiedCount}`);
    console.log(`   - Concurrent limits: ${result5.modifiedCount}`);
    console.log(`   - Location restrictions: ${result6.modifiedCount}`);
    console.log(`   - Webhook config: ${result7.modifiedCount}`);
    console.log(`   - Weekend preference: ${result8.modifiedCount}`);
    console.log(`   - Old field cleanup: ${result9.modifiedCount}`);

    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateBuyerFields();
