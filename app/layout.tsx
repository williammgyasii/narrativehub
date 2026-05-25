import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { authClient } from "@/lib/auth/client";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "NarrativeHub — Photography Business OS",
  description:
    "Lead discovery, pipeline management, and business tracking for solo photographers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <NeonAuthUIProvider authClient={authClient} emailOTP>
          {children}
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "#111111",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f4f4f5",
              },
            }}
          />
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}
