"use server";

import { revalidatePath } from "next/cache";

import User from "../database/models/user.model";
import { connectToDatabase } from "../database/mongoose";
import { handleError } from "../utils";

// Helper function to add timeout to database operations
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 8000
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Database operation timed out")),
        timeoutMs
      )
    ),
  ]);
};

// CREATE
export async function createUser(user: CreateUserParams): Promise<User> {
  try {
    await withTimeout(connectToDatabase(), 5000);
    const newUser = await withTimeout(User.create(user), 3000);
    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    handleError(error);
    throw error; // Re-throw after handling
  }
}

// READ
export async function getUserById(userId: string): Promise<User> {
  try {
    await withTimeout(connectToDatabase(), 5000);
    const user = await withTimeout(User.findOne({ clerkId: userId }), 3000);
    if (!user) throw new Error("User not found");
    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    handleError(error);
    throw error; // Re-throw after handling
  }
}

// UPDATE
export async function updateUser(
  clerkId: string,
  user: UpdateUserParams
): Promise<User> {
  try {
    await withTimeout(connectToDatabase(), 5000);
    const updatedUser = await withTimeout(
      User.findOneAndUpdate({ clerkId }, user, { new: true }),
      3000
    );
    if (!updatedUser) throw new Error("User update failed");
    return JSON.parse(JSON.stringify(updatedUser));
  } catch (error) {
    handleError(error);
    throw error; // Re-throw after handling
  }
}

// DELETE
export async function deleteUser(clerkId: string): Promise<User | null> {
  try {
    await withTimeout(connectToDatabase(), 5000);
    // Find user to delete
    const userToDelete = await withTimeout(User.findOne({ clerkId }), 3000);
    if (!userToDelete) {
      throw new Error("User not found");
    }
    // Delete user
    const deletedUser = await withTimeout(
      User.findByIdAndDelete(userToDelete._id),
      3000
    );
    revalidatePath("/");
    return deletedUser ? JSON.parse(JSON.stringify(deletedUser)) : null;
  } catch (error) {
    handleError(error);
    throw error; // Re-throw after handling
  }
}

// USE CREDITS
export async function updateCredits(
  userId: string,
  creditFee: number
): Promise<User> {
  try {
    await withTimeout(connectToDatabase(), 5000);
    const updatedUserCredits = await withTimeout(
      User.findOneAndUpdate(
        { _id: userId },
        { $inc: { creditBalance: creditFee } },
        { new: true }
      ),
      3000
    );
    if (!updatedUserCredits) throw new Error("User credits update failed");
    return JSON.parse(JSON.stringify(updatedUserCredits));
  } catch (error) {
    handleError(error);
    throw error; // Re-throw after handling
  }
}
