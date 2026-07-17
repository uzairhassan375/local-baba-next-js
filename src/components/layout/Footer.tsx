import Link from "next/link";
import { Facebook, Instagram, MessageCircle } from "lucide-react";

const footerLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Register", href: "/apply" },
  { label: "Member login", href: "/login" },
  { label: "WhatsApp support", href: "https://wa.me/923001234567" },
];

const socialLinks = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/1D3mYsssTj/?mibextid=wwXIfr",
    icon: Facebook,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/localbaba0?igsh=MXVoMTQ1am01OW9zeQ%3D%3D&utm_source=qr",
    icon: Instagram,
  },
];

export function Footer() {
  return (
    <footer className="bg-dark text-sidebar-foreground border-t border-primary-foreground/5">
      <div className="container py-14 md:py-16">
        <div className="grid md:grid-cols-3 gap-10 md:gap-12">
          <div>
            <p className="font-heading font-bold text-xl text-primary-foreground mb-3">
              localbaba<span className="text-primary">.</span>
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Pakistan&apos;s direct-importer B2B platform. Wholesale the way it should be — from Lahore.
            </p>
            <div className="mt-4 space-y-1">
              <p className="text-sm text-muted-foreground"><span className="text-primary-foreground font-medium">Head Office:</span> 206-CCA2 Phase 6 DHA Lahore</p>
              <p className="text-sm text-muted-foreground"><span className="text-primary-foreground font-medium">Shop:</span> G-131 Central Plaza Karachi</p>
              <p className="text-sm text-muted-foreground"><span className="text-primary-foreground font-medium">Warehouse:</span> —</p>
            </div>
            <div className="flex gap-3 mt-5">
              {socialLinks.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-10 h-10 rounded-lg bg-primary-foreground/8 border border-primary-foreground/10 flex items-center justify-center text-primary-foreground/70 hover:text-primary hover:border-primary/40 transition-colors"
                >
                  <s.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="font-heading font-semibold text-primary-foreground text-sm mb-4">Quick links</p>
            <ul className="space-y-2.5">
              {footerLinks.map(l => (
                <li key={l.label}>
                  {l.href.startsWith("http") ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-heading font-semibold text-primary-foreground text-sm mb-4">Get in touch</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Questions about bulk pricing or membership? Our team replies on WhatsApp.
            </p>
            <a
              href="https://wa.me/923001234567"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-pill bg-olive text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <MessageCircle size={16} />
              WhatsApp us
            </a>
          </div>
        </div>
      </div>
      <div className="bg-orange-500">
        <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white">
          <span>© {new Date().getFullYear()} localbaba. All rights reserved.</span>
          <span>Lahore, Pakistan</span>
        </div>
      </div>
    </footer>
  );
}
