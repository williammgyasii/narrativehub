import { AlertTriangle, ExternalLink } from "lucide-react";

export function DomainSetupBanner() {
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const isTestMode = !fromEmail || fromEmail === "onboarding@resend.dev";

  if (!isTestMode) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-amber-300">
          Test Mode — Emails only send to your own email
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          You&apos;re using Resend&apos;s test sender (
          <code className="rounded bg-white/5 px-1 text-zinc-300">
            onboarding@resend.dev
          </code>
          ). To send real cold emails:
        </p>
        <ol className="mt-2 space-y-1 text-xs text-zinc-500">
          <li>
            1. Get a domain (e.g. storiesbykay.com)
          </li>
          <li>
            2.{" "}
            <a
              href="https://resend.com/domains"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-gold hover:underline"
            >
              Add & verify it in Resend
              <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>
            3. Set{" "}
            <code className="rounded bg-white/5 px-1 text-zinc-300">
              RESEND_FROM_EMAIL=hello@yourdomain.com
            </code>{" "}
            in{" "}
            <code className="rounded bg-white/5 px-1 text-zinc-300">
              .env.local
            </code>
          </li>
        </ol>
      </div>
    </div>
  );
}
