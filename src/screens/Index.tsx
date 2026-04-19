import { useState, useEffect } from "react";
import Link from "next/link";
import { Tag, PackageOpen, Zap, Flame, CheckCircle } from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";

const marqueeItems = [
  "30 pcs minimum", "48hr dispatch", "Direct importer rates", "Live WhatsApp tracking",
  "New drops every Thursday", "No more broadcast groups", "Free to join", "Verified sellers only",
];

const usps = [
  { icon: Tag, title: "Best rates in market", desc: "We buy direct from importers — zero middlemen, zero markup chain. Our prices beat Hall Road." },
  { icon: PackageOpen, title: "Start with just 30 pieces", desc: "Test a product before you scale. MOQ of 30 pcs per SKU. No more getting stuck with 500 units of dead stock." },
  { icon: Zap, title: "48-hour dispatch, tracked", desc: "Every order dispatched within 48 hours. Live tracking link sent to your WhatsApp automatically." },
  { icon: Flame, title: "Thursday drops — before it peaks", desc: "New trending products curated every Thursday. We track TikTok, Daraz, and Instagram so you don't have to." },
  { icon: CheckCircle, title: "One login. Zero chaos.", desc: "Replace 20 broadcast groups with one clean dashboard. All your orders, tracking, and invoices in one place." },
];

const steps = [
  { num: "01", title: "Register in 60 seconds", desc: "Create an account with email and password, plus a short profile — name, WhatsApp, and what you sell. No documents required." },
  { num: "02", title: "Start immediately", desc: "Your account is active as soon as you finish registration — sign in and use the member dashboard right away." },
  { num: "03", title: "Order and track instantly", desc: "Browse hundreds of trending products, place bulk orders from 30 pcs, and get live delivery updates on WhatsApp." },
];

