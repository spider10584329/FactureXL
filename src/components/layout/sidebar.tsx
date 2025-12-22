"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCog,
  FolderOpen,
  FileX,
  FileCheck,
  CalendarClock,
  Percent,
  Info,
  Building,
  Banknote,
  Shield,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { useMemo } from "react";
import { useLanguage, TranslationKey } from "@/lib/i18n";
import { LucideIcon } from "lucide-react";

type NavItem = {
  key: TranslationKey;
  href: string;
  icon: LucideIcon;
};

// Navigation items matching Angular role-based structure
const getNavigationByRole = (role: Role | undefined): NavItem[] => {
  if (!role) return [];

  // SUPER_ADMIN Role - only companies and dashboard
  if (role === "SUPER_ADMIN") {
    return [
      { key: "dashboard", href: "/", icon: LayoutDashboard },
      { key: "companies", href: "/companies", icon: Building },
    ];
  }

  // OWNER Role - full access
  if (role === "OWNER") {
    return [
      { key: "dashboard", href: "/", icon: LayoutDashboard },
      { key: "clients", href: "/clients", icon: Users },
      { key: "employees", href: "/employees", icon: UserCog },
      { key: "users", href: "/users", icon: Shield },
      { key: "invoices", href: "/invoices", icon: FileText },
      { key: "credits", href: "/avoirs", icon: FileX },
      { key: "quotes", href: "/devis", icon: FileCheck },
      // { key: "transfers", href: "/transfers", icon: Banknote },
      { key: "subscriptionInvoices", href: "/subscription-invoices", icon: CalendarClock },
      // { key: "taxes", href: "/taxes", icon: Percent },
      // { key: "information", href: "/company", icon: Info },
    ];
  }

  // CLIENT Role - limited access
  if (role === "CLIENT") {
    return [
      { key: "dashboard", href: "/", icon: LayoutDashboard },
      { key: "invoices", href: "/invoices", icon: FileText },
      { key: "information", href: "/profile", icon: Info },
    ];
  }

  // ADMIN Role - extended access with transfers
  if (role === "ADMIN") {
    return [
      { key: "dashboard", href: "/", icon: LayoutDashboard },
      { key: "clients", href: "/clients", icon: Users },
      { key: "employees", href: "/employees", icon: UserCog },
      { key: "invoices", href: "/invoices", icon: FileText },
      { key: "credits", href: "/avoirs", icon: FileX },
      { key: "quotes", href: "/devis", icon: FileCheck },
      // { key: "transfers", href: "/transfers", icon: Banknote },
      // { key: "taxes", href: "/taxes", icon: Percent },
      // { key: "information", href: "/profile", icon: Info },
    ];
  }

  // MANAGER, EMPLOYEE - invoices, credits, and info
  return [
    { key: "invoices", href: "/invoices", icon: FileText },
    { key: "credits", href: "/avoirs", icon: FileX },
    { key: "quotes", href: "/devis", icon: FileCheck },
    { key: "information", href: "/profile", icon: Info },
  ];
};

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();

  // Get navigation items based on user role
  const navigation = useMemo(() => {
    return getNavigationByRole(session?.user?.role);
  }, [session?.user?.role]);

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo - matching Angular style */}
      <div className="flex h-20 items-center justify-center border-b border-gray-200 bg-[#f3f6f9]">
        <div className="flex items-center gap-2">
          <Image
            src="/facturexl_log.png"
            alt="FactureXL Logo"
            width={160}
            height={40}
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Navigation - matching Angular style with padding */}
      <nav className="flex-1 space-y-1 px-3 py-10 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "group flex items-center px-6 py-3 text-sm font-medium rounded-lg transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-gray-50 hover:text-primary"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                )}
              />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
