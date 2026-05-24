import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { outreach } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
        // Keep as "sent" — delivery confirmed
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
        // Could extend schema with "bounced" status in the future
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
