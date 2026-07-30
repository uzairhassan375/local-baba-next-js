import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3X3, Package, Users, User, Menu, X, ShoppingCart, Heart, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useNotifications } from "@/contexts/NotificationsContext";

const navLinks = [
  { label: "Catalogue", href: "/catalogue" },
  { label: "My Orders", href: "/orders" },
  { label: "Track", href: "/orders" },
  { label: "Community", href: "/community" },
];

const mobileTabLinks = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Catalogue", href: "/catalogue", icon: Grid3X3 },
  { label: "Orders", href: "/orders", icon: Package },
  { label: "Favourites", href: "/favourites", icon: Heart },
  { label: "Community", href: "/community", icon: Users },
  { label: "Account", href: "/profile", icon: User },
];

export function MemberNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { member, logout } = useAuth();
  const { openCart, itemCount } = useCart();
  const { favoriteIds } = useFavorites();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const initials = member?.name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "MB";

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/dashboard" className="font-heading font-bold text-xl text-foreground">
            The Local Baba<span className="text-primary">.</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(l => (
              <Link key={l.href + l.label} href={l.href} className="text-sm text-foreground hover:text-primary transition-colors font-body">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/notifications" className="relative text-foreground p-2" aria-label="Notifications">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/favourites" className="relative text-foreground p-2" aria-label="Favourites">
              <Heart
                size={20}
                className={favoriteIds.length > 0 ? "fill-red-500 text-red-500" : "text-foreground"}
              />
              {favoriteIds.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {favoriteIds.length > 99 ? "99+" : favoriteIds.length}
                </span>
              )}
            </Link>
            <button onClick={openCart} className="relative text-foreground p-2" aria-label="Cart">
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>
            <div className="hidden md:block relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 pl-3 pr-1 py-1 rounded-full hover:bg-foreground/5 transition-colors"
                aria-label="Account menu"
              >
                <span className="text-sm text-foreground font-medium max-w-[140px] truncate text-right">
                  {member?.name || "Member"}
                </span>
                <span className="w-9 h-9 rounded-full bg-olive text-foreground text-xs font-bold flex items-center justify-center shrink-0">
                  {initials}
                </span>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-card rounded-card shadow-card border border-border py-1 animate-fade-in-up">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium truncate">{member?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member?.city}</p>
                  </div>
                  <Link href="/profile" className="block px-4 py-2 text-sm hover:bg-muted" onClick={() => setDropdownOpen(false)}>Profile</Link>
                  <button onClick={() => { void logout(); setDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-muted text-danger">Logout</button>
                </div>
              )}
            </div>
            <Link
              href="/profile"
              className="md:hidden flex items-center gap-2 min-w-0 max-w-[120px]"
              aria-label="Profile"
            >
              <span className="text-xs text-foreground font-medium truncate">
                {member?.name?.split(" ")[0] || "Member"}
              </span>
              <span className="w-8 h-8 rounded-full bg-olive text-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                {initials}
              </span>
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-foreground p-2" aria-label="Menu">
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-border animate-fade-in-up">
            <div className="container py-3 space-y-2">
              {navLinks.map(l => (
                <Link key={l.href + l.label} href={l.href} onClick={() => setMenuOpen(false)} className="block py-2 text-foreground text-sm">{l.label}</Link>
              ))}
              <button onClick={() => { void logout(); setMenuOpen(false); }} className="block py-2 text-danger text-sm">Logout</button>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
        <div className="flex justify-around items-center h-14">
          {mobileTabLinks.map(l => {
            const active =
              pathname === l.href ||
              (l.href === "/orders" && (pathname?.startsWith("/orders") ?? false)) ||
              (l.href === "/profile" && (pathname?.startsWith("/profile") ?? false)) ||
              (l.href === "/community" && (pathname?.startsWith("/community") ?? false));
            return (
              <Link key={l.label} href={l.href} className={`flex flex-col items-center gap-0.5 text-[10px] py-1 ${active ? "text-primary" : "text-muted-foreground"}`}>
                <l.icon size={20} />
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
