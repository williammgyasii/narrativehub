"use server";

import { getAuthUser } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  eventType: z.string().optional(),
  eventDate: z.string().min(1, "Date is required"),
  location: z.string().optional().or(z.literal("")),
  packagePrice: z.string().optional().default("0"),
  leadId: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export async function createEvent(formData: FormData) {
  const userId = await getAuthUser();

  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    eventType: formData.get("eventType"),
    eventDate: formData.get("eventDate"),
    location: formData.get("location"),
    packagePrice: formData.get("packagePrice"),
    leadId: formData.get("leadId"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const priceInCents = Math.round(
    parseFloat(parsed.data.packagePrice || "0") * 100
  );

  const [event] = await db
    .insert(events)
    .values({
      userId,
      title: parsed.data.title,
      eventType: parsed.data.eventType || null,
      eventDate: new Date(parsed.data.eventDate),
      location: parsed.data.location || null,
      packagePrice: priceInCents,
      leadId: parsed.data.leadId || null,
      notes: parsed.data.notes || null,
    })
    .returning();

  revalidatePath("/events");
  revalidatePath("/");
  redirect(`/events/${event.id}`);
}

export async function updateEvent(id: string, formData: FormData) {
  const userId = await getAuthUser();

  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    eventType: formData.get("eventType"),
    eventDate: formData.get("eventDate"),
    location: formData.get("location"),
    packagePrice: formData.get("packagePrice"),
    leadId: formData.get("leadId"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const priceInCents = Math.round(
    parseFloat(parsed.data.packagePrice || "0") * 100
  );

  await db
    .update(events)
    .set({
      title: parsed.data.title,
      eventType: parsed.data.eventType || null,
      eventDate: new Date(parsed.data.eventDate),
      location: parsed.data.location || null,
      packagePrice: priceInCents,
      leadId: parsed.data.leadId || null,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    })
    .where(and(eq(events.id, id), eq(events.userId, userId)));

  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  revalidatePath("/");
}

export async function updatePaymentStatus(
  id: string,
  status: "unpaid" | "deposit" | "paid"
) {
  const userId = await getAuthUser();

  await db
    .update(events)
    .set({ paymentStatus: status, updatedAt: new Date() })
    .where(and(eq(events.id, id), eq(events.userId, userId)));

  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  revalidatePath("/");
  revalidatePath("/finances");
}

export async function updateGearChecklist(
  id: string,
  checklist: { item: string; checked: boolean; rentalCost?: number; gearItemId?: string }[]
) {
  const userId = await getAuthUser();

  await db
    .update(events)
    .set({ gearChecklist: checklist, updatedAt: new Date() })
    .where(and(eq(events.id, id), eq(events.userId, userId)));

  revalidatePath(`/events/${id}`);
}

export async function updateEventDescription(id: string, description: string) {
  const userId = await getAuthUser();
  await db
    .update(events)
    .set({ description, updatedAt: new Date() })
    .where(and(eq(events.id, id), eq(events.userId, userId)));
  revalidatePath(`/events/${id}`);
}

export async function updateClientRequests(id: string, clientRequests: string) {
  const userId = await getAuthUser();
  await db
    .update(events)
    .set({ clientRequests, updatedAt: new Date() })
    .where(and(eq(events.id, id), eq(events.userId, userId)));
  revalidatePath(`/events/${id}`);
}

export async function updateMoodboard(
  id: string,
  moodboard: { type: "image" | "url" | "note"; content: string; caption?: string }[]
) {
  const userId = await getAuthUser();
  await db
    .update(events)
    .set({ moodboard, updatedAt: new Date() })
    .where(and(eq(events.id, id), eq(events.userId, userId)));
  revalidatePath(`/events/${id}`);
}

export async function updatePaymentLog(
  id: string,
  paymentLog: { date: string; label: string; amount?: number }[]
) {
  const userId = await getAuthUser();
  await db
    .update(events)
    .set({ paymentLog, updatedAt: new Date() })
    .where(and(eq(events.id, id), eq(events.userId, userId)));
  revalidatePath(`/events/${id}`);
}

export async function deleteEvent(id: string) {
  const userId = await getAuthUser();

  await db
    .delete(events)
    .where(and(eq(events.id, id), eq(events.userId, userId)));

  revalidatePath("/events");
  revalidatePath("/");
  redirect("/events");
}
