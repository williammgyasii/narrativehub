"use client";

import { Sidebar, SidebarProvider, MobileMenuButton, useSidebar } from "@/components/sidebar";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <MobileMenuButton />
      <main
        className="flex-1 min-w-0 transition-all duration-300 md:ml-64"
        style={{ marginLeft: undefined }}
      >
        <div className="px-3 py-4 pt-16 sm:px-4 sm:py-6 md:px-6 md:py-8 md:pt-8">{children}</div>
      </main>
      <style>{`
        @media (min-width: 768px) {
          main { margin-left: ${collapsed ? "4rem" : "16rem"} !important; }
        }
      `}</style>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
