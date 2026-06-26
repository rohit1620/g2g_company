"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Plane, PlusCircle, Settings, LogOut } from "lucide-react";
import { clearToken } from "@/lib/api";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/leads/new", label: "Add lead", icon: PlusCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  function handleSignOut() {
    clearToken();
    router.push("/login");
  }

  return (
    <aside
   className="fixed left-0 top-0 flex h-screen w-60 flex-col border-r shrink-0 z-50"
      style={{ backgroundColor: "var(--primary)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-2 px-6 py-6">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: "var(--accent)" }}
        >
          <Plane size={18} color="#fff" />
        </div>
        <span className="text-[17px] font-medium text-white">Sasta Holiday CRM</span>
      </div>

      <nav className="flex-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors"
              style={{
                backgroundColor: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
              }}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px]"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          <LogOut size={16} />
          Sign out
        </button>
        <p className="px-3 mt-2 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
          Shared team account
        </p>
      </div>
    </aside>
  );
}
