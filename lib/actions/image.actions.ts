"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../database/mongoose";
import { handleError } from "../utils";
import User from "../database/models/user.model";
import Image from "../database/models/image.model";
import { redirect } from "next/navigation";

import { v2 as cloudinary } from "cloudinary";

// Helper function to add timeout to database operations
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
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

const populateUser = (query: any) =>
  query.populate({
    path: "author",
    model: User,
    select: "_id firstName lastName clerkId",
  });

// ADD IMAGE
export async function addImage({ image, userId, path }: AddImageParams) {
  try {
    await withTimeout(connectToDatabase(), 20000);
    const author = await withTimeout(User.findById(userId), 15000);
    if (!author) {
      throw new Error("User not found");
    }
    const newImage = await withTimeout(
      Image.create({
        ...image,
        author: author._id,
      }),
      15000
    );
    revalidatePath(path);
    return JSON.parse(JSON.stringify(newImage));
  } catch (error) {
    handleError(error);
  }
}

// UPDATE IMAGE
export async function updateImage({ image, userId, path }: UpdateImageParams) {
  try {
    await withTimeout(connectToDatabase(), 20000);
    const imageToUpdate = await withTimeout(Image.findById(image._id), 15000);
    if (!imageToUpdate || imageToUpdate.author.toHexString() !== userId) {
      throw new Error("Unauthorized or image not found");
    }
    const updatedImage = await withTimeout(
      Image.findByIdAndUpdate(imageToUpdate._id, image, { new: true }),
      15000
    );
    revalidatePath(path);
    return JSON.parse(JSON.stringify(updatedImage));
  } catch (error) {
    handleError(error);
  }
}

// DELETE IMAGE
export async function deleteImage(imageId: string) {
  try {
    await withTimeout(connectToDatabase(), 10000);
    const imageToDelete = await withTimeout(Image.findById(imageId), 8000);
    if (!imageToDelete) throw new Error("Image not found");
    const deletedImage = await withTimeout(
      Image.findByIdAndDelete(imageId),
      8000
    );
    revalidatePath("/");
    return deletedImage ? JSON.parse(JSON.stringify(deletedImage)) : null;
  } catch (error) {
    handleError(error);
  }
}

// GET IMAGE
export async function getImageById(imageId: string) {
  try {
    await withTimeout(connectToDatabase(), 10000);
    const image = await withTimeout(
      populateUser(Image.findById(imageId)),
      8000
    );
    if (!image) throw new Error("Image not found");
    return JSON.parse(JSON.stringify(image));
  } catch (error) {
    handleError(error);
  }
}

// GET IMAGES
export async function getAllImages({
  limit = 9,
  page = 1,
  searchQuery = "",
}: {
  limit?: number;
  page: number;
  searchQuery?: string;
}) {
  try {
    await withTimeout(connectToDatabase(), 10000);

    let query = {};
    let resourceIds: string[] = [];

    // Only search Cloudinary if there's a search query
    if (searchQuery) {
      cloudinary.config({
        cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });

      const expression = `folder=imaginify AND ${searchQuery}`;
      const { resources } = await withTimeout(
        cloudinary.search.expression(expression).execute(),
        8000
      );

      resourceIds = resources.map((resource: any) => resource.public_id);
      query = {
        publicId: {
          $in: resourceIds,
        },
      };
    }

    const skipAmount = (Number(page) - 1) * limit;

    // Execute queries in parallel for better performance
    const [images, totalImages, savedImages] = await Promise.all([
      withTimeout(
        populateUser(Image.find(query))
          .sort({ updatedAt: -1 })
          .skip(skipAmount)
          .limit(limit),
        8000
      ),
      withTimeout(Image.find(query).countDocuments(), 5000),
      withTimeout(Image.find().countDocuments(), 5000),
    ]);

    return {
      data: JSON.parse(JSON.stringify(images)),
      totalPage: Math.ceil(totalImages / limit),
      savedImages,
    };
  } catch (error) {
    handleError(error);
  }
}

// GET IMAGES BY USER
export async function getUserImages({
  limit = 9,
  page = 1,
  userId,
}: {
  limit?: number;
  page: number;
  userId: string;
}) {
  try {
    await withTimeout(connectToDatabase(), 10000);
    const skipAmount = (Number(page) - 1) * limit;

    // Execute queries in parallel for better performance
    const [images, totalImages] = await Promise.all([
      withTimeout(
        populateUser(Image.find({ author: userId }))
          .sort({ updatedAt: -1 })
          .skip(skipAmount)
          .limit(limit),
        8000
      ),
      withTimeout(Image.find({ author: userId }).countDocuments(), 5000),
    ]);

    return {
      data: JSON.parse(JSON.stringify(images)),
      totalPages: Math.ceil(totalImages / limit),
    };
  } catch (error) {
    handleError(error);
  }
}
