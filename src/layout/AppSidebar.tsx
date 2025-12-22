"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useSession } from "next-auth/react";
import { useLanguage, TranslationKey } from "@/lib/i18n";
import { Role } from "@prisma/client";
import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  UserCircleIcon,
  ListIcon,
  TableIcon,
  BoxCubeIcon,
  FolderIcon,
  FileIcon,
  DollarLineIcon,
} from "@/icons";
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCog,
  FolderOpen,
  FileX,
  FileCheck,
  CalendarClock,
  Building,
  LucideIcon,
  X,
} from "lucide-react";
import logoImage from "@/logo/facturexl_log.png";

type NavItem = {
  name: string;
  nameKey?: TranslationKey;
  icon: React.ReactNode;
  path?: string;
  roles?: Role[];
  subItems?: { name: string; nameKey?: TranslationKey; path: string; roles?: Role[] }[];
};

// Get navigation items based on role
const getNavItems = (role: Role | undefined, t: (key: TranslationKey) => string): NavItem[] => {

  const allItems: NavItem[] = [
    {
      icon: <LayoutDashboard className="w-5 h-5" />,
      name: t("dashboard"),
      nameKey: "dashboard",
      path: "/",
      roles: ["SUPER_ADMIN", "OWNER", "ADMIN", "MANAGER", "EMPLOYEE", "CLIENT"],
    },
    {
      icon: <FileText className="w-5 h-5" />,
      name: t("invoices"),
      nameKey: "invoices",
      path: "/invoices",
      roles: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE", "CLIENT"],
    },
    {
      icon: <FileCheck className="w-5 h-5" />,
      name: t("quotes"),
      nameKey: "quotes",
      path: "/devis",
      roles: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    },
    {
      icon: <Users className="w-5 h-5" />,
      name: t("clients"),
      nameKey: "clients",
      path: "/clients",
      roles: ["OWNER", "ADMIN"],
    },
    {
      icon: <UserCog className="w-5 h-5" />,
      name: t("employees"),
      nameKey: "employees",
      path: "/employees",
      roles: ["OWNER", "ADMIN"],
    },
    {
      icon: <FileX className="w-5 h-5" />,
      name: t("credits"),
      nameKey: "credits",
      path: "/avoirs",
      roles: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    },
    {
      icon: <Building className="w-5 h-5" />,
      name: t("companies"),
      nameKey: "companies",
      path: "/companies",
      roles: ["SUPER_ADMIN"],
    },
    {
      icon: <CalendarClock className="w-5 h-5" />,
      name: t("subscriptionInvoices"),
      nameKey: "subscriptionInvoices",
      path: "/subscription-invoices",
      roles: ["OWNER", "ADMIN", "EMPLOYEE"],
    },
  ];

  if (!role) return [];
  return allItems.filter((item) => item.roles?.includes(role));
};

const getOthersItems = (role: Role | undefined, t: (key: TranslationKey) => string): NavItem[] => {
  if (!role) return [];

  const items: NavItem[] = [];

  // Profile for all roles
  items.push({
    icon: <UserCircleIcon />,
    name: t("myProfile"),
    nameKey: "myProfile",
    path: "/profile",
  });

  return items;
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();

  const navItems = getNavItems(session?.user?.role, t);
  const othersItems = getOthersItems(session?.user?.role, t);

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive, navItems, othersItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const renderMenuItems = (
    items: NavItem[],
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed flex flex-col top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Close button for mobile - Only shown when sidebar is open */}
      {isMobileOpen && (
        <button
          onClick={toggleMobileSidebar}
          className="absolute top-4 right-4 lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Logo - Hidden on mobile when sidebar is closed, always visible on desktop */}
      <div
        className={`py-8 hidden lg:flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/" className="flex items-center gap-2">
          {isExpanded || isHovered ? (
            <>
              <Image
                src={logoImage}
                alt="FactureXL Logo"
                width={80}
                height={40}
                className="object-contain"
              />
              <span className="text-xl font-semibold text-gray-900 dark:text-white">
                FactureXL
              </span>
            </>
          ) : (
            <Image
              src={logoImage}
              alt="FactureXL Logo"
              width={50}
              height={50}
              className="object-contain"
            />
          )}
        </Link>
      </div>

      {/* Logo for mobile - Only shown when sidebar is open */}
      {isMobileOpen && (
        <div className="py-8 flex lg:hidden justify-start">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={logoImage}
              alt="FactureXL Logo"
              width={80}
              height={40}
              className="object-contain"
            />
            <span className="text-xl font-semibold text-gray-900 dark:text-white">
              FactureXL
            </span>
          </Link>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {/* Main Menu */}
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>

            {/* Others Menu */}
            {othersItems.length > 0 && (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    t("others")
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                {renderMenuItems(othersItems, "others")}
              </div>
            )}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
