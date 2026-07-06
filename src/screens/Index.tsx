import { useState } from "react";
import Link from "next/link";
import {
  Tag,
  PackageOpen,
  Zap,
  Flame,
  CheckCircle,
  ArrowRight,
  Truck,
  Shield,
  Users,
  Facebook,
  Instagram,
  MessageCircle,
  Sparkles,
  Package,
  Globe,
} from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { FeaturedProductsSection } from "@/components/FeaturedProductsSection";

const marqueeItems = [
  "30 pcs minimum",
  "48hr dispatch",
  "Direct importer rates",
  "Live WhatsApp tracking",
  "New drops every Thursday",
  "No more broadcast groups",
  "Free to join",
  "Verified sellers only",
];

const usps = [
  {
    icon: Tag,
    title: "Best rates in market",
    desc: "We buy direct from importers — zero middlemen, zero markup chain. Our prices beat Hall Road.",
    accent: "bg-primary/10 text-primary",
  },
  {
    icon: PackageOpen,
    title: "Start with just 30 pieces",
    desc: "Test a product before you scale. MOQ of 30 pcs per SKU. No more getting stuck with 500 units of dead stock.",
    accent: "bg-olive/15 text-olive",
  },
  {
    icon: Zap,
    title: "48-hour dispatch, tracked",
    desc: "Every order dispatched within 48 hours. Live tracking link sent to your WhatsApp automatically.",
    accent: "bg-primary/10 text-primary",
  },
  {
    icon: Flame,
    title: "Thursday drops — before it peaks",
    desc: "New trending products curated every Thursday. We track TikTok, Daraz, and Instagram so you don't have to.",
    accent: "bg-amber-500/10 text-amber-700",
  },
  {
    icon: CheckCircle,
    title: "One login. Zero chaos.",
    desc: "Replace 20 broadcast groups with one clean dashboard. All your orders, tracking, and invoices in one place.",
    accent: "bg-success/10 text-success",
  },
];

const steps = [
  {
    num: "01",
    title: "Register in 60 seconds",
    desc: "Create an account with email and password, plus a short profile — name, WhatsApp, and what you sell.",
    icon: Users,
  },
  {
    num: "02",
    title: "Start immediately",
    desc: "Your account is active as soon as you finish registration — sign in and use the member dashboard right away.",
    icon: Sparkles,
  },
  {
    num: "03",
    title: "Order and track instantly",
    desc: "Browse hundreds of trending products, place bulk orders from 30 pcs, and get live delivery updates on WhatsApp.",
    icon: Truck,
  },
];

const testimonials = [
  {
    quote: "Finally a wholesaler that actually replies. I placed an order at 11pm and had tracking by noon the next day.",
    name: "Ayesha R.",
    type: "Instagram reseller",
    city: "Lahore",
  },
  {
    quote: "Prices are genuinely lower than Hall Road. I've saved almost Rs 40,000 in three months.",
    name: "Usman K.",
    type: "Daraz seller",
    city: "Karachi",
  },
  {
    quote: "The Thursday drop is the first thing I open every week. It feels like having an insider.",
    name: "Fatima M.",
    type: "Boutique owner",
    city: "Islamabad",
  },
];

const trustStats = [
  { value: "500+", label: "Active sellers" },
  { value: "48hr", label: "Dispatch time" },
  { value: "30 pcs", label: "Minimum order" },
  { value: "22%", label: "Avg. savings" },
];

const SOCIAL_LINKS = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/share/1D3mYsssTj/?mibextid=wwXIfr",
    icon: Facebook,
    color: "bg-[#1877F2]",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/localbaba0?igsh=MXVoMTQ1am01OW9zeQ%3D%3D&utm_source=qr",
    icon: Instagram,
    color: "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]",
  },
];

