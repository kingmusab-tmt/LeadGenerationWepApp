// This approach is taken from https://github.com/vercel/next.js/tree/canary/examples/with-mongodb
import { MongoClient, ServerApiVersion } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const fallbackUri = process.env.MONGODB_FALLBACK_URI;
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 10000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

type MongoGlobal = typeof globalThis & {
  _mongoClient?: MongoClient;
  _mongoClientPromise?: Promise<MongoClient>;
};

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

async function connectWithRetry(): Promise<MongoClient> {
  try {
    const primaryClient = new MongoClient(uri, options);
    await primaryClient.connect();
    return primaryClient;
  } catch (primaryError) {
    if (fallbackUri && isSrvLookupError(primaryError)) {
      console.warn(
        "[MongoClient] Primary Mongo SRV lookup failed. Retrying with MONGODB_FALLBACK_URI...",
      );
      const secondaryClient = new MongoClient(fallbackUri, options);
      await secondaryClient.connect();
      return secondaryClient;
    }

    throw primaryError;
  }
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as MongoGlobal;

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = connectWithRetry().then(
      (connectedClient) => {
        globalWithMongo._mongoClient = connectedClient;
        return connectedClient;
      },
    );
  }

  client = globalWithMongo._mongoClient || new MongoClient(uri, options);
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = connectWithRetry();
}

// Export a module-scoped MongoClient. By doing this in a
// separate module, the client can be shared across functions.
export { clientPromise };
export default client;
