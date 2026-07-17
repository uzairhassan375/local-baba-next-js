"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function PrivacyPage() {
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
        <h1 className="font-heading text-4xl font-bold tracking-tight md:text-5xl">Privacy Policy</h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">Last updated: July 2026</p>

        <div className="mt-12 space-y-10 text-muted-foreground leading-relaxed text-justify">

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">1. Information We Collect</h2>
            <p className="font-semibold text-foreground mt-4 mb-2">Information you provide directly:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><span className="font-medium text-foreground">Registration details:</span> name, email address, WhatsApp/phone number, and information about your business or what you sell.</li>
              <li><span className="font-medium text-foreground">Order information:</span> shipping/delivery address, products ordered, quantities, and order history.</li>
              <li><span className="font-medium text-foreground">Payment-related information:</span> payment method details and transaction confirmations (note: sensitive payment card data, if applicable, is processed by our payment partners and is not stored directly by us).</li>
              <li><span className="font-medium text-foreground">Communications:</span> messages you send us via WhatsApp, email, or the Platform, including support requests.</li>
            </ul>
            <p className="font-semibold text-foreground mt-5 mb-2">Information collected automatically:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><span className="font-medium text-foreground">Device and usage data:</span> IP address, browser type, pages visited, time spent on the Platform, and referring pages.</li>
              <li>Cookies and similar technologies used to keep you signed in, remember preferences, and understand how the Platform is used.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Create and manage your account, and verify you as a legitimate reseller/buyer.</li>
              <li>Process, confirm, and dispatch your orders, and provide order tracking via WhatsApp or the Platform.</li>
              <li>Communicate with you about drops, new SKUs, pricing, order status, and customer support.</li>
              <li>Calculate and display catalog stock, pricing, and margin information.</li>
              <li>Improve, secure, and troubleshoot the Platform, and understand how resellers use our catalog.</li>
              <li>Detect and prevent fraud, abuse, or violations of our Terms of Service.</li>
              <li>Comply with legal, tax, and regulatory obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">3. How We Share Your Information</h2>
            <p>We do not sell your personal information. We may share information with:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li><span className="font-medium text-foreground">Logistics & courier partners</span> — to deliver your orders and provide tracking.</li>
              <li><span className="font-medium text-foreground">Payment processors</span> — to process payments securely.</li>
              <li><span className="font-medium text-foreground">Service providers</span> — such as hosting, analytics, WhatsApp business messaging, and customer support tools, who process data on our behalf.</li>
              <li><span className="font-medium text-foreground">Suppliers/factories,</span> only where necessary and in aggregated or limited form (e.g., for fulfillment), not for their independent marketing use.</li>
              <li><span className="font-medium text-foreground">Legal & regulatory authorities,</span> where required by law, to enforce our Terms, or to protect the rights, safety, or property of The Local Baba, our users, or others.</li>
              <li><span className="font-medium text-foreground">Business transfers</span> — if The Local Baba is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">4. WhatsApp Communications</h2>
            <p>Because order tracking, drops, and support are communicated via WhatsApp, by registering with your WhatsApp number you consent to receive order-related and, where you opt in, promotional messages from us on WhatsApp. You may opt out of promotional messages at any time by contacting us or following opt-out instructions provided in the message.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">5. Cookies</h2>
            <p>We use cookies and similar technologies to operate the Platform (e.g., keeping you logged in), understand usage patterns, and improve your experience. You can control cookies through your browser settings; disabling certain cookies may affect Platform functionality.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">6. Data Retention</h2>
            <p>We retain your personal information for as long as your account is active or as needed to provide our services, comply with legal/tax obligations, resolve disputes, and enforce our agreements. When no longer needed, we take reasonable steps to delete or anonymize your data.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">7. Data Security</h2>
            <p>We take reasonable technical and organizational measures to protect your information from unauthorized access, loss, misuse, or alteration. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">8. Your Rights & Choices</h2>
            <p>Depending on applicable law, you may have the right to:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Access, correct, or update the personal information we hold about you.</li>
              <li>Request deletion of your account and associated data, subject to legal/record-keeping requirements (e.g., completed order records).</li>
              <li>Opt out of promotional communications (WhatsApp, email) at any time.</li>
            </ul>
            <p className="mt-3">To exercise these rights, contact us using the details in Section 11 below.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">9. Children&apos;s Privacy</h2>
            <p>The Platform is intended for business use by individuals aged 18 and older. We do not knowingly collect information from anyone under 18.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will update the &quot;Last updated&quot; date above when changes are made, and material changes will be communicated where appropriate.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground mb-3">11. Contact Us</h2>
            <p>If you have questions about this Privacy Policy or how we handle your data, please contact us through the Platform or via the contact details provided at registration.</p>
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
