"use server";

import { redirect } from "next/navigation";
import Stripe from "stripe";
import { handleError } from "../utils";
import { connectToDatabase } from "../database/mongoose";
import Transaction from "../database/models/transaction.model";
import { updateCredits } from "./user.actions";

// Helper function to add timeout to database operations
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 15000
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

export async function checkoutCredits(transaction: CheckoutTransactionParams) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const amount = Number(transaction.amount) * 100;

  // Get the proper server URL for redirects
  const serverUrl =
    process.env.NEXT_PUBLIC_SERVER_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  // Ensure the URL has a proper scheme
  const finalServerUrl = serverUrl.startsWith("http")
    ? serverUrl
    : `https://${serverUrl}`;

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: {
            name: transaction.plan,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      plan: transaction.plan,
      credits: transaction.credits,
      buyerId: transaction.buyerId,
    },
    mode: "payment",
    success_url: `${finalServerUrl}/profile`,
    cancel_url: `${finalServerUrl}/`,
  });

  redirect(session.url!);
}

export async function createTransaction(transaction: CreateTransactionParams) {
  try {
    await withTimeout(connectToDatabase(), 10000);
    // Create a new transaction with a buyerId
    const newTransaction = await withTimeout(
      Transaction.create({
        ...transaction,
        buyer: transaction.buyerId,
      }),
      8000
    );
    await updateCredits(transaction.buyerId, transaction.credits);
    return JSON.parse(JSON.stringify(newTransaction));
  } catch (error) {
    handleError(error);
  }
}
