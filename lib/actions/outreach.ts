"use server";

import { getAuthUser } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { outreach, outreachTemplates, leads } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { sendEmail } from "@/lib/resend";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  leadType: z.enum(["wedding", "corporate", "real_estate", "architectural"]),
});

export async function createTemplate(formData: FormData) {
  const userId = await getAuthUser();

  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    leadType: formData.get("leadType"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await db.insert(outreachTemplates).values({
    userId,
    ...parsed.data,
  });

  revalidatePath("/outreach/templates");
}

export async function updateTemplate(id: string, formData: FormData) {
  const userId = await getAuthUser();

  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    leadType: formData.get("leadType"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await db
    .update(outreachTemplates)
    .set(parsed.data)
    .where(
      and(eq(outreachTemplates.id, id), eq(outreachTemplates.userId, userId))
    );

  revalidatePath("/outreach/templates");
}

export async function deleteTemplate(id: string) {
  const userId = await getAuthUser();

  await db
    .delete(outreachTemplates)
    .where(
      and(eq(outreachTemplates.id, id), eq(outreachTemplates.userId, userId))
    );

  revalidatePath("/outreach/templates");
}

export async function sendOutreach(formData: FormData) {
  const userId = await getAuthUser();

  const leadId = formData.get("leadId") as string;
  const subject = formData.get("subject") as string;
  const body = formData.get("body") as string;
  const templateId = (formData.get("templateId") as string) || null;

  if (!leadId || !subject || !body) {
    return { error: "Lead, subject, and body are required" };
  }

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.userId, userId)));

  if (!lead) return { error: "Lead not found" };
  if (!lead.email) return { error: "Lead has no email address" };

  try {
    const { id: resendId } = await sendEmail({
      to: lead.email,
      subject,
      body,
    });

    await db.insert(outreach).values({
      userId,
      leadId,
      templateId,
      subject,
      body,
      sentAt: new Date(),
      status: "sent",
      resendId: resendId || null,
    });

    await db
      .update(leads)
      .set({
        status: lead.status === "new" ? "contacted" : lead.status,
        lastContactedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    revalidatePath("/outreach");
    revalidatePath("/leads");
    revalidatePath("/");
    redirect("/outreach");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email";
    return { error: message };
  }
}

export async function sendOutreachDirect(data: {
  leadId: string;
  subject: string;
  body: string;
  templateId?: string;
}): Promise<{ success?: boolean; error?: string }> {
  const userId = await getAuthUser();

  if (!data.leadId || !data.subject || !data.body) {
    return { error: "Lead, subject, and body are required" };
  }

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, data.leadId), eq(leads.userId, userId)));

  if (!lead) return { error: "Lead not found" };
  if (!lead.email) return { error: "Lead has no email address" };

  try {
    const { id: resendId } = await sendEmail({
      to: lead.email,
      subject: data.subject,
      body: data.body,
    });

    await db.insert(outreach).values({
      userId,
      leadId: data.leadId,
      templateId: data.templateId || null,
      subject: data.subject,
      body: data.body,
      sentAt: new Date(),
      status: "sent",
      resendId: resendId || null,
    });

    await db
      .update(leads)
      .set({
        status: lead.status === "new" ? "contacted" : lead.status,
        lastContactedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, data.leadId));

    revalidatePath("/outreach");
    revalidatePath("/leads");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email";
    return { error: message };
  }
}

export async function saveDraft(data: {
  leadId: string;
  subject: string;
  body: string;
  templateId?: string;
  draftId?: string;
}): Promise<{ success?: boolean; draftId?: string; error?: string }> {
  const userId = await getAuthUser();

  if (!data.leadId || !data.subject || !data.body) {
    return { error: "Lead, subject, and body are required" };
  }

  if (data.draftId) {
    await db
      .update(outreach)
      .set({
        leadId: data.leadId,
        subject: data.subject,
        body: data.body,
        templateId: data.templateId || null,
      })
      .where(
        and(
          eq(outreach.id, data.draftId),
          eq(outreach.userId, userId),
          eq(outreach.status, "draft")
        )
      );

    revalidatePath("/outreach");
    return { success: true, draftId: data.draftId };
  }

  const [draft] = await db
    .insert(outreach)
    .values({
      userId,
      leadId: data.leadId,
      templateId: data.templateId || null,
      subject: data.subject,
      body: data.body,
      status: "draft",
    })
    .returning();

  revalidatePath("/outreach");
  return { success: true, draftId: draft.id };
}

