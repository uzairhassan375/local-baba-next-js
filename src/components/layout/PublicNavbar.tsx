import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const navAnchors = [
  { label: "Products", href: "/#products" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Savings", href: "/#savings" },
];

export function PublicNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-dark/95 backdrop-blur-md border-b border-primary-foreground/5">
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-0 font-heading font-bold text-xl text-primary-foreground">
          localbaba<span className="text-primary">.</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navAnchors.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-sidebar-foreground hover:text-primary-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center h-10 px-5 rounded-pill border border-primary-foreground/25 text-primary-foreground font-heading font-semibold text-sm hover:bg-primary-foreground/8 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/apply"
            className="inline-flex items-center h-10 px-6 rounded-pill bg-primary text-primary-foreground font-heading font-semibold text-sm hover:bg-accent-hover transition-colors shadow-md shadow-primary/20"
          >
            Register free
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-primary-foreground p-2"
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-sidebar-border animate-fade-in-up bg-dark">
          <div className="container py-4 flex flex-col gap-1">
            {navAnchors.map(l => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block py-2.5 text-sidebar-foreground text-sm hover:text-primary-foreground"
              >
                {l.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-sidebar-border">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block w-full text-center h-11 leading-[44px] rounded-pill border border-primary-foreground/30 text-primary-foreground font-heading font-semibold text-sm"
              >
                Login
              </Link>
              <Link
                href="/apply"
                onClick={() => setOpen(false)}
                className="block w-full text-center h-11 leading-[44px] rounded-pill bg-primary text-primary-foreground font-heading font-semibold text-sm"
              >
                Register free
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
