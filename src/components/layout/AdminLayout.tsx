import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Package, ShoppingCart, UserCheck, MessageSquare, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const adminLinks = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Applications", href: "/admin/applications", icon: UserCheck },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Members", href: "/admin/members", icon: Users },
  { label: "Announcements", href: "/admin/blasts", icon: MessageSquare },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logoutAdmin } = useAuth();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex flex-col w-[220px] bg-dark fixed top-0 bottom-0 z-40">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <Link href="/admin/dashboard" className="font-heading font-bold text-lg text-primary-foreground">
            LB Admin<span className="text-primary">.</span>
          </Link>
        </div>
        <div className="flex-1 py-4">
          {adminLinks.map(l => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
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
        <div className="p-4 border-t border-sidebar-border mt-auto">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground hover:text-primary-foreground"
            onClick={() => {
              void (async () => {
                await logoutAdmin();
                router.replace("/admin/login");
              })();
            }}
          >
            <LogOut size={18} />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 md:ml-[220px] min-h-screen">
        <div className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card">
          <Link href="/admin/dashboard" className="font-heading font-bold text-lg">
            LB Admin<span className="text-primary">.</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              void (async () => {
                await logoutAdmin();
                router.replace("/admin/login");
              })();
            }}
          >
            <LogOut size={16} /> Out
          </Button>
        </div>
        {children}
      </main>
    </div>
  );
}
