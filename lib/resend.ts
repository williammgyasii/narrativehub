import "server-only";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const RECEIVING_DOMAIN =
  process.env.RESEND_RECEIVING_DOMAIN || "narrativeproductions.org";

export function buildReplyToAddress(outreachId: string) {
  return `reply-${outreachId}@${RECEIVING_DOMAIN}`;
}

export function parseOutreachIdFromAddress(address: string): string | null {
  const match = address.match(/^reply-([0-9a-f-]{36})@/i);
  return match ? match[1] : null;
}

export async function sendEmail({
  to,
  subject,
  body,
  replyTo,
}: {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}) {
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html: body.replace(/\n/g, "<br>"),
    ...(replyTo && { replyTo }),
  });

  if (error) {
    throw new Error(error.message);
  }

  return { id: data?.id };
}

export async function getReceivedEmail(emailId: string) {
  const res = await fetch(
    `https://api.resend.com/emails/receiving/${emailId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch received email: ${err}`);
  }

  const data = await res.json();
  return {
    html: data.html as string | null,
    text: data.text as string | null,
  };
}
