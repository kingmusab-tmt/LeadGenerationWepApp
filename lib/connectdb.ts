import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_FALLBACK_URI = process.env.MONGODB_FALLBACK_URI;

if (!MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Cache connection in globalThis to survive HMR / serverless cold starts
const globalWithMongo = globalThis as typeof globalThis & {
  _mongooseCache?: MongooseCache;
};

const mongooseCache =
  globalWithMongo._mongooseCache ||
  (globalWithMongo._mongooseCache = { conn: null, promise: null });

function isSrvLookupError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorCode =
    "code" in error && typeof error.code === "string"
      ? error.code.toLowerCase()
      : "";
  const message = error.message.toLowerCase();

  return (
    message.includes("querysrv") ||
    errorCode === "econnrefused" ||
    errorCode === "enotfound"
  );
}

function connectWithMongoose(uri: string) {
  return mongoose.connect(uri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    autoIndex: process.env.NODE_ENV !== "production",
  });
}

const dbConnect = async (): Promise<typeof mongoose> => {
  if (mongooseCache.conn) {
    return mongooseCache.conn;
  }

  if (mongoose.connection.readyState >= 1) {
    mongooseCache.conn = mongoose;
    return mongoose;
  }

  if (!mongooseCache.promise) {
    mongoose.set("strictQuery", true);

    mongooseCache.promise = connectWithMongoose(MONGODB_URI).catch(
      async (primaryError) => {
        if (MONGODB_FALLBACK_URI && isSrvLookupError(primaryError)) {
          console.warn(
            "[dbConnect] Primary Mongo SRV lookup failed. Retrying with MONGODB_FALLBACK_URI...",
          );
          return connectWithMongoose(MONGODB_FALLBACK_URI);
        }

        throw primaryError;
      },
    );
  }

  try {
    mongooseCache.conn = await mongooseCache.promise;
    return mongooseCache.conn;
  } catch (error) {
    mongooseCache.promise = null;
    throw error;
  }
};

export default dbConnect;
