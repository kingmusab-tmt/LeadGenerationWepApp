import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

// Cache connection in globalThis to survive HMR / serverless cold starts
const globalWithMongo = globalThis as typeof globalThis & {
  _mongooseConnection?: Promise<typeof mongoose>;
};

const dbConnect = async () => {
  // Already connected
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  // Reuse in-flight connection promise (prevents parallel connects)
  if (globalWithMongo._mongooseConnection) {
    await globalWithMongo._mongooseConnection;
    return;
  }

  mongoose.set("strictQuery", true);

  globalWithMongo._mongooseConnection = mongoose.connect(MONGODB_URI, {
    dbName: "Leadgeneration",
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  try {
    await globalWithMongo._mongooseConnection;
  } catch (error) {
    // Clear so a retry can reconnect
    globalWithMongo._mongooseConnection = undefined;
    throw error;
  }
};
export default dbConnect;