export default function LandingPage() {
  const [sliderVal, setSliderVal] = useState(50000);
  const marketCost = sliderVal;
  const ourCost = Math.round(sliderVal * 0.78);
  const savings = marketCost - ourCost;

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-dark pt-10 pb-0 md:pt-16">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-olive/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center pb-12 md:pb-16">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-primary/15 border border-primary/25 text-primary text-xs font-semibold uppercase tracking-wider mb-6">
                <Sparkles size={14} />
                Pakistan&apos;s B2B wholesale platform
              </div>
              <h1 className="font-heading font-bold text-[36px] sm:text-[44px] md:text-[56px] lg:text-[60px] leading-[1.08] text-primary-foreground">
                Wholesale,{" "}
                <span className="text-primary">the way it should be.</span>
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl mt-5 max-w-[520px] leading-relaxed">
                Direct from importers. MOQ of just 30 pcs. Local stock and China catalog — delivered to your door in 48 hours.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Link
                  href="/apply"
                  className="group inline-flex items-center gap-2 h-[52px] px-7 rounded-pill bg-primary text-primary-foreground font-heading font-semibold hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.97] shadow-lg shadow-primary/20"
                >
                  Register free
                  <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center h-[52px] px-7 rounded-pill border border-primary-foreground/25 text-primary-foreground font-heading font-semibold hover:bg-primary-foreground/8 transition-colors"
                >
                  See how it works
                </a>
              </div>
              <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t border-primary-foreground/10">
                {[
                  { icon: Truck, text: "48hr dispatch" },
                  { icon: Shield, text: "Verified sellers" },
                  { icon: Package, text: "30 pcs MOQ" },
                ].map(item => (
                  <span key={item.text} className="flex items-center gap-2 text-sm text-primary-foreground/70">
                    <item.icon size={16} className="text-primary shrink-0" />
                    {item.text}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero card */}
            <div className="relative">
              <div className="bg-card/5 backdrop-blur-sm border border-primary-foreground/10 rounded-card p-6 md:p-8 border-l-4 border-l-primary shadow-2xl">
                <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-4">Why sellers switch</p>
                <div className="grid grid-cols-2 gap-4">
                  {trustStats.map(stat => (
                    <div key={stat.label} className="bg-dark/50 rounded-xl p-4 border border-primary-foreground/8">
                      <p className="font-heading font-bold text-2xl md:text-3xl text-primary">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 rounded-xl bg-olive/15 border border-olive/25">
                  <p className="text-sm text-primary-foreground leading-relaxed">
                    <span className="font-semibold text-olive">New:</span> Browse local stock and China import catalog separately — with category-wise delivery rates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Marquee */}
        <div className="border-t border-primary-foreground/10 py-4 overflow-hidden bg-dark/80">
          <div className="animate-marquee whitespace-nowrap flex gap-0">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} className="text-primary-foreground/60 text-sm mx-4 inline-flex items-center gap-4">
                {item}
                <span className="text-primary">·</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Featured products (admin-curated) */}
      <FeaturedProductsSection />

      {/* Catalog types */}
      <section className="py-14 md:py-18 border-b border-border">
        <div className="container">
          <div className="text-center mb-10">
            <p className="section-label mb-3">TWO CATALOGS</p>
            <h2 className="font-heading font-bold text-3xl md:text-[40px] text-foreground">Local stock & China imports</h2>
            <p className="text-muted-foreground text-lg mt-3 max-w-[560px] mx-auto">
              Order ready stock from Pakistan or source direct from China — all in one member dashboard.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {[
              {
                icon: Package,
                title: "Local catalog",
                desc: "Ready stock in Pakistan. Fast dispatch, trending Thursday drops, and prices that beat Hall Road.",
                tag: "48hr dispatch",
              },
              {
                icon: Globe,
                title: "China catalog",
                desc: "Direct import products with category-wise delivery pricing. Scale your margins on high-demand SKUs.",
                tag: "Category delivery rates",
              },
            ].map(cat => (
              <div
                key={cat.title}
                className="group bg-card border border-border rounded-card p-7 hover:border-primary hover:shadow-card transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <cat.icon size={24} className="text-primary" />
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-pill">
                  {cat.tag}
                </span>
                <h3 className="font-heading font-bold text-xl mt-3 mb-2">{cat.title}</h3>
                <p className="text-muted-foreground text-[15px] leading-relaxed">{cat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* USP Section */}
      <section id="how-it-works" className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <p className="section-label mb-3">WHY LOCAL BABA</p>
            <h2 className="font-heading font-bold text-3xl md:text-[40px] text-foreground">
              Everything you hated about wholesale — fixed.
            </h2>
            <p className="text-muted-foreground text-lg mt-3 max-w-[600px] mx-auto">
              We built this because we were frustrated too.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {usps.map((usp, i) => (
              <div
                key={i}
                className={`group bg-card border border-border rounded-card p-7 hover:border-primary/50 hover:shadow-card transition-all animate-fade-in-up ${
                  i === 4 ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl ${usp.accent} flex items-center justify-center mb-5`}>
                  <usp.icon size={22} />
                </div>
                <h3 className="font-heading font-bold text-lg mb-2 group-hover:text-primary transition-colors">{usp.title}</h3>
                <p className="text-muted-foreground text-[15px] leading-relaxed">{usp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-dark py-16 md:py-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="container relative">
          <div className="text-center mb-14">
            <p className="section-label mb-3">THE PROCESS</p>
            <h2 className="font-heading font-bold text-3xl md:text-[40px] text-primary-foreground">
              Up and running in minutes.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <div
                key={i}
                className="relative bg-card/5 border border-primary-foreground/10 rounded-card p-7 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="font-heading font-bold text-4xl text-primary/30">{step.num}</span>
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <step.icon size={20} className="text-primary" />
                  </div>
                </div>
                <h3 className="font-heading font-bold text-lg text-primary-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                {i < steps.length - 1 && (
                  <ArrowRight
                    size={20}
                    className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-primary/40 z-10"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/apply"
              className="group inline-flex items-center gap-2 h-[52px] px-8 rounded-pill bg-primary text-primary-foreground font-heading font-semibold hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.97]"
            >
              Create your account
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Savings Calculator */}
      <section id="savings" className="py-16 md:py-24">
        <div className="container max-w-2xl">
          <div className="text-center mb-10">
            <p className="section-label mb-3">SAVINGS CALCULATOR</p>
            <h2 className="font-heading font-bold text-3xl md:text-4xl">See how much you save.</h2>
            <p className="text-muted-foreground mt-2">Our direct-importer model saves most sellers 15–30% per order.</p>
          </div>
          <div className="bg-card border border-border rounded-card p-6 md:p-8 shadow-subtle space-y-6">
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-sm font-medium">Monthly order value</label>
                <span className="font-heading font-bold text-lg text-primary">Rs {sliderVal.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={10000}
                max={500000}
                step={5000}
                value={sliderVal}
                onChange={e => setSliderVal(Number(e.target.value))}
                className="w-full accent-primary h-2 rounded-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>Rs 10,000</span>
                <span>Rs 5,00,000</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-border text-center bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Market cost</p>
                <p className="font-heading font-bold text-xl md:text-2xl">Rs {marketCost.toLocaleString()}</p>
              </div>
              <div className="p-5 rounded-xl border-2 border-primary text-center bg-primary/5">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">With Localbaba</p>
                <p className="font-heading font-bold text-xl md:text-2xl text-primary">Rs {ourCost.toLocaleString()}</p>
              </div>
            </div>
            <div className="text-center py-4 px-4 rounded-xl bg-olive/10 border border-olive/20">
              <p className="font-heading font-bold text-xl md:text-2xl text-foreground">
                Save Rs {savings.toLocaleString()}/month
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Rs {(savings * 12).toLocaleString()} per year · ~22% average saving
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <p className="section-label mb-3">WHAT MEMBERS SAY</p>
            <h2 className="font-heading font-bold text-3xl md:text-4xl">They switched. They stayed.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-card p-7 hover:shadow-card hover:border-primary/30 transition-all flex flex-col"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <span key={j} className="text-primary text-sm">★</span>
                  ))}
                </div>
                <p className="text-foreground leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-border">
                  <div className="w-11 h-11 rounded-full bg-olive text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                    {t.name.split(" ").map(w => w[0]).join("")}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.type} · {t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community / Social */}
      <section className="py-16 md:py-20">
        <div className="container max-w-3xl">
          <div className="text-center mb-10">
            <p className="section-label mb-3">JOIN THE COMMUNITY</p>
            <h2 className="font-heading font-bold text-3xl md:text-4xl">Follow Localbaba</h2>
            <p className="text-muted-foreground mt-2">Early drops, selling tips, and flash deals — before anyone else.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
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
                  <p className="font-heading font-semibold group-hover:text-primary transition-colors">{link.name}</p>
                  <p className="text-sm text-muted-foreground">Tap to open</p>
                </div>
                <ArrowRight size={18} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
              </a>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <a
              href="https://wa.me/923001234567"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-pill bg-olive text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <MessageCircle size={18} />
              WhatsApp support
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-dark py-20 md:py-28 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-olive/10 pointer-events-none" />
        <div className="container max-w-xl relative">
          <h2 className="font-heading font-bold text-3xl md:text-5xl text-primary-foreground leading-tight">
            Ready to order smarter?
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Join 500+ verified sellers already using Localbaba.
          </p>
          <Link
            href="/apply"
            className="group inline-flex items-center gap-2 h-[56px] px-10 rounded-pill bg-primary text-primary-foreground font-heading font-semibold text-lg mt-10 hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.97] shadow-lg shadow-primary/25"
          >
            Register free — takes 60 seconds
            <ArrowRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <p className="text-xs text-muted-foreground mt-4">Free to join · No subscription · Cancel anytime</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
