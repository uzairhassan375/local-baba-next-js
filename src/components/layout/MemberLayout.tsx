import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Grid3X3, Package, MapPin, Users, User, MessageCircle } from "lucide-react";
import { CartSidebar } from "@/components/CartSidebar";

const sidebarLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Catalogue", href: "/catalogue", icon: Grid3X3 },
  { label: "My Orders", href: "/orders", icon: Package },
  { label: "Track Order", href: "/orders", icon: MapPin },
  { label: "Community", href: "/dashboard", icon: Users },
  { label: "My Profile", href: "/dashboard", icon: User },
];

export function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] bg-dark fixed top-16 bottom-0 z-40">
        <div className="flex-1 py-6">
          {sidebarLinks.map(l => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.label}
                href={l.href}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  active
                    ? "text-primary border-l-[3px] border-primary bg-sidebar-accent"
                    : "text-sidebar-foreground hover:text-primary-foreground border-l-[3px] border-transparent"
                }`}
              >
                <l.icon size={18} />
                {l.label}
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
      <main className="flex-1 md:ml-[220px] pb-20 md:pb-0">
        {children}
      </main>

      <CartSidebar />
    </div>
  );
}
