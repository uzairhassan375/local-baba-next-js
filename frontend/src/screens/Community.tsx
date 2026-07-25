import Link from "next/link";
import { Facebook, Instagram, Users, Sparkles, MessageCircle, ArrowRight } from "lucide-react";

const SOCIAL_LINKS = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/share/1D3mYsssTj/?mibextid=wwXIfr",
    icon: Facebook,
    color: "bg-[#1877F2]",
    description: "Follow Localbaba for updates, seller tips, and community posts.",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/localbaba0?igsh=MXVoMTQ1am01OW9zeQ%3D%3D&utm_source=qr",
    icon: Instagram,
    color: "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]",
    description: "See product drops, reels, and behind-the-scenes from our team.",
  },
];

export default function CommunityPage() {
  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in-up max-w-3xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden bg-dark rounded-card p-8 md:p-10 border-l-4 border-primary">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary mb-3">
            <Users size={20} />
            <span className="text-xs uppercase tracking-widest font-semibold">Member community</span>
          </div>
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-primary-foreground">
            Connect with Localbaba
          </h1>
          <p className="text-muted-foreground text-sm mt-3 leading-relaxed max-w-lg">
            Join our community for early product drops, wholesale selling tips, flash deals, and updates from the Localbaba team in Lahore.
          </p>
        </div>
      </div>

      {/* Social links */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          Follow us
        </h2>
        <div className="grid gap-4">
          {SOCIAL_LINKS.map(link => (
            <a
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 bg-card rounded-card border border-border p-5 hover:border-primary hover:shadow-card transition-all"
            >
              <div className={`w-14 h-14 rounded-xl ${link.color} flex items-center justify-center shrink-0 shadow-subtle`}>
                <link.icon size={28} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-base group-hover:text-primary transition-colors">{link.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{link.description}</p>
              </div>
              <ArrowRight size={18} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* WhatsApp CTA */}
      <div className="bg-olive/10 rounded-card p-6 border border-olive/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-olive flex items-center justify-center shrink-0">
            <MessageCircle size={24} className="text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg">WhatsApp support</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Need help with an order or want to ask about bulk pricing? Message our team directly.
            </p>
            <a
              href="https://wa.me/923001234567"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-olive text-primary-foreground text-sm font-semibold mt-4 hover:opacity-90 transition-opacity"
            >
              Chat on WhatsApp <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-card rounded-card border border-border p-6 space-y-4">
        <h3 className="font-heading font-semibold">Why join the community?</h3>
        <ul className="space-y-3">
          {[
            "Get notified about new China catalog arrivals before they hit the main catalogue",
            "Learn what other sellers in Lahore are stocking and how they price",
            "Access flash deals and member-only bulk discounts",
          ].map(tip => (
            <li key={tip} className="flex items-start gap-3 text-sm text-muted-foreground">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
              {tip}
            </li>
          ))}
        </ul>
        <Link href="/catalogue" className="text-primary text-sm hover:underline inline-flex items-center gap-1">
          Browse catalogue <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
