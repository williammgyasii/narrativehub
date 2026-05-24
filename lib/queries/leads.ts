import "server-only";

import { getAuthUserOrNull } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Lead } from "@/lib/db/schema";

export async function getLeads(filters?: {
  status?: string;
  leadType?: string;
}): Promise<Lead[]> {
  const userId = await getAuthUserOrNull();
  if (!userId) return [];

  const conditions = [eq(leads.userId, userId)];

  if (filters?.status && filters.status !== "all") {
    conditions.push(
      eq(
        leads.status,
        filters.status as "new" | "contacted" | "responded" | "booked" | "closed"
      )
    );
  }

  if (filters?.leadType && filters.leadType !== "all") {
    conditions.push(
      eq(
        leads.leadType,
        filters.leadType as
          | "wedding"
          | "corporate"
          | "real_estate"
          | "architectural"
      )
    );
  }

  return db
    .select()
    .from(leads)
    .where(and(...conditions))
    .orderBy(desc(leads.createdAt));
}

export async function getLeadById(id: string): Promise<Lead | undefined> {
  const userId = await getAuthUserOrNull();
  if (!userId) return undefined;

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), eq(leads.userId, userId)));

  return lead;
}

export async function getRecentLeads(limit = 5): Promise<Lead[]> {
  const userId = await getAuthUserOrNull();
  if (!userId) return [];

  return db
    .select()
    .from(leads)
    .where(eq(leads.userId, userId))
    .orderBy(desc(leads.createdAt))
    .limit(limit);
}

export async function getLeadStats() {
  const userId = await getAuthUserOrNull();
  if (!userId) return { total: 0, byStatus: {}, byType: {} };

  const allLeads = await db
    .select()
    .from(leads)
    .where(eq(leads.userId, userId));

  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const lead of allLeads) {
    byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
    byType[lead.leadType] = (byType[lead.leadType] || 0) + 1;
  }

  return { total: allLeads.length, byStatus, byType };
}
