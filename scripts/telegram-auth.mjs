import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

const apiId = Number(await ask("Enter your API ID: "));
const apiHash = await ask("Enter your API Hash: ");

const session = new StringSession("");
const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 5,
});

await client.start({
  phoneNumber: async () => await ask("Enter your phone number: "),
  password: async () => await ask("Enter your 2FA password (or press Enter): "),
  phoneCode: async () => await ask("Enter the code you received: "),
  onError: (err) => console.error("Auth error:", err),
});

console.log("\n=== SUCCESS ===");
console.log("Your session string (add to .env.local as TELEGRAM_SESSION):\n");
console.log(client.session.save());

await client.sendMessage("me", {
  message: "<b>NarrativeHub connected!</b>\nYou will receive email reply notifications here.",
  parseMode: "html",
});

console.log("\nTest message sent to your Saved Messages.");
rl.close();
process.exit(0);
