import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { outreach, leads, inboundEmails } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  parseOutreachIdFromAddress,
  getReceivedEmail,
} from "@/lib/resend";
import {
  sendTelegramNotification,
  formatInboundNotification,
} from "@/lib/telegram";

const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

interface ResendWebhookPayload {
  type: string;
  data: {
    email_id: string;
    created_at: string;
    to: string[];
    from: string;
    subject: string;
  };
}

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  let payload: ResendWebhookPayload;

  try {
    const wh = new Webhook(webhookSecret);
    payload = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendWebhookPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  const { type, data } = payload;
  const resendId = data.email_id;

  if (!resendId) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (type) {
      case "email.delivered":
        break;

      case "email.opened":
        await db
          .update(outreach)
          .set({ status: "opened" })
          .where(eq(outreach.resendId, resendId));
        break;

      case "email.clicked":
        await db
          .update(outreach)
          .set({ status: "opened" })
          .where(eq(outreach.resendId, resendId));
        break;

      case "email.bounced":
      case "email.complained":
        break;

      case "email.received":
        await handleInboundEmail(data);
        break;
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

async function handleInboundEmail(data: ResendWebhookPayload["data"]) {
  const senderEmail = data.from;
  const toAddresses = data.to || [];

  let matchedOutreachId: string | null = null;
  for (const addr of toAddresses) {
    matchedOutreachId = parseOutreachIdFromAddress(addr);
    if (matchedOutreachId) break;
  }

  let matchedOutreach = null;
  let matchedLead = null;

  if (matchedOutreachId) {
    const [row] = await db
      .select()
      .from(outreach)
      .where(eq(outreach.id, matchedOutreachId));
    if (row) {
      matchedOutreach = row;
      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, row.leadId));
      matchedLead = lead || null;
    }
  }

  if (!matchedLead) {
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.email, senderEmail));
    if (lead) {
      matchedLead = lead;
      if (!matchedOutreach) {
        const [latestOutreach] = await db
          .select()
          .from(outreach)
          .where(
            and(
              eq(outreach.leadId, lead.id),
              eq(outreach.status, "sent")
            )
          )
          .orderBy(desc(outreach.sentAt))
          .limit(1);
        matchedOutreach = latestOutreach || null;
      }
    }
  }

  let emailBody: string | null = null;
  try {
    const content = await getReceivedEmail(data.email_id);
    emailBody = content.html || content.text || null;
  } catch {
    // Body fetch can fail — store what we have from the webhook
  }

  await db.insert(inboundEmails).values({
    userId: matchedOutreach?.userId || matchedLead?.userId || "unknown",
    leadId: matchedLead?.id || null,
    outreachId: matchedOutreach?.id || null,
    resendEmailId: data.email_id,
    from: senderEmail,
    to: toAddresses.join(", "),
    subject: data.subject || null,
    body: emailBody,
    receivedAt: new Date(data.created_at),
  });

  if (matchedOutreach) {
    await db
      .update(outreach)
      .set({ status: "replied" })
      .where(eq(outreach.id, matchedOutreach.id));
  }

  if (matchedLead) {
    const shouldUpdate =
      matchedLead.status === "new" || matchedLead.status === "contacted";
    if (shouldUpdate) {
      await db
        .update(leads)
        .set({ status: "responded", updatedAt: new Date() })
        .where(eq(leads.id, matchedLead.id));
    }
  }

  await sendTelegramNotification(
    formatInboundNotification({
      from: senderEmail,
      subject: data.subject || null,
      leadName: matchedLead?.name || null,
      preview: emailBody,
    })
  );
}
