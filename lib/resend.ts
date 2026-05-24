import "server-only";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) {
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html: body.replace(/\n/g, "<br>"),
  });

  if (error) {
    throw new Error(error.message);
  }

  return { id: data?.id };
}
