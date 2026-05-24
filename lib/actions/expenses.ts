"use server";

import { getAuthUser } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const expenseSchema = z.object({
  category: z.enum([
    "gear_rental",
    "travel",
    "software",
    "insurance",
    "marketing",
    "other",
  ]),
  description: z.string().min(1),
  amount: z.string().min(1),
  date: z.string().min(1),
  eventId: z.string().optional().or(z.literal("")),
});

export async function addExpense(formData: FormData) {
  const userId = await getAuthUser();

  const parsed = expenseSchema.safeParse({
    category: formData.get("category"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    eventId: formData.get("eventId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const amountInCents = Math.round(parseFloat(parsed.data.amount) * 100);

  await db.insert(expenses).values({
    userId,
    category: parsed.data.category,
    description: parsed.data.description,
    amount: amountInCents,
    date: new Date(parsed.data.date),
    eventId: parsed.data.eventId || null,
  });

  revalidatePath("/finances");
  revalidatePath("/");
}

export async function deleteExpense(id: string) {
  const userId = await getAuthUser();

  await db
    .delete(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));

  revalidatePath("/finances");
}
