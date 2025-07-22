import mongoose, { Mongoose } from "mongoose";

const MONGODB_URL = process.env.MONGODB_URL;

interface MongooseConnection {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

let cached: MongooseConnection = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = {
    conn: null,
    promise: null,
  };
}

export const connectToDatabase = async () => {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URL) throw new Error("Missing MONGODB_URL");

  cached.promise =
    cached.promise ||
    mongoose.connect(MONGODB_URL, {
      dbName: "imaginify",
      bufferCommands: false,
      maxPoolSize: 1, // Limit connection pool for serverless
      minPoolSize: 0, // Start with no connections
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 60000, // 60 second timeout
      connectTimeoutMS: 15000, // 15 second timeout
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      heartbeatFrequencyMS: 10000, // Check connection health every 10 seconds
      retryWrites: true, // Retry write operations
      retryReads: true, // Retry read operations
    });

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null; // Reset promise on error
    throw error;
  }
};
