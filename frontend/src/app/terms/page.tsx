"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground font-body">
      {/* Nav — same as landing */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md" style={{ borderBottom: '0.5px solid rgb(249 115 22)' }}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center bg-primary font-mono text-sm font-bold text-primary-foreground">
              LB
            </span>
            <span className="font-heading text-lg font-bold tracking-tight">THE LOCAL BABA</span>
          </Link>
          <nav className="hidden items-center gap-8 font-mono text-xs uppercase tracking-widest text-primary md:flex">
            <Link href="/#catalog" className="transition duration-200 hover:text-primary/80">Catalog</Link>
            <Link href="/#sourcing" className="transition duration-200 hover:text-primary/80">Sourcing</Link>
            <Link href="/#how" className="transition duration-200 hover:text-primary/80">How it works</Link>
            <Link href="/#savings" className="transition duration-200 hover:text-primary/80">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground sm:inline">
              Sign in
            </Link>
            <Link href="/apply" className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-slate-950 via-slate-800 to-slate-700 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition duration-200 hover:-translate-y-[0.35px] hover:shadow-lg">
              Register free
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[860px] px-6 pt-32 pb-20">
        <div className="mb-4 font-mono text-xs uppercase tracking-widest text-primary">Legal</div>
        <h1 className="font-heading text-4xl font-bold tracking-tight md:text-5xl">Terms of Service</h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">Last updated: July 2026</p>

        <div className="mt-12 space-y-10 text-muted-foreground leading-relaxed text-justify">

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">1. Who Can Use The Local Baba</h2>
            <p>The Local Baba is a B2B (business-to-business) sourcing platform intended for resellers, retailers, e-commerce sellers, and other business buyers — not individual end consumers. To register, you must:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Be at least 18 years old and able to enter into a legally binding contract.</li>
              <li>Provide accurate details about yourself and your business, including a valid email address and WhatsApp number.</li>
              <li>Use the Platform for legitimate reselling or business purposes.</li>
            </ul>
            <p className="mt-3">We reserve the right to approve, decline, suspend, or terminate any account at our discretion, including where information provided is inaccurate, incomplete, or where activity on the account appears fraudulent or abusive.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">2. Account Registration</h2>
            <p>When you register, you agree to:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Keep your login credentials confidential and be responsible for all activity under your account.</li>
              <li>Notify us promptly of any unauthorized use of your account.</li>
              <li>Update your business and contact information if it changes.</li>
            </ul>
            <p className="mt-3">Registration is free and does not guarantee access to every SKU, drop, or catalog item, which may be limited by stock availability.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">3. Orders, Pricing & Minimum Order Quantity (MOQ)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>All products are offered subject to a minimum order quantity (MOQ), currently as low as 30 pieces per SKU, unless otherwise stated on the product listing.</li>
              <li>Prices displayed on the Platform reflect direct-importer wholesale rates and are subject to change without prior notice due to sourcing costs, exchange rates, duties, or supplier pricing.</li>
              <li>Placing an order constitutes an offer to purchase, which we may accept or decline. An order is confirmed only once you receive confirmation via the Platform or WhatsApp.</li>
              <li>Stock levels shown are indicative and may change in real time; we are not liable if a SKU sells out after you have added it to cart but before checkout is completed.</li>
              <li>We reserve the right to limit order quantities per buyer, particularly during high-demand "drops."</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">4. Dispatch & Delivery</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We aim to dispatch confirmed orders within 48 hours, subject to product availability, payment confirmation, and courier operations.</li>
              <li>Delivery timelines after dispatch depend on your location within Pakistan and our courier/logistics partners, and are estimates only, not guaranteed delivery windows.</li>
              <li>Order tracking will be shared via WhatsApp or the Platform where available.</li>
              <li>Risk of loss and title to products passes to you upon dispatch to the courier, unless otherwise required by applicable law.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">5. Payments</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Accepted payment methods will be displayed at checkout or communicated via our sales team.</li>
              <li>You are responsible for ensuring payments are made accurately and on time. Orders may be held or cancelled if payment is not received or verified.</li>
              <li>All prices are in Pakistani Rupees (PKR) unless stated otherwise and are exclusive of any applicable duties, taxes, or courier charges unless explicitly stated as inclusive.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">6. Returns, Refunds & Quality Issues</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Because products are sold in bulk B2B lots, returns are handled on a case-by-case basis and are generally limited to verifiable manufacturing defects, incorrect items, or damage during transit.</li>
              <li>Claims for defective, damaged, or incorrect items must be reported within a reasonable period (e.g., 48–72 hours of delivery) with supporting evidence (photos/videos), after which we will assess eligibility for replacement, credit, or refund.</li>
              <li>We do not accept returns for reasons of changed preference, slow-moving stock, or normal variation in imported goods (e.g., minor packaging or shade variance), except where required by law.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">7. Product Listings & Sourcing</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We make reasonable efforts to verify factories, quality-check inventory, and accurately describe products, but product images, colors, and specifications may vary slightly from the physical item due to sourcing from third-party manufacturers.</li>
              <li>Trend information, projected margins, or "savings" estimates shown on the Platform are illustrative only and do not guarantee resale performance or profit.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">8. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Use the Platform for any unlawful purpose, including reselling counterfeit, prohibited, or restricted goods.</li>
              <li>Misrepresent your identity, business, or intentions when registering or ordering.</li>
              <li>Attempt to circumvent MOQs, pricing, or access controls, or resell your account access to others.</li>
              <li>Scrape, copy, or misuse catalog data, pricing, or supplier information for purposes outside your own business use.</li>
              <li>Interfere with the security or normal operation of the Platform.</li>
            </ul>
            <p className="mt-3">Violation of this section may result in suspension or termination of your account and forfeiture of pending orders.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">9. Intellectual Property</h2>
            <p>All content on the Platform — including the "The Local Baba" name, logo, catalog design, sourcing content, and website materials — is owned by us or our licensors and may not be copied, reproduced, or used without our prior written consent, except as necessary for your own business use of purchased inventory.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, The Local Baba shall not be liable for indirect, incidental, or consequential damages, including lost profits or lost sales, arising from your use of the Platform or purchased inventory. Our total liability for any claim relating to an order shall not exceed the amount paid for that order.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">11. Disclaimer</h2>
            <p>The Platform and all products are provided on an "as available" basis. While we vet suppliers and quality-check inventory, we do not guarantee that products will be free of all defects, meet every buyer's specific resale requirements, or achieve any particular sales outcome.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">12. Changes to These Terms</h2>
            <p>We may update these Terms from time to time. Continued use of the Platform after changes are posted constitutes acceptance of the revised Terms. We will update the "Last updated" date above when changes are made.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">13. Governing Law</h2>
            <p>These Terms are governed by the laws of the Islamic Republic of Pakistan, and any disputes shall be subject to the exclusive jurisdiction of the courts of Pakistan.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">14. Contact Us</h2>
            <p>If you have questions about these Terms, please contact us through the Platform or via the contact details provided at registration.</p>
          </section>

        </div>
      </div>

      {/* Footer — same as landing */}
      <footer className="bg-orange-500 text-white">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-16 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center bg-white font-mono text-sm font-bold text-orange-500">LB</span>
              <span className="font-heading text-lg font-bold tracking-tight text-white">THE LOCAL BABA</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-white/80">
              The B2B sourcing platform for Pakistani resellers. Direct-importer rates, tested SKUs, 48-hour dispatch.
            </p>
            <div className="mt-4 space-y-1">
              <p className="text-sm text-white/80"><span className="font-semibold text-white">Head Office:</span> 206-CCA2 Phase 6 DHA Lahore</p>
              <p className="text-sm text-white/80"><span className="font-semibold text-white">Shop:</span> G-131 Central Plaza Karachi</p>
              <p className="text-sm text-white/80"><span className="font-semibold text-white">Warehouse:</span> —</p>
            </div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-white font-bold">Platform</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/#catalog" className="text-white hover:text-slate-800 transition-colors">Catalog</Link></li>
              <li><Link href="/#sourcing" className="text-white hover:text-slate-800 transition-colors">Sourcing</Link></li>
              <li><Link href="/#how" className="text-white hover:text-slate-800 transition-colors">How it works</Link></li>
              <li><Link href="/#savings" className="text-white hover:text-slate-800 transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-white font-bold">Company</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/apply" className="text-white hover:text-slate-800 transition-colors">Register</Link></li>
              <li><Link href="/login" className="text-white hover:text-slate-800 transition-colors">Sign in</Link></li>
              <li><Link href="/terms" className="text-white hover:text-slate-800 transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-white hover:text-slate-800 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/20">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-6 font-mono text-[11px] uppercase tracking-widest text-white/70">
            <span>© 2026 The Local Baba · Karachi · Lahore · Islamabad</span>
            <span>Made with ◆ for resellers</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
