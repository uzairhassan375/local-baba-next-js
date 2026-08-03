"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Receipt, Trash2, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  fetchManualInvoices,
  deleteManualInvoice,
  ManualInvoiceRecord,
} from "@/lib/api/manualInvoicesApi";

export default function MemberInvoiceHistoryPage() {
  const [invoices, setInvoices] = useState<ManualInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setInvoices(await fetchManualInvoices());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this invoice from your history?")) return;
    const result = await deleteManualInvoice(id);
    if (result.success) {
      toast.info("Invoice removed.");
      setInvoices(prev => prev.filter(i => i.id !== id));
    } else {
      toast.error(result.error || "Could not remove invoice.");
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in-up">
      <div>
        <Link href="/invoice" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary mb-3">
          <ChevronLeft size={14} /> Back to Invoice
        </Link>
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-primary/10 text-primary">
            <Receipt size={22} />
          </span>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">Invoice History</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"} saved
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="p-12 text-center text-muted-foreground text-sm">Loading your invoices…</div>
      )}

      {!loading && invoices.length === 0 && (
        <div className="bg-card rounded-card border border-dashed border-border p-12 text-center space-y-4 max-w-md mx-auto my-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
            <Receipt size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading font-bold text-lg text-foreground">No invoices yet</h3>
            <p className="text-sm text-muted-foreground">
              Create your first invoice — it&apos;s free.
            </p>
          </div>
          <Link
            href="/invoice"
            className="inline-flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-accent-hover transition-colors"
          >
            Create Invoice
          </Link>
        </div>
      )}

      {!loading && invoices.length > 0 && (
        <div className="bg-card border border-border rounded-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="py-3 px-4 font-medium">{inv.customerName}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">
                    {new Date(inv.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        inv.paymentStatus === "confirmed"
                          ? "bg-success/10 text-success"
                          : inv.paymentStatus === "failed"
                          ? "bg-danger/10 text-danger"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {inv.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">Rs {inv.total.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/invoice/history/${inv.id}`}
                        className="p-2 rounded-lg border border-border hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors"
                        title="View / print"
                      >
                        <Printer size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="p-2 rounded-lg border border-border hover:border-danger/50 text-muted-foreground hover:text-danger transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
