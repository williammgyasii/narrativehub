"use client";

import { createContext, useContext, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Search,
  CalendarDays,
  Camera,
  Mail,
  DollarSign,
  MessageSquare,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth/client";
import { UserButton } from "@neondatabase/auth-ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: Users },
  { label: "Lead Finder", href: "/lead-finder", icon: Search },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Gear", href: "/gear", icon: Camera },
  { label: "Reddit", href: "/reddit", icon: MessageSquare },
  { label: "Outreach", href: "/outreach", icon: Mail },
  { label: "Finances", href: "/finances", icon: DollarSign },
  { label: "Settings", href: "/settings", icon: Settings },
];

const SidebarContext = createContext<{
  collapsed: boolean;
  toggle: () => void;
}>({ collapsed: false, toggle: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/6 bg-[#0d0d0d] transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo + collapse toggle */}
        <div className="flex h-16 items-center justify-between px-3">
          <div className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/10">
              <Camera className="h-4 w-4 text-gold" />
            </div>
            {!collapsed && (
              <span className="font-heading text-xl font-bold tracking-tight text-white">
                Unscripted
              </span>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={toggle}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="flex justify-center py-1">
            <button
              onClick={toggle}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            const link = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center rounded-lg text-sm font-medium transition-all",
                  collapsed
                    ? "justify-center p-2.5"
                    : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-gold/10 text-gold"
                    : "text-zinc-400 hover:bg-white/4 hover:text-zinc-200"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 h-6 w-[3px] rounded-r-full bg-gold" />
                )}
                <item.icon
                  className={cn(
                    "h-4.5 w-4.5 shrink-0",
                    isActive ? "text-gold" : "text-zinc-500 group-hover:text-zinc-400"
                  )}
                />
                {!collapsed && item.label}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" className="bg-surface-hover text-zinc-200 border-white/10">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-white/6 p-3">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <UserButton size="icon" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-surface-hover text-zinc-200 border-white/10">
                My Account
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3">
              <UserButton size="icon" />
              <div className="flex-1 min-w-0">
                <Link
                  href="/account/settings"
                  className="truncate text-sm font-medium text-zinc-200 hover:text-white"
                >
                  My Account
                </Link>
                <button
                  onClick={() => authClient.signOut()}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <LogOut className="h-3 w-3" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
