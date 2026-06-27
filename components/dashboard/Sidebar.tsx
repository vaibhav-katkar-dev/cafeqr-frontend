"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Coffee, ClipboardList, UtensilsCrossed, QrCode, Settings, LogOut, X
} from "lucide-react";

const NAV = [
  { href: "/dashboard/orders", label: "Orders", icon: ClipboardList },
  { href: "/dashboard/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/dashboard/tables", label: "Tables & QR", icon: QrCode },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  pendingCount?: number;
  cafeName?: string;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ pendingCount = 0, cafeName, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-slate-900 text-white flex flex-col z-40 transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:z-auto"
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">CafeQR</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {cafeName && (
          <div className="px-5 py-3 border-b border-slate-800">
            <p className="text-xs text-slate-400">Logged in as</p>
            <p className="text-sm font-medium truncate">{cafeName}</p>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} onClick={onClose}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    active
                      ? "bg-emerald-500 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{label}</span>
                  {label === "Orders" && pendingCount > 0 && (
                    <Badge className="ml-auto bg-red-500 text-white text-xs h-5 min-w-5 flex items-center justify-center rounded-full">
                      {pendingCount}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => logout()}
          >
            <LogOut size={18} />
            <span className="text-sm">Sign Out</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