export async function sendDraft(
  draftId: string
): Promise<{ success?: boolean; error?: string }> {
  const userId = await getAuthUser();

  const [draft] = await db
    .select()
    .from(outreach)
    .where(
      and(
        eq(outreach.id, draftId),
        eq(outreach.userId, userId),
        eq(outreach.status, "draft")
      )
    );

  if (!draft) return { error: "Draft not found" };

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, draft.leadId), eq(leads.userId, userId)));

  if (!lead) return { error: "Lead not found" };
  if (!lead.email) return { error: "Lead has no email address" };

  try {
    const { id: resendId } = await sendEmail({
      to: lead.email,
      subject: draft.subject,
      body: draft.body,
    });

    await db
      .update(outreach)
      .set({
        sentAt: new Date(),
        status: "sent",
        resendId: resendId || null,
      })
      .where(eq(outreach.id, draftId));

    await db
      .update(leads)
      .set({
        status: lead.status === "new" ? "contacted" : lead.status,
        lastContactedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, lead.id));

    revalidatePath("/outreach");
    revalidatePath("/leads");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email";
    return { error: message };
  }
}

export async function deleteDraft(
  draftId: string
): Promise<{ success?: boolean; error?: string }> {
  const userId = await getAuthUser();

  await db
    .delete(outreach)
    .where(
      and(
        eq(outreach.id, draftId),
        eq(outreach.userId, userId),
        eq(outreach.status, "draft")
      )
    );

  revalidatePath("/outreach");
  return { success: true };
}

function mergeTemplate(
  template: string,
  lead: { name: string; businessName: string | null; leadType: string; email: string | null }
): string {
  return template
    .replace(/\{\{name\}\}/g, lead.name)
    .replace(/\{\{business\}\}/g, lead.businessName || "your company")
    .replace(/\{\{lead_type\}\}/g, lead.leadType.replace("_", " "))
    .replace(/\{\{email\}\}/g, lead.email || "");
}

export async function sendBulkOutreach(data: {
  leadIds: string[];
  subjectTemplate: string;
  bodyTemplate: string;
  templateId?: string;
}): Promise<{ sent: number; failed: number; errors: string[] }> {
  const userId = await getAuthUser();

  const selectedLeads = await db
    .select()
    .from(leads)
    .where(and(eq(leads.userId, userId), inArray(leads.id, data.leadIds)));

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const lead of selectedLeads) {
    if (!lead.email) {
      failed++;
      errors.push(`${lead.name}: No email address`);
      continue;
    }

    const subject = mergeTemplate(data.subjectTemplate, lead);
    const body = mergeTemplate(data.bodyTemplate, lead);

    try {
      const { id: resendId } = await sendEmail({
        to: lead.email,
        subject,
        body,
      });

      await db.insert(outreach).values({
        userId,
        leadId: lead.id,
        templateId: data.templateId || null,
        subject,
        body,
        sentAt: new Date(),
        status: "sent",
        resendId: resendId || null,
      });

      await db
        .update(leads)
        .set({
          status: lead.status === "new" ? "contacted" : lead.status,
          lastContactedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(leads.id, lead.id));

      sent++;

      // Throttle 200ms between sends for rate limits
      await new Promise((r) => setTimeout(r, 200));
    } catch (error) {
      failed++;
      errors.push(
        `${lead.name}: ${error instanceof Error ? error.message : "Send failed"}`
      );
    }
  }

  revalidatePath("/outreach");
  revalidatePath("/leads");
  revalidatePath("/");

  return { sent, failed, errors };
}

export async function deleteOutreachEntry(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  const userId = await getAuthUser();

  await db
    .delete(outreach)
    .where(and(eq(outreach.id, id), eq(outreach.userId, userId)));

  revalidatePath("/outreach");
  return { success: true };
}
