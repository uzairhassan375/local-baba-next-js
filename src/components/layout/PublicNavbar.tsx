import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function PublicNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-dark">
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-0 font-heading font-bold text-xl text-primary-foreground">
          The Local Baba<span className="text-primary">.</span>
        </Link>
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center h-11 px-5 rounded-pill border-2 border-primary-foreground/30 text-primary-foreground font-heading font-semibold text-sm hover:bg-primary-foreground/10 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/apply"
            className="inline-flex items-center h-11 px-6 rounded-pill bg-primary text-primary-foreground font-heading font-semibold text-sm hover:bg-accent-hover transition-colors"
          >
            Register
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
        <div className="md:hidden border-t border-sidebar-border animate-fade-in-up">
          <div className="container py-4 flex flex-col gap-3">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block w-full text-center h-11 leading-[44px] rounded-pill border-2 border-primary-foreground/35 text-primary-foreground font-heading font-semibold text-sm hover:bg-primary-foreground/10"
            >
              Login
            </Link>
            <Link
              href="/apply"
              onClick={() => setOpen(false)}
              className="block w-full text-center h-11 leading-[44px] rounded-pill bg-primary text-primary-foreground font-heading font-semibold text-sm"
            >
              Register
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
