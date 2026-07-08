"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Zap,
  Truck,
  ShieldCheck,
  Search,
  Package,
  Sparkles,
  Globe2,
} from "lucide-react";

import { fetchLandingProducts } from "@/lib/supabase/productsApi";
import { ProductMedia } from "@/components/ProductMedia";
import type { Product } from "@/data/mockData";

const marquee = [
  "30 PCS MOQ",
  "48HR DISPATCH",
  "DIRECT IMPORTER RATES",
  "LIVE WHATSAPP TRACKING",
  "NEW DROPS EVERY THURSDAY",
  "VERIFIED SELLERS ONLY",
  "CHINA → YOUR DOOR",
  "NO BROADCAST GROUPS",
];

const categories = [
  { name: "Electronics", count: 214 },
  { name: "Beauty & Skin", count: 187 },
  { name: "Home & Kitchen", count: 156 },
  { name: "Fashion & Bags", count: 142 },
  { name: "Footwear", count: 98 },
  { name: "Kids & Toys", count: 74 },
  { name: "Fitness", count: 61 },
  { name: "Content Creator", count: 43 },
];

export default function LandingPage() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["landing-products"],
    queryFn: fetchLandingProducts,
    staleTime: 60_000,
  });

  return (
    <main className="theme-landing min-h-screen bg-background text-foreground font-body overflow-x-hidden">
      <Nav />
      <Hero products={products} />
      <Marquee />
      <TrendingDrop products={products} isLoading={isLoading} />
      <Categories />
      <Sourcing />
      <Process />
      <Savings />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center bg-primary font-mono text-sm font-bold text-primary-foreground">
            LB
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">THE LOCAL BABA</span>
        </Link>
        <nav className="hidden items-center gap-8 font-mono text-xs uppercase tracking-widest text-muted-foreground md:flex">
          <a href="#catalog" className="hover:text-foreground">
            Catalog
          </a>
          <a href="#sourcing" className="hover:text-foreground">
            Sourcing
          </a>
          <a href="#how" className="hover:text-foreground">
            How it works
          </a>
          <a href="#savings" className="hover:text-foreground">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/apply"
            className="group inline-flex items-center gap-1.5 bg-primary px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground transition hover:bg-accent-hover"
          >
            Register free
            <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero({ products }: { products: Product[] }) {
  const previewItems = products.slice(0, 4);

  return (
    <section className="relative border-b border-border/60">
      <div className="pointer-events-none absolute inset-0">
        <img
          src="/hero.jpg"
          alt=""
          width={1600}
          height={1200}
          className="h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="absolute -top-32 right-0 h-[560px] w-[560px] rounded-full bg-primary/15 blur-3xl" />
      </div>
      <div className="relative mx-auto grid max-w-[1400px] gap-10 px-6 pt-12 pb-10 lg:grid-cols-12 lg:pt-16 lg:pb-14">
        <div className="lg:col-span-8">
          <div className="mb-6 inline-flex items-center gap-2 border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-primary">
            <span className="h-1.5 w-1.5 animate-pulse bg-primary" />
            B2B sourcing · Direct from importers
          </div>
          <h1 className="font-heading text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            Wholesale,
            <br />
            <span className="text-primary">the way</span>
            <br />
            it should be.
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted-foreground md:text-xl">
            The reseller&apos;s sourcing engine. Trending e-commerce products from China, unpacked
            into B2B lots you can actually order — from just 30 pieces, delivered in 48 hours.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/apply"
              className="group inline-flex items-center justify-center gap-2 bg-primary px-6 py-4 font-mono text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:bg-accent-hover"
            >
              Register free — 60s
              <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <a
              href="#catalog"
              className="inline-flex items-center justify-center gap-2 border border-border px-6 py-4 font-mono text-sm font-bold uppercase tracking-widest text-foreground transition hover:border-primary hover:text-primary"
            >
              Browse catalog
            </a>
          </div>
          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-6 border-t border-border/60 pt-5">
            <Stat kpi="500+" label="Verified resellers" />
            <Stat kpi="1,200" label="Live SKUs" />
            <Stat kpi="22%" label="Avg. savings" />
          </div>
        </div>
        <aside className="lg:col-span-4">
          <div className="border border-border/80 bg-secondary/60 p-6 backdrop-blur">
            <div className="mb-4 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              <span>Live sourcing</span>
              <span className="text-primary">● online</span>
            </div>
            <div className="mb-4 flex items-center gap-2 border border-border bg-background px-3 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search a product, category or SKU"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <ul className="space-y-3 font-mono text-xs">
              {previewItems.length === 0
                ? Array.from({ length: 4 }).map((_, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between border-b border-border/50 pb-3"
                    >
                      <span className="inline-block h-3 w-40 animate-pulse bg-muted" />
                      <span className="inline-block h-3 w-12 animate-pulse bg-muted" />
                    </li>
                  ))
                : previewItems.map(p => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between border-b border-border/50 pb-3"
                    >
                      <span>
                        <span className="text-muted-foreground">{p.sku}</span>
                        <span className="mx-2 text-border">/</span>
                        <span className="text-foreground">{p.name}</span>
                      </span>
                      <span className="text-primary">Rs {p.pricePerPc.toLocaleString()}</span>
                    </li>
                  ))}
            </ul>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Next drop → Thursday · 09:00 PKT
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function useCountUp(target: number, duration = 1600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || target === 0) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function Stat({ kpi, label }: { kpi: string; label: string }) {
  const match = kpi.match(/^([^\d]*)([\d,.]+)(.*)$/);
  const prefix = match?.[1] ?? "";
  const numeric = match ? Number(match[2].replace(/,/g, "")) : 0;
  const suffix = match?.[3] ?? "";
  const current = useCountUp(numeric);
  const formatted =
    numeric >= 1000 ? current.toLocaleString() : String(current);
  return (
    <div>
      <div className="font-heading text-3xl font-bold text-foreground md:text-4xl tabular-nums">
        {prefix}
        {formatted}
        {suffix}
      </div>
      <div className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function Marquee() {
  return (
    <div className="border-b border-border/60 bg-primary text-primary-foreground">
      <div className="flex gap-8 overflow-hidden py-3 font-mono text-xs font-bold uppercase tracking-widest">
        <div className="animate-marquee flex shrink-0 gap-8 whitespace-nowrap pl-8">
          {[...marquee, ...marquee].map((m, i) => (
            <span key={i} className="flex items-center gap-8">
              {m}
              <span aria-hidden>◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrendingDrop({ products, isLoading }: { products: Product[]; isLoading: boolean }) {
  return (
    <section id="catalog" className="border-b border-border/60">
      <div className="mx-auto max-w-[1400px] px-6 py-12 md:py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
              Curated drop · Featured picks
            </div>
            <h2 className="max-w-2xl font-heading text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-5xl">
              Trending on TikTok. Priced for your shelf.
            </h2>
          </div>
          <Link
            href="/apply"
            className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            View full catalog
            <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="border border-border bg-muted/30">
                <div className="aspect-[4/3] animate-pulse bg-muted" />
                <div className="space-y-3 p-5">
                  <div className="h-3 w-24 animate-pulse bg-muted" />
                  <div className="h-5 w-40 animate-pulse bg-muted" />
                  <div className="h-6 w-20 animate-pulse bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              No products selected for the landing page yet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Admins can curate this drop from{" "}
              <Link href="/admin/landing-products" className="text-primary underline">
                Admin → Landing page
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map(p => (
              <LandingDropCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function LandingDropCard({ product }: { product: Product }) {
  const margin =
    product.marketRate > product.pricePerPc && product.marketRate > 0
      ? Math.round(((product.marketRate - product.pricePerPc) / product.marketRate) * 100)
      : 0;

  const tag = product.tags.includes("hot")
    ? "TRENDING"
    : product.tags.includes("new")
      ? "NEW"
      : product.tags.includes("featured")
        ? "FEATURED"
        : product.catalogType === "china"
          ? "CHINA"
          : "LOCAL";

  return (
    <article className="group relative border border-border bg-secondary/40 transition hover:border-primary">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <ProductMedia
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 bg-primary px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
          {tag}
        </span>
        <span className="absolute right-3 top-3 border border-border bg-background/80 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground backdrop-blur">
          MOQ {product.moq}
        </span>
      </div>
      <div className="p-5">
        <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <span>{product.category}</span>
          {margin > 0 && <span className="text-primary">+{margin}% margin</span>}
        </div>
        <h3 className="font-heading text-xl font-bold">{product.name}</h3>
        <div className="mt-4 flex items-end justify-between border-t border-border/60 pt-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Unit / wholesale
            </div>
            <div className="font-heading text-2xl font-bold text-primary">
              Rs {product.pricePerPc.toLocaleString()}
            </div>
          </div>
          {product.marketRate > product.pricePerPc && (
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Retail
              </div>
              <div className="font-mono text-sm text-muted-foreground line-through">
                Rs {product.marketRate.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function Categories() {
  return (
    <section className="border-b border-border/60 bg-secondary/30">
      <div className="mx-auto max-w-[1400px] px-6 py-12 md:py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
            Browse by category
          </h2>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            1,200+ SKUs · restocked weekly
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          {categories.map(c => (
            <a
              key={c.name}
              href="#catalog"
              className="group flex items-center justify-between bg-background p-6 transition hover:bg-primary hover:text-primary-foreground"
            >
              <div>
                <div className="font-heading text-lg font-bold">{c.name}</div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground group-hover:text-primary-foreground/80">
                  {c.count} SKUs
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 opacity-40 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Sourcing() {
  const items = [
    { icon: Globe2, t: "Sourced in China", d: "500+ factories vetted across Yiwu, Guangzhou, Shenzhen." },
    { icon: Sparkles, t: "Curated on trend", d: "We track TikTok, Daraz & IG so you get products before they peak." },
    { icon: Package, t: "Broken into B2B lots", d: "Container loads split into 30-piece MOQs. Test before you scale." },
    { icon: Truck, t: "Landed in Pakistan", d: "Duty-paid, quality-checked, in-stock. 48-hour dispatch nationwide." },
  ];
  return (
    <section id="sourcing" className="border-b border-border/60">
      <div className="mx-auto max-w-[1400px] px-6 py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="mb-4 font-mono text-xs uppercase tracking-widest text-primary">
              The sourcing layer
            </div>
            <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-5xl">
              We speak Yiwu.
              <br />
              You speak <span className="text-primary">Instagram.</span>
            </h2>
            <p className="mt-6 max-w-md text-muted-foreground">
              Our team lives on the ground in Guangzhou, Yiwu and Shenzhen. We scout what&apos;s
              about to trend, negotiate importer pricing, verify the factory, and land the SKU in
              Pakistan — so you can order it like a normal e-commerce product.
            </p>
          </div>
          <div className="lg:col-span-7">
            <ol className="grid gap-px bg-border sm:grid-cols-2">
              {items.map(({ icon: Icon, t, d }) => (
                <li key={t} className="bg-background p-8">
                  <Icon className="h-6 w-6 text-primary" />
                  <div className="mt-6 font-heading text-xl font-bold">{t}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function Process() {
  const steps = [
    { n: "01", t: "Register in 60 seconds", d: "Email, WhatsApp, and what you sell. No documents, no approval wait." },
    { n: "02", t: "Browse the drop", d: "Live catalog with wholesale pricing, margin math, and stock counters." },
    { n: "03", t: "Order from 30 pcs", d: "Test-lot pricing on every SKU. Reorder in bulk once it moves." },
    { n: "04", t: "Track on WhatsApp", d: "Dispatch inside 48 hours with a live tracking link to your phone." },
  ];
  return (
    <section id="how" className="border-b border-border/60 bg-secondary/30">
      <div className="mx-auto max-w-[1400px] px-6 py-14 md:py-18">
        <div className="mb-10 max-w-3xl">
          <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
            The process
          </div>
          <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-5xl">
            From signup to shipped in one afternoon.
          </h2>
        </div>
        <div className="grid gap-px bg-border md:grid-cols-4">
          {steps.map(s => (
            <div key={s.n} className="bg-background p-8">
              <div className="font-mono text-xs uppercase tracking-widest text-primary">{s.n}</div>
              <div className="mt-8 font-heading text-2xl font-bold leading-tight">{s.t}</div>
              <p className="mt-3 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Savings() {
  const perks: Array<[typeof Zap, string]> = [
    [Zap, "No middlemen"],
    [ShieldCheck, "Verified stock"],
    [Truck, "48h dispatch"],
  ];
  return (
    <section id="savings" className="border-b border-border/60">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-6 py-14 md:py-20 lg:grid-cols-2">
        <div>
          <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
            Real margin math
          </div>
          <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-5xl">
            See how much
            <br />
            you actually save.
          </h2>
          <p className="mt-6 max-w-md text-muted-foreground">
            Our direct-importer model saves most resellers 15–30% per order versus Hall Road, Bolton
            Market and traditional broadcast wholesalers.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {perks.map(([Icon, label]) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5 text-primary" /> {label}
              </span>
            ))}
          </div>
        </div>
        <div className="border border-border bg-secondary/40 p-8 md:p-10">
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Monthly order value
          </div>
          <div className="mt-2 font-heading text-5xl font-bold">Rs 50,000</div>
          <div className="mt-10 space-y-6">
            <Bar label="Typical market cost" amount="Rs 50,000" width="100%" tone="muted" />
            <Bar label="Your cost with LocalBaba" amount="Rs 39,000" width="78%" tone="primary" />
          </div>
          <div className="mt-10 border-t border-border/60 pt-6">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              You save
            </div>
            <div className="mt-2 font-heading text-4xl font-bold text-primary md:text-5xl">
              Rs 11,000 / month
            </div>
            <div className="mt-1 font-mono text-xs text-muted-foreground">
              Rs 132,000 per year · 22% average
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bar({
  label,
  amount,
  width,
  tone,
}: {
  label: string;
  amount: string;
  width: string;
  tone: "muted" | "primary";
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between font-mono text-xs">
        <span className="uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="text-foreground">{amount}</span>
      </div>
      <div className="h-3 border border-border bg-background">
        <div
          className={tone === "primary" ? "h-full bg-primary" : "h-full bg-muted-foreground/40"}
          style={{ width }}
        />
      </div>
    </div>
  );
}

function Testimonials() {
  const t = [
    {
      q: "Finally a wholesaler that actually replies. Placed an order at 11pm, tracking by noon.",
      n: "Ayesha R.",
      r: "Instagram reseller · Lahore",
    },
    {
      q: "Prices are genuinely lower than Hall Road. Saved almost Rs 40,000 in three months.",
      n: "Usman K.",
      r: "Daraz seller · Karachi",
    },
    {
      q: "The Thursday drop is the first thing I open every week. Feels like having an insider.",
      n: "Fatima M.",
      r: "Boutique owner · Islamabad",
    },
  ];
  return (
    <section className="border-b border-border/60 bg-secondary/30">
      <div className="mx-auto max-w-[1400px] px-6 py-14 md:py-18">
        <h2 className="mb-10 max-w-3xl font-heading text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-5xl">
          They switched.
          <br />
          <span className="text-primary">They stayed.</span>
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {t.map(x => (
            <figure key={x.n} className="border border-border bg-background p-8">
              <div className="font-heading text-6xl leading-none text-primary">&ldquo;</div>
              <blockquote className="mt-4 text-lg leading-relaxed text-foreground">{x.q}</blockquote>
              <figcaption className="mt-8 border-t border-border/60 pt-4 font-mono text-xs uppercase tracking-widest">
                <div className="text-foreground">{x.n}</div>
                <div className="text-muted-foreground">{x.r}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="register" className="relative overflow-hidden bg-primary text-primary-foreground">
      <div className="mx-auto max-w-[1400px] px-6 py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <div className="mb-4 font-mono text-xs uppercase tracking-widest opacity-80">
              Ready to order smarter?
            </div>
            <h2 className="font-heading text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Skip the middlemen.
              <br />
              Sell the trend.
            </h2>
          </div>
          <div className="lg:col-span-4">
            <p className="mb-6 text-primary-foreground/80">
              Join 500+ verified resellers already sourcing with The Local Baba. Free to join. Takes
              60 seconds.
            </p>
            <Link
              href="/apply"
              className="group inline-flex items-center gap-2 border-2 border-primary-foreground bg-primary-foreground px-6 py-4 font-mono text-sm font-bold uppercase tracking-widest text-primary transition hover:bg-transparent hover:text-primary-foreground"
            >
              Register free
              <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-primary-foreground/20">
        <div className="flex gap-8 overflow-hidden py-3 font-mono text-xs font-bold uppercase tracking-widest">
          <div className="animate-marquee flex shrink-0 gap-8 whitespace-nowrap pl-8">
            {[...marquee, ...marquee].map((m, i) => (
              <span key={i} className="flex items-center gap-8">
                {m}
                <span aria-hidden>◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-background">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center bg-primary font-mono text-sm font-bold text-primary-foreground">
              LB
            </span>
            <span className="font-heading text-lg font-bold tracking-tight">THE LOCAL BABA</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            The B2B sourcing platform for Pakistani resellers. Direct-importer rates, tested SKUs,
            48-hour dispatch.
          </p>
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Platform
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a href="#catalog" className="hover:text-primary">
                Catalog
              </a>
            </li>
            <li>
              <a href="#sourcing" className="hover:text-primary">
                Sourcing
              </a>
            </li>
            <li>
              <a href="#how" className="hover:text-primary">
                How it works
              </a>
            </li>
            <li>
              <a href="#savings" className="hover:text-primary">
                Pricing
              </a>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Company
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/apply" className="hover:text-primary">
                Register
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-primary">
                Sign in
              </Link>
            </li>
            <li>
              <a href="#" className="hover:text-primary">
                Terms
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-primary">
                Privacy
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <span>© 2026 The Local Baba · Karachi · Lahore · Islamabad</span>
          <span>Made with ◆ for resellers</span>
        </div>
      </div>
    </footer>
  );
}
