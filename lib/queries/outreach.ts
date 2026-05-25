import "server-only";

import { getAuthUserOrNull } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
  outreach,
  outreachTemplates,
  leads,
  inboundEmails,
} from "@/lib/db/schema";
import { eq, and, desc, lt, asc } from "drizzle-orm";

export async function getOutreachLog() {
  const userId = await getAuthUserOrNull();
  if (!userId) return [];

  return db
    .select({
      outreach: outreach,
      leadName: leads.name,
      leadEmail: leads.email,
      leadBusiness: leads.businessName,
    })
    .from(outreach)
    .leftJoin(leads, eq(outreach.leadId, leads.id))
    .where(eq(outreach.userId, userId))
    .orderBy(desc(outreach.createdAt));
}

export async function getDrafts() {
  const userId = await getAuthUserOrNull();
  if (!userId) return [];

  return db
    .select({
      outreach: outreach,
      leadName: leads.name,
      leadEmail: leads.email,
      leadBusiness: leads.businessName,
    })
    .from(outreach)
    .leftJoin(leads, eq(outreach.leadId, leads.id))
    .where(and(eq(outreach.userId, userId), eq(outreach.status, "draft")))
    .orderBy(desc(outreach.createdAt));
}

export async function getTemplates() {
  const userId = await getAuthUserOrNull();
  if (!userId) return [];

  return db
    .select()
    .from(outreachTemplates)
    .where(eq(outreachTemplates.userId, userId))
    .orderBy(desc(outreachTemplates.createdAt));
}

export async function getTemplateById(id: string) {
  const userId = await getAuthUserOrNull();
  if (!userId) return undefined;

  const [template] = await db
    .select()
    .from(outreachTemplates)
    .where(
      and(eq(outreachTemplates.id, id), eq(outreachTemplates.userId, userId))
    );

  return template;
}

export async function getFollowUpReminders(daysThreshold = 5) {
  const userId = await getAuthUserOrNull();
  if (!userId) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysThreshold);

  const sentOutreach = await db
    .select({
      outreach: outreach,
      leadName: leads.name,
      leadEmail: leads.email,
      leadBusiness: leads.businessName,
      leadId: leads.id,
    })
    .from(outreach)
    .innerJoin(leads, eq(outreach.leadId, leads.id))
    .where(
      and(
        eq(outreach.userId, userId),
        eq(outreach.status, "sent"),
        lt(outreach.sentAt, cutoff)
      )
    )
    .orderBy(desc(outreach.sentAt));

  const leadLatest = new Map<
    string,
    (typeof sentOutreach)[0]
  >();
  for (const entry of sentOutreach) {
    if (!leadLatest.has(entry.leadId!)) {
      leadLatest.set(entry.leadId!, entry);
    }
  }

  return Array.from(leadLatest.values());
}

export async function getOutreachByLeadId(leadId: string) {
  const userId = await getAuthUserOrNull();
  if (!userId) return [];

  return db
    .select()
    .from(outreach)
    .where(and(eq(outreach.userId, userId), eq(outreach.leadId, leadId)))
    .orderBy(desc(outreach.createdAt));
}

export async function getOutreachStats() {
  const userId = await getAuthUserOrNull();
  if (!userId) return { total: 0, sent: 0, opened: 0, replied: 0, drafts: 0 };

  const all = await db
    .select({ status: outreach.status })
    .from(outreach)
    .where(eq(outreach.userId, userId));

  const stats = { total: all.length, sent: 0, opened: 0, replied: 0, drafts: 0 };
  for (const row of all) {
    if (row.status === "sent") stats.sent++;
    if (row.status === "opened") stats.opened++;
    if (row.status === "replied") stats.replied++;
    if (row.status === "draft") stats.drafts++;
  }

  return stats;
}

export async function getInboundByLeadId(leadId: string) {
  const userId = await getAuthUserOrNull();
  if (!userId) return [];

  return db
    .select()
    .from(inboundEmails)
    .where(
      and(eq(inboundEmails.userId, userId), eq(inboundEmails.leadId, leadId))
    )
    .orderBy(asc(inboundEmails.receivedAt));
}

export async function getInboundByOutreachId(outreachId: string) {
  const userId = await getAuthUserOrNull();
  if (!userId) return [];

  return db
    .select()
    .from(inboundEmails)
    .where(
      and(
        eq(inboundEmails.userId, userId),
        eq(inboundEmails.outreachId, outreachId)
      )
    )
    .orderBy(asc(inboundEmails.receivedAt));
}

export type ConversationMessage = {
  id: string;
  type: "sent" | "received";
  subject: string | null;
  body: string | null;
  date: Date;
  from: string;
  to: string;
};

export async function getConversationByLeadId(
  leadId: string
): Promise<ConversationMessage[]> {
  const userId = await getAuthUserOrNull();
  if (!userId) return [];

  const [sentEmails, receivedEmails] = await Promise.all([
    db
      .select()
      .from(outreach)
      .where(
        and(
          eq(outreach.userId, userId),
          eq(outreach.leadId, leadId),
          eq(outreach.status, "sent")
        )
      ),
    db
      .select()
      .from(inboundEmails)
      .where(
        and(
          eq(inboundEmails.userId, userId),
          eq(inboundEmails.leadId, leadId)
        )
      ),
  ]);

  const fromEmail = process.env.RESEND_FROM_EMAIL || "you";

  const messages: ConversationMessage[] = [
    ...sentEmails
      .filter((e) => e.sentAt)
      .map((e) => ({
        id: e.id,
        type: "sent" as const,
        subject: e.subject,
        body: e.body,
        date: e.sentAt!,
        from: fromEmail,
        to: "lead",
      })),
    ...receivedEmails.map((e) => ({
      id: e.id,
      type: "received" as const,
      subject: e.subject,
      body: e.body,
      date: e.receivedAt,
      from: e.from,
      to: e.to,
    })),
  ];

  messages.sort((a, b) => a.date.getTime() - b.date.getTime());
  return messages;
}
