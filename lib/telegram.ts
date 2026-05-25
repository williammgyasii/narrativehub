import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

let clientInstance: TelegramClient | null = null;

async function getClient(): Promise<TelegramClient | null> {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  const session = process.env.TELEGRAM_SESSION;

  if (!apiId || !apiHash || !session) return null;

  if (!clientInstance || !clientInstance.connected) {
    clientInstance = new TelegramClient(
      new StringSession(session),
      apiId,
      apiHash,
      { connectionRetries: 3 }
    );
    await clientInstance.connect();
  }

  return clientInstance;
}

export async function sendTelegramNotification(message: string) {
  try {
    const client = await getClient();
    if (!client) return;

    const channel = process.env.TELEGRAM_CHANNEL;
    const target = channel ? Number(channel) : "me";
    await client.sendMessage(target, { message, parseMode: "html" });
  } catch {
    // Don't let Telegram errors block the webhook
  }
}

export function formatInboundNotification({
  from,
  subject,
  leadName,
  preview,
}: {
  from: string;
  subject: string | null;
  leadName: string | null;
  preview: string | null;
}) {
  const lines = [
    `<b>📩 New Email Reply</b>`,
    ``,
    `<b>From:</b> ${escapeHtml(leadName ? `${leadName} (${from})` : from)}`,
    `<b>Subject:</b> ${escapeHtml(subject || "(No subject)")}`,
  ];

  if (preview) {
    const trimmed = preview.replace(/<[^>]+>/g, "").slice(0, 300).trim();
    if (trimmed) {
      lines.push(``, `<i>${escapeHtml(trimmed)}</i>`);
    }
  }

  lines.push(
    ``,
    `<a href="https://app.narrativeproductions.org/leads">Open NarrativeHub</a>`
  );

  return lines.join("\n");
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
