// Script to drop the old conversationId index and rebuild with sparse option
// Run this with: node scripts/fix-conversationId-index.js

const mongoose = require("mongoose");

// Get MongoDB URI from command line argument or environment
const mongoUri = process.argv[2] || process.env.MONGODB_URI;

async function fixIndex() {
  try {
    if (!mongoUri) {
      console.error("❌ Error: MONGODB_URI not provided");
      console.log(
        '\nUsage: node scripts/fix-conversationId-index.js "your-mongodb-uri"',
      );
      console.log("Or set MONGODB_URI environment variable");
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Get the Lead collection
    const db = mongoose.connection.db;
    const collection = db.collection("leads");

    // Drop the old conversationId index
    try {
      await collection.dropIndex("conversationId_1");
      console.log("✓ Dropped old conversationId_1 index");
    } catch (error) {
      if (error.message.includes("index not found")) {
        console.log(
          "✓ Index conversationId_1 does not exist (already dropped or never created)",
        );
      } else {
        throw error;
      }
    }

    // Create new sparse unique index
    await collection.createIndex(
      { conversationId: 1 },
      { unique: true, sparse: true, name: "conversationId_1" },
    );
    console.log("✓ Created new sparse unique index on conversationId");

    console.log("\n✅ Index fix completed successfully!");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing index:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixIndex();
