"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Printer } from "lucide-react";
import { fetchInvoiceSettings, InvoiceSettings } from "@/lib/api/invoiceSettingsApi";
import { fetchManualInvoiceById, ManualInvoiceRecord } from "@/lib/api/manualInvoicesApi";

export default function MemberInvoiceDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : undefined;
  const [invoice, setInvoice] = useState<ManualInvoiceRecord | null>(null);
  const [settings, setSettings] = useState<InvoiceSettings>({ companyName: "Local Baba", logoUrl: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchManualInvoiceById(id), fetchInvoiceSettings()]).then(([inv, s]) => {
      setInvoice(inv);
      setSettings(s);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading invoice…</div>;
  }
  if (!invoice) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Invoice not found</p>
        <Link href="/invoice/history" className="text-primary text-sm font-semibold hover:underline">
          Back to Invoice History
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in-up max-w-4xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/invoice/history" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
          <ChevronLeft size={14} /> Back to Invoice History
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Printer size={16} /> Print
        </button>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-detail-print, #invoice-detail-print * { visibility: visible !important; }
          #invoice-detail-print {
            position: fixed !important; left: 0 !important; top: 0 !important;
            width: 100% !important; background: white !important; color: black !important;
            z-index: 999999 !important; padding: 30px !important; box-sizing: border-box !important;
            font-family: Arial, sans-serif !important;
          }
        }
      `}</style>
      <div id="invoice-detail-print" className="bg-white text-black rounded-card border border-border p-8 space-y-6 text-xs leading-relaxed">
        <div className="flex justify-between items-start border-b border-gray-900 pb-5">
          <div className="flex items-start gap-4">
            {settings.logoUrl && (
              <img src={settings.logoUrl} alt={`${settings.companyName} Logo`} className="h-14 w-auto object-contain shrink-0" />
            )}
            <div>
              <h1 className="font-bold text-2xl text-black tracking-tight font-heading">{settings.companyName}</h1>
              <p className="text-xs font-semibold text-gray-700">Wholesale B2B Sourcing Platform for Pakistani Retailers</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-black text-white text-xs font-mono font-bold tracking-widest rounded mb-2">INVOICE</span>
            <p className="text-base font-mono font-extrabold text-gray-900">{invoice.invoiceNumber}</p>
            <p className="text-xs text-gray-600">
              Date: {new Date(invoice.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </p>
            <p className="text-xs font-semibold text-gray-700">
              Payment Status: <span className="uppercase text-emerald-700 font-bold">{invoice.paymentStatus}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded border border-gray-200">
          <div>
            <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-1">Billed To:</p>
            <p className="font-bold text-sm text-gray-900">{invoice.customerName}</p>
            <p className="text-gray-700">{invoice.deliveryAddress}</p>
            <p className="text-gray-700 font-semibold">{invoice.city}, Pakistan</p>
          </div>
          <div>
            <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-1">Contact & Payment Details:</p>
            <p className="text-gray-700 font-mono">Phone: {invoice.customerPhone || "N/A"}</p>
            <p className="text-gray-700 uppercase font-semibold">Payment Method: {invoice.paymentMethod.replace("_", " ")}</p>
          </div>
        </div>

        <table className="w-full text-left border-collapse border-y border-gray-300">
          <thead>
            <tr className="bg-gray-100 text-gray-800 font-bold text-xs uppercase tracking-wider">
              <th className="py-2.5 px-3 border-b border-gray-300">#</th>
              <th className="py-2.5 px-3 border-b border-gray-300">Item Description</th>
              <th className="py-2.5 px-3 border-b border-gray-300 text-right">Qty</th>
              <th className="py-2.5 px-3 border-b border-gray-300 text-right">Unit Rate</th>
              <th className="py-2.5 px-3 border-b border-gray-300 text-right">Item Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono">
            {invoice.items.map((it, idx) => (
              <tr key={idx}>
                <td className="py-2 px-3 text-gray-500 font-bold">{idx + 1}</td>
                <td className="py-2 px-3 font-sans font-medium text-gray-900">{it.description}</td>
                <td className="py-2 px-3 text-right">{it.qty}</td>
                <td className="py-2 px-3 text-right">Rs {it.rate.toLocaleString()}</td>
                <td className="py-2 px-3 text-right font-bold">Rs {it.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-start pt-2">
          <div className="max-w-[50%] space-y-1">
            {invoice.notes && (
              <div className="text-[11px] text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
                <p className="font-bold text-gray-800 mb-0.5">Notes & Terms:</p>
                <p>{invoice.notes}</p>
              </div>
            )}
          </div>
          <div className="w-64 space-y-1 text-right font-mono text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-gray-900">Rs {invoice.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Charges:</span>
              <span className="font-semibold text-gray-900">Rs {invoice.deliveryCharges.toLocaleString()}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount:</span>
                <span>- Rs {invoice.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-black border-t-2 border-gray-900 pt-2 mt-2">
              <span>Grand Total:</span>
              <span>Rs {invoice.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-300 pt-6 text-center text-[10px] text-gray-500 space-y-1">
          <p className="font-bold text-gray-700">Thank you for sourcing with {settings.companyName}!</p>
          <p>Computer-generated invoice document. Valid without physical signature.</p>
        </div>
      </div>
    </div>
  );
}
