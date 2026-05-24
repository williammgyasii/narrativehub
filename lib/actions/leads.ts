"use server";

import { getAuthUser } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";

const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  businessName: z.string().optional().or(z.literal("")),
  leadType: z.enum(["wedding", "corporate", "real_estate", "architectural"]),
  source: z.string().optional().default("manual"),
  notes: z.string().optional().or(z.literal("")),
});

export async function createLead(formData: FormData) {
  const userId = await getAuthUser();

  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    businessName: formData.get("businessName"),
    leadType: formData.get("leadType"),
    source: formData.get("source") || "manual",
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const [lead] = await db
    .insert(leads)
    .values({
      userId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      businessName: parsed.data.businessName || null,
      leadType: parsed.data.leadType,
      source: parsed.data.source,
      notes: parsed.data.notes || null,
    })
    .returning();

  revalidatePath("/leads");
  revalidatePath("/");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(id: string, formData: FormData) {
  const userId = await getAuthUser();

  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    businessName: formData.get("businessName"),
    leadType: formData.get("leadType"),
    source: formData.get("source"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await db
    .update(leads)
    .set({
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      businessName: parsed.data.businessName || null,
      leadType: parsed.data.leadType,
      source: parsed.data.source,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    })
    .where(and(eq(leads.id, id), eq(leads.userId, userId)));

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/");
}

export async function updateLeadStatus(
  id: string,
  status: "new" | "contacted" | "responded" | "booked" | "closed"
) {
  const userId = await getAuthUser();

  await db
    .update(leads)
    .set({
      status,
      lastContactedAt:
        status === "contacted" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(leads.id, id), eq(leads.userId, userId)));

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/");
}

export async function deleteLead(id: string) {
  const userId = await getAuthUser();

  await db
    .delete(leads)
    .where(and(eq(leads.id, id), eq(leads.userId, userId)));

  revalidatePath("/leads");
  revalidatePath("/");
  redirect("/leads");
}

export async function bulkDeleteLeads(ids: string[]) {
  if (ids.length === 0) return;
  const userId = await getAuthUser();

  await db
    .delete(leads)
    .where(and(inArray(leads.id, ids), eq(leads.userId, userId)));

  revalidatePath("/leads");
  revalidatePath("/");
}

export async function bulkUpdateLeadStatus(
  ids: string[],
  status: "new" | "contacted" | "responded" | "booked" | "closed"
) {
  if (ids.length === 0) return;
  const userId = await getAuthUser();

  await db
    .update(leads)
    .set({ status, updatedAt: new Date() })
    .where(and(inArray(leads.id, ids), eq(leads.userId, userId)));

  revalidatePath("/leads");
  revalidatePath("/");
}
