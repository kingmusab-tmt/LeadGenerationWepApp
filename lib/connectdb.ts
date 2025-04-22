import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

let isConnected = false;

const dbConnect = async () => {
  mongoose.set("strictQuery", true);
  if (isConnected) {
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: "Leadgeneration",
    });
    isConnected = true;
  } catch (error) {
    throw error;
  }
};
export default dbConnect;
