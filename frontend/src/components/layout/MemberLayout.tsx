import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Grid3X3, Package, MapPin, Users, User, MessageCircle, Heart, Bell, Layers, Sparkles, Lock, Receipt } from "lucide-react";
import { CartSidebar } from "@/components/CartSidebar";
import { useAuth } from "@/contexts/AuthContext";

const sidebarLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Catalogue", href: "/catalogue", icon: Grid3X3 },
  { label: "My Orders", href: "/orders", icon: Package },
  { label: "Track Order", href: "/track-order", icon: MapPin },
  { label: "Favourites", href: "/favourites", icon: Heart },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Invoice", href: "/invoice", icon: Receipt, free: true },
  { label: "My AI Listing", href: "/my-ai-listings", icon: Sparkles, locked: true },
  { label: "Integrations", href: "/integrations", icon: Layers, locked: true },
  { label: "Community", href: "/community", icon: Users },
  { label: "My Profile", href: "/profile", icon: User },
];

export function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSubscribed } = useAuth();

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] bg-card fixed top-16 bottom-0 z-40">
        <div className="flex-1 py-6">
          {sidebarLinks.map(l => {
            const active =
              pathname === l.href ||
              (l.href === "/orders" && pathname?.startsWith("/orders")) ||
              (l.href === "/track-order" && pathname?.startsWith("/track-order")) ||
              (l.href === "/catalogue" && pathname?.startsWith("/catalogue")) ||
              (l.href === "/favourites" && pathname?.startsWith("/favourites")) ||
              (l.href === "/notifications" && pathname?.startsWith("/notifications")) ||
              (l.href === "/my-ai-listings" && pathname?.startsWith("/my-ai-listings")) ||
              (l.href === "/integrations" && pathname?.startsWith("/integrations")) ||
              (l.href === "/invoice" && pathname?.startsWith("/invoice")) ||
              (l.href === "/profile" && pathname?.startsWith("/profile")) ||
              (l.href === "/community" && pathname?.startsWith("/community"));

            const showLock = l.locked && !isSubscribed;

            return (
              <Link
                key={l.label}
                href={l.href}
                className={`flex items-center justify-between px-6 py-3 text-sm transition-colors ${
                  active
                    ? "text-primary border-l-[3px] border-primary bg-muted font-semibold"
                    : "text-foreground hover:text-primary border-l-[3px] border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <l.icon size={18} />
                  {l.label}
                </div>
                {showLock && (
                  <span title="Subscription ($10) required">
                    <Lock size={14} className="text-amber-500 shrink-0" />
                  </span>
                )}
                {l.free && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                    Free
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        <div className="p-4">
          <a
            href="https://wa.me/923001234567"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 h-10 rounded-lg bg-olive text-primary-foreground text-sm font-medium w-full"
          >
            <MessageCircle size={16} />
            WhatsApp Support
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 md:ml-[220px] pb-20 md:pb-0 pt-16">
        {children}
      </main>

      <CartSidebar />
    </div>
  );
}