const testimonials = [
  { quote: "Finally a wholesaler that actually replies. I placed an order at 11pm and had tracking by noon the next day.", name: "Ayesha R.", type: "Instagram reseller", city: "Lahore" },
  { quote: "Prices are genuinely lower than Hall Road. I've saved almost Rs 40,000 in three months.", name: "Usman K.", type: "Daraz seller", city: "Karachi" },
  { quote: "The Thursday drop is the first thing I open every week. It feels like having an insider.", name: "Fatima M.", type: "Boutique owner", city: "Islamabad" },
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
      <section className="bg-dark pt-12 pb-16 md:pt-20 md:pb-20">
        <div className="container max-w-3xl">
          <h1 className="font-heading font-bold text-[38px] md:text-[64px] leading-[1.1] text-primary-foreground">
            <span className="animate-word stagger-1 inline-block">Wholesale,</span>{" "}
            <span className="animate-word stagger-2 inline-block">the</span>{" "}
            <span className="animate-word stagger-3 inline-block">way</span>{" "}
            <span className="animate-word stagger-4 inline-block">it</span>{" "}
            <span className="animate-word stagger-5 inline-block">should</span>{" "}
            <span className="animate-word inline-block" style={{ animationDelay: "500ms" }}>be.</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl mt-4 max-w-[560px]">
            Direct from importers. MOQ of just 30 pcs. Delivered to your door in 48 hours.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/apply" className="inline-flex items-center h-[52px] px-6 rounded-pill bg-primary text-primary-foreground font-heading font-semibold hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.97]">
              Register free
            </Link>
            <a href="#how-it-works" className="inline-flex items-center h-[52px] px-6 rounded-pill border border-primary-foreground/30 text-primary-foreground font-heading font-semibold hover:bg-primary-foreground/10 transition-colors">
              See how it works
            </a>
          </div>
        </div>
        {/* Marquee */}
        <div className="border-t border-primary-foreground/10 mt-12 pt-4 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap flex gap-0">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} className="text-primary-foreground/70 text-sm mx-4 inline-flex items-center gap-4">
                {item}
                <span className="text-primary">·</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* USP Section */}
      <section id="how-it-works" className="py-16 md:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <p className="section-label mb-3">WHY LOCAL BABA</p>
            <h2 className="font-heading font-bold text-3xl md:text-[40px] text-foreground">Everything you hated about wholesale — fixed.</h2>
            <p className="text-muted-foreground text-lg mt-3 max-w-[600px] mx-auto">We built this because we were frustrated too.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {usps.map((usp, i) => (
              <div key={i} className="bg-card border border-border rounded-card p-8 animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <usp.icon className="text-primary mb-4" size={40} />
                <h3 className="font-heading font-bold text-xl mb-2">{usp.title}</h3>
                <p className="text-muted-foreground text-[15px] leading-relaxed">{usp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-dark py-16 md:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <p className="section-label mb-3">THE PROCESS</p>
            <h2 className="font-heading font-bold text-3xl md:text-[40px] text-primary-foreground">Up and running in minutes.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {steps.map((step, i) => (
              <div key={i} className="relative text-center md:text-left">
                <span className="font-heading font-bold text-[64px] text-primary/20 absolute -top-4 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 select-none">{step.num}</span>
                <div className="pt-12">
                  <h3 className="font-heading font-bold text-xl text-primary-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-[15px] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/apply" className="inline-flex items-center h-[52px] px-8 rounded-pill bg-primary text-primary-foreground font-heading font-semibold hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.97]">
              Create your account
            </Link>
          </div>
        </div>
      </section>

      {/* Savings Calculator */}
      <section className="py-16 md:py-20">
        <div className="container max-w-2xl">
          <div className="text-center mb-10">
            <h2 className="font-heading font-bold text-3xl md:text-4xl">See how much you save.</h2>
            <p className="text-muted-foreground mt-2">Our direct-importer model saves most sellers 15–30% per order.</p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Monthly order value: Rs {sliderVal.toLocaleString()}</label>
              <input
                type="range"
                min={10000}
                max={500000}
                step={5000}
                value={sliderVal}
                onChange={e => setSliderVal(Number(e.target.value))}
                className="w-full accent-primary h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Rs 10,000</span><span>Rs 5,00,000</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-card border border-border text-center">
                <p className="text-sm text-muted-foreground mb-1">Typical market cost</p>
                <p className="font-heading font-bold text-2xl">Rs {marketCost.toLocaleString()}</p>
              </div>
              <div className="p-6 rounded-card border-2 border-primary text-center">
                <p className="text-sm text-muted-foreground mb-1">Your cost with LocalBaba</p>
                <p className="font-heading font-bold text-2xl text-primary">Rs {ourCost.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-center font-heading font-bold text-xl text-primary">
              You save Rs {savings.toLocaleString()} per month — Rs {(savings * 12).toLocaleString()} per year
            </p>
            <p className="text-center text-xs text-muted-foreground">Estimated 22% average saving. Actual savings vary by product.</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-20 bg-card">
        <div className="container">
          <div className="text-center mb-12">
            <p className="section-label mb-3">WHAT MEMBERS SAY</p>
            <h2 className="font-heading font-bold text-3xl md:text-4xl">They switched. They stayed.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-card border border-border rounded-card p-8 shadow-subtle">
                <span className="text-primary text-5xl font-heading leading-none">"</span>
                <p className="text-foreground italic leading-relaxed mt-2">{t.quote}</p>
                <div className="flex items-center gap-3 mt-6">
                  <div className="w-10 h-10 rounded-full bg-olive text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {t.name.split(" ").map(w => w[0]).join("")}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.type}, {t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-dark py-16 md:py-20 text-center">
        <div className="container max-w-xl">
          <h2 className="font-heading font-bold text-3xl md:text-5xl text-primary-foreground">Ready to order smarter?</h2>
          <p className="text-muted-foreground mt-3">Join 500+ verified sellers already using The Local Baba.</p>
          <Link href="/apply" className="inline-flex items-center h-[52px] px-8 rounded-pill bg-primary text-primary-foreground font-heading font-semibold mt-8 hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.97]">
            Register free — takes 60 seconds
          </Link>
          <p className="text-xs text-muted-foreground mt-3">Free to join. No subscription. Cancel access anytime.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
