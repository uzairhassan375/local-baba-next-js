"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, Printer, Save, History, Receipt, ImagePlus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchInvoiceSettings,
  updateInvoiceSettings,
  uploadInvoiceLogo,
  resetInvoiceSettings,
  InvoiceSettings,
} from "@/lib/api/invoiceSettingsApi";
import { createManualInvoice, ManualInvoiceItem } from "@/lib/api/manualInvoicesApi";

type FormItem = { description: string; qty: number; rate: number };

const emptyForm = {
  customerName: "",
  customerPhone: "",
  deliveryAddress: "",
  city: "",
  paymentMethod: "bank_transfer",
  paymentStatus: "confirmed" as "pending" | "confirmed" | "failed",
  dueDate: "",
  deliveryCharges: "" as number | "",
  discount: "" as number | "",
  notes: "",
  items: [] as FormItem[],
};

export default function MemberInvoicePage() {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<InvoiceSettings>({ companyName: "Local Baba", logoUrl: null });
  const [previewInvoiceNumber, setPreviewInvoiceNumber] = useState("");

  const [brandingNameDraft, setBrandingNameDraft] = useState("");
  const [savingBrandingName, setSavingBrandingName] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [resettingBranding, setResettingBranding] = useState(false);

  const generatePreviewInvoiceNumber = () => `INV-LB-${Math.floor(100000 + Math.random() * 900000)}`;

  useEffect(() => {
    fetchInvoiceSettings().then(s => {
      setSettings(s);
      setBrandingNameDraft(s.companyName);
    });
    setPreviewInvoiceNumber(generatePreviewInvoiceNumber());
  }, []);

  const handleSaveBrandingName = async () => {
    const trimmed = brandingNameDraft.trim();
    if (!trimmed) {
      toast.error("Company name can't be empty.");
      return;
    }
    setSavingBrandingName(true);
    const res = await updateInvoiceSettings({ companyName: trimmed });
    if (res.success && res.settings) {
      setSettings(res.settings);
      toast.success("Your invoice branding was updated.");
    } else {
      toast.error(res.error || "Failed to update company name.");
    }
    setSavingBrandingName(false);
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingLogo(true);
    const upload = await uploadInvoiceLogo(file);
    if (!upload.success || !upload.url) {
      toast.error(upload.error || "Failed to upload logo.");
      setUploadingLogo(false);
      return;
    }
    const res = await updateInvoiceSettings({ logoUrl: upload.url });
    if (res.success && res.settings) {
      setSettings(res.settings);
      toast.success("Your invoice logo was updated.");
    } else {
      toast.error(res.error || "Failed to save logo.");
    }
    setUploadingLogo(false);
  };

  const handleResetBranding = async () => {
    setResettingBranding(true);
    const res = await resetInvoiceSettings();
    if (res.success && res.settings) {
      setSettings(res.settings);
      setBrandingNameDraft(res.settings.companyName);
      toast.success("Branding reset to the platform default.");
    } else {
      toast.error(res.error || "Failed to reset branding.");
    }
    setResettingBranding(false);
  };

  const subtotal = useMemo(
    () => form.items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0),
    [form.items]
  );

  const grandTotal = useMemo(() => {
    const delivery = form.deliveryCharges === "" ? 0 : Number(form.deliveryCharges);
    const discount = form.discount === "" ? 0 : Number(form.discount);
    return Math.max(0, subtotal + delivery - discount);
  }, [subtotal, form.deliveryCharges, form.discount]);

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, { description: "", qty: 1, rate: 0 }] }));

  const updateItem = (index: number, field: keyof FormItem, value: string | number) => {
    setForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const removeItem = (index: number) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handlePrint = async () => {
    // Pull the latest saved branding right before printing — component
    // state can otherwise lag behind (e.g. a save that raced the initial
    // fetch, or a cached client-side navigation), which would print
    // outdated logo/company name.
    const latest = await fetchInvoiceSettings();
    setSettings(latest);
    window.print();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim()) {
      toast.error("Please enter the customer's name.");
      return;
    }
    if (form.items.length === 0) {
      toast.error("Please add at least one line item.");
      return;
    }

    setSaving(true);
    const result = await createManualInvoice({
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      deliveryAddress: form.deliveryAddress,
      city: form.city,
      items: form.items,
      deliveryCharges: form.deliveryCharges === "" ? 0 : Number(form.deliveryCharges),
      discount: form.discount === "" ? 0 : Number(form.discount),
      paymentMethod: form.paymentMethod,
      paymentStatus: form.paymentStatus,
      dueDate: form.dueDate || undefined,
      notes: form.notes || undefined,
    });
    setSaving(false);

    if (result.success && result.invoice) {
      toast.success(`Invoice #${result.invoice.invoiceNumber} saved!`);
      setPreviewInvoiceNumber(generatePreviewInvoiceNumber());
      setForm(emptyForm);
    } else {
      toast.error(result.error || "Failed to save invoice.");
    }
  };

  const printItems: ManualInvoiceItem[] = form.items.map(it => ({
    description: it.description || "Item",
    qty: Number(it.qty) || 0,
    rate: Number(it.rate) || 0,
    amount: (Number(it.qty) || 0) * (Number(it.rate) || 0),
  }));

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Receipt size={22} />
            </span>
            <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground">Invoice</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 ml-1">
              FREE
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Create and print professional invoices for your own customers — free, no subscription required.
          </p>
        </div>

        <Link
          href="/invoice/history"
          className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors self-start md:self-auto shadow-sm"
        >
          <History size={16} />
          Invoice History
        </Link>
      </div>

      {/* Branding editor */}
      <div className="print:hidden bg-card border border-border rounded-card p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-14 h-14 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Your invoice logo" className="w-full h-full object-contain" />
            ) : (
              <ImagePlus size={20} className="text-muted-foreground" />
            )}
          </div>
          <label className="text-xs font-bold px-3 py-2 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors">
            {uploadingLogo ? "Uploading…" : "Change Logo"}
            <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo} onChange={e => void handleLogoFileChange(e)} />
          </label>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
          <div className="flex-1">
            <Label className="mb-1 block text-xs">Company name on your invoices</Label>
            <Input
              value={brandingNameDraft}
              onChange={e => setBrandingNameDraft(e.target.value)}
              className="h-9 bg-background"
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSaveBrandingName()}
            disabled={savingBrandingName || brandingNameDraft.trim() === settings.companyName}
            className="h-9"
          >
            {savingBrandingName ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void handleResetBranding()}
            disabled={resettingBranding || !settings.isCustom}
            className="h-9 gap-1.5"
          >
            <RotateCcw size={14} /> {resettingBranding ? "Resetting…" : "Reset"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 print:hidden">
        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs bg-card border border-border rounded-card p-5">
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-muted-foreground">Invoice Details</span>
            <span className="text-xs font-mono text-muted-foreground">ID: {previewInvoiceNumber}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">Customer Name *</Label>
              <Input
                value={form.customerName}
                onChange={e => setForm({ ...form, customerName: e.target.value })}
                placeholder="Customer / Buyer name"
                className="h-9 bg-background"
              />
            </div>
            <div>
              <Label className="mb-1 block">Customer Phone</Label>
              <Input
                value={form.customerPhone}
                onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                placeholder="03XX-XXXXXXX"
                className="h-9 bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">Delivery Address</Label>
              <Input
                value={form.deliveryAddress}
                onChange={e => setForm({ ...form, deliveryAddress: e.target.value })}
                placeholder="Street, area"
                className="h-9 bg-background"
              />
            </div>
            <div>
              <Label className="mb-1 block">City</Label>
              <Input
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                placeholder="City"
                className="h-9 bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="mb-1 block">Payment Method</Label>
              <select
                value={form.paymentMethod}
                onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="easypaisa">EasyPaisa / JazzCash</option>
                <option value="cod">Cash on Delivery</option>
              </select>
            </div>
            <div>
              <Label className="mb-1 block">Payment Status</Label>
              <select
                value={form.paymentStatus}
                onChange={e => setForm({ ...form, paymentStatus: e.target.value as "pending" | "confirmed" | "failed" })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-bold"
              >
                <option value="confirmed">Confirmed / Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <Label className="mb-1 block">Due Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })}
                className="h-9 bg-background font-mono"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-muted-foreground">
                Line Items ({form.items.length})
              </span>
              <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-7 text-xs gap-1">
                <Plus size={12} /> Add item
              </Button>
            </div>

            {form.items.length > 0 ? (
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-background rounded-lg border border-border p-2">
                    <Input
                      value={item.description}
                      onChange={e => updateItem(idx, "description", e.target.value)}
                      placeholder="Item description"
                      className="h-8 flex-1 bg-card text-xs"
                    />
                    <Input
                      type="number"
                      value={item.qty}
                      onChange={e => updateItem(idx, "qty", Number(e.target.value))}
                      placeholder="Qty"
                      className="h-8 w-16 bg-card text-xs"
                    />
                    <Input
                      type="number"
                      value={item.rate}
                      onChange={e => updateItem(idx, "rate", Number(e.target.value))}
                      placeholder="Rate"
                      className="h-8 w-20 bg-card text-xs"
                    />
                    <span className="w-20 text-right font-semibold shrink-0">
                      Rs {((Number(item.qty) || 0) * (Number(item.rate) || 0)).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-danger hover:text-danger/80 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-4 text-center">No items added yet.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <div>
              <Label className="mb-1 block">Delivery Charges</Label>
              <Input
                type="number"
                value={form.deliveryCharges}
                onChange={e => setForm({ ...form, deliveryCharges: e.target.value === "" ? "" : Number(e.target.value) })}
                className="h-9 bg-background"
              />
            </div>
            <div>
              <Label className="mb-1 block">Discount</Label>
              <Input
                type="number"
                value={form.discount}
                onChange={e => setForm({ ...form, discount: e.target.value === "" ? "" : Number(e.target.value) })}
                className="h-9 bg-background"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 block">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Terms, thank-you note, etc."
              className="bg-background text-xs"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={saving} className="flex-1 gap-2">
              <Save size={14} /> {saving ? "Saving…" : "Save Invoice"}
            </Button>
            <Button type="button" variant="outline" onClick={handlePrint} className="gap-2">
              <Printer size={14} /> Print
            </Button>
          </div>
        </form>

        {/* Live preview */}
        <div className="bg-white text-black rounded-card border border-border p-6 space-y-5 text-xs shadow-card">
          <div className="flex justify-between items-start border-b border-gray-900 pb-4">
            <div className="flex items-start gap-3">
              {settings.logoUrl && (
                <img src={settings.logoUrl} alt={`${settings.companyName} Logo`} className="h-12 w-auto object-contain shrink-0" />
              )}
              <div>
                <h2 className="font-heading font-bold text-lg text-black">{settings.companyName}</h2>
                <p className="text-[10px] font-semibold text-gray-600">Wholesale B2B Sourcing Platform</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 bg-black text-white text-[10px] font-mono font-bold tracking-widest rounded mb-1">
                INVOICE
              </span>
              <p className="font-mono font-bold text-gray-900">{previewInvoiceNumber}</p>
              <p className="text-gray-600 uppercase font-semibold">{form.paymentStatus}</p>
            </div>
          </div>

          <div>
            <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-1">Billed To:</p>
            <p className="font-bold text-gray-900">{form.customerName || "Customer Name"}</p>
            <p className="text-gray-600">{form.deliveryAddress || "Delivery Address"}, {form.city || "City"}</p>
            <p className="text-gray-600">{form.customerPhone || "Phone Number"}</p>
          </div>

          <table className="w-full text-left border-collapse border-y border-gray-300">
            <thead>
              <tr className="bg-gray-100 text-gray-800 font-bold text-[10px] uppercase">
                <th className="py-2 px-2">Item</th>
                <th className="py-2 px-2 text-right">Qty</th>
                <th className="py-2 px-2 text-right">Rate</th>
                <th className="py-2 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono">
              {printItems.length > 0 ? (
                printItems.map((it, i) => (
                  <tr key={i}>
                    <td className="py-1.5 px-2 font-sans">{it.description}</td>
                    <td className="py-1.5 px-2 text-right">{it.qty}</td>
                    <td className="py-1.5 px-2 text-right">Rs {it.rate.toLocaleString()}</td>
                    <td className="py-1.5 px-2 text-right font-bold">Rs {it.amount.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-400">No items yet</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-56 space-y-1 text-right font-mono">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-gray-900">Rs {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery:</span>
                <span className="font-semibold text-gray-900">Rs {(Number(form.deliveryCharges) || 0).toLocaleString()}</span>
              </div>
              {Number(form.discount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount:</span>
                  <span>- Rs {Number(form.discount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-black border-t-2 border-gray-900 pt-2 mt-1">
                <span>Total:</span>
                <span>Rs {grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {form.notes && (
            <div className="text-[10px] text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
              <p className="font-bold text-gray-800 mb-0.5">Notes:</p>
              <p>{form.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Dedicated printable document */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #member-invoice-print, #member-invoice-print * { visibility: visible !important; }
          #member-invoice-print {
            position: fixed !important; left: 0 !important; top: 0 !important;
            width: 100% !important; background: white !important; color: black !important;
            z-index: 999999 !important; padding: 30px !important; box-sizing: border-box !important;
            font-family: Arial, sans-serif !important;
          }
        }
      `}</style>
      <div id="member-invoice-print" className="hidden print:block bg-white text-black p-8 space-y-6 text-xs leading-relaxed">
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
            <p className="text-base font-mono font-extrabold text-gray-900">{previewInvoiceNumber}</p>
            <p className="text-xs text-gray-600">Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
            <p className="text-xs font-semibold text-gray-700">
              Payment Status: <span className="uppercase text-emerald-700 font-bold">{form.paymentStatus}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded border border-gray-200">
          <div>
            <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-1">Billed To:</p>
            <p className="font-bold text-sm text-gray-900">{form.customerName || "Customer Name"}</p>
            <p className="text-gray-700">{form.deliveryAddress || "Delivery Address"}</p>
            <p className="text-gray-700 font-semibold">{form.city || "City"}, Pakistan</p>
          </div>
          <div>
            <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-1">Contact & Payment Details:</p>
            <p className="text-gray-700 font-mono">Phone: {form.customerPhone || "N/A"}</p>
            <p className="text-gray-700 uppercase font-semibold">Payment Method: {form.paymentMethod.replace("_", " ")}</p>
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
            {printItems.map((it, idx) => (
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
            {form.notes && (
              <div className="text-[11px] text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
                <p className="font-bold text-gray-800 mb-0.5">Notes & Terms:</p>
                <p>{form.notes}</p>
              </div>
            )}
          </div>
          <div className="w-64 space-y-1 text-right font-mono text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-gray-900">Rs {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Charges:</span>
              <span className="font-semibold text-gray-900">Rs {(Number(form.deliveryCharges) || 0).toLocaleString()}</span>
            </div>
            {Number(form.discount) > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount:</span>
                <span>- Rs {Number(form.discount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-black border-t-2 border-gray-900 pt-2 mt-2">
              <span>Grand Total:</span>
              <span>Rs {grandTotal.toLocaleString()}</span>
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
