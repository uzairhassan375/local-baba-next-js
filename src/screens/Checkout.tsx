import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Copy, Check } from "lucide-react";

const cities = ["Lahore", "Karachi", "Islamabad", "Faisalabad", "Rawalpindi", "Multan", "Peshawar", "Quetta", "Other"];

const provinceMap: Record<string, string> = {
  Lahore: "Punjab", Faisalabad: "Punjab", Rawalpindi: "Punjab", Multan: "Punjab",
  Karachi: "Sindh", Islamabad: "ICT", Peshawar: "KPK", Quetta: "Balochistan",
};

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { member } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [form, setForm] = useState({
    name: member?.name || "", whatsapp: member?.whatsapp || "",
    address: "", city: member?.city || "", landmark: "", notes: "", promo: "",
  });

  const province = provinceMap[form.city] || "";

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.whatsapp || !form.address || !form.city || !paymentMethod) return;
    setLoading(true);
    setTimeout(() => {
      clearCart();
      router.push("/order/LB-2847");
    }, 1500);
  };

  if (items.length === 0) {
    return (
      <div className="p-8 text-center animate-fade-in-up">
        <h2 className="font-heading font-bold text-2xl mb-2">Your cart is empty</h2>
        <Link href="/catalogue" className="text-primary hover:underline">Browse catalogue →</Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 animate-fade-in-up">
      <h1 className="font-heading font-bold text-2xl md:text-3xl mb-6">Checkout</h1>
      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-5 gap-8">
          {/* Form */}
          <div className="md:col-span-3 space-y-6">
            {/* Delivery */}
            <div className="bg-card rounded-card border border-border p-6 space-y-4">
              <h2 className="font-heading font-semibold text-lg">Delivery details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="text-sm font-medium block mb-1">Full name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:outline-none" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-sm font-medium block mb-1">WhatsApp number *</label>
                  <div className="flex">
                    <span className="h-11 px-3 flex items-center text-sm bg-muted border border-r-0 border-border rounded-l-lg text-muted-foreground">+92</span>
                    <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} required className="flex-1 h-11 px-3 rounded-r-lg border border-border bg-card focus:border-primary focus:outline-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Full delivery address *</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-card focus:border-primary focus:outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">City *</label>
                  <select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required className="w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:outline-none">
                    <option value="">Select</option>
                    {cities.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Province</label>
                  <input value={province} readOnly className="w-full h-11 px-3 rounded-lg border border-border bg-muted text-muted-foreground" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Nearest landmark</label>
                <input value={form.landmark} onChange={e => setForm({ ...form, landmark: e.target.value })} placeholder="e.g. near Packages Mall" className="w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:outline-none" />
              </div>
            </div>

            {/* Payment */}
            <div className="bg-card rounded-card border border-border p-6 space-y-4">
              <h2 className="font-heading font-semibold text-lg">Payment method</h2>
              {[
                { id: "bank_transfer", label: "Bank Transfer", desc: "Most popular among our sellers", icon: "🏦" },
                { id: "easypaisa", label: "EasyPaisa / JazzCash", desc: "Mobile wallet payment", icon: "📱" },
                { id: "cod", label: "Cash on Delivery", desc: "Available in Lahore, Karachi, Islamabad for orders under Rs 30,000", icon: "💵" },
              ].map(pm => (
                <div key={pm.id}>
                  <button type="button" onClick={() => setPaymentMethod(pm.id)}
                    className={`w-full p-4 rounded-card border text-left transition-colors ${paymentMethod === pm.id ? "border-primary bg-primary/5" : "border-border hover:border-primary"}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{pm.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{pm.label}</p>
                        <p className="text-xs text-muted-foreground">{pm.desc}</p>
                      </div>
                    </div>
                  </button>
                  {paymentMethod === "bank_transfer" && pm.id === "bank_transfer" && (
                    <div className="mt-3 p-4 bg-muted rounded-lg text-sm space-y-1 animate-fade-in-up">
                      <p>Bank: <strong>Meezan Bank</strong></p>
                      <p>Account: <strong>The Local Baba Trading</strong></p>
                      <div className="flex items-center gap-2">
                        <p>IBAN: <strong className="font-mono">PK00MEZN000123456789</strong></p>
                        <button type="button" onClick={() => handleCopy("PK00MEZN000123456789")} className="text-primary">
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      <p className="text-muted-foreground text-xs mt-2">Transfer exact amount within 24 hours. Use your Order ID as reference.</p>
                    </div>
                  )}
                  {paymentMethod === "easypaisa" && pm.id === "easypaisa" && (
                    <div className="mt-3 p-4 bg-muted rounded-lg text-sm animate-fade-in-up">
                      <div className="flex items-center gap-2">
                        <p>Number: <strong className="font-mono">0300-1234567</strong></p>
                        <button type="button" onClick={() => handleCopy("03001234567")} className="text-primary">
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="bg-card rounded-card border border-border p-6">
              <label className="text-sm font-medium block mb-1">Order notes (optional)</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any special instructions for packing or delivery?" rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-card focus:border-primary focus:outline-none resize-none" />
            </div>

            <button type="submit" disabled={loading || !paymentMethod}
              className="w-full h-[52px] rounded-lg bg-primary text-primary-foreground font-heading font-semibold text-lg hover:bg-accent-hover transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
              {loading && <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
              Place order →
            </button>
          </div>

          {/* Summary */}
          <div className="md:col-span-2">
            <div className="sticky top-20 bg-card rounded-card border border-border p-6 shadow-subtle space-y-4">
              <h2 className="font-heading font-semibold text-lg">Order summary</h2>
              {items.map(item => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="flex-1 pr-2">{item.name} <span className="text-muted-foreground">×{item.qty}</span></span>
                  <span className="font-medium">Rs {(item.pricePerPc * item.qty).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>Rs {total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="text-muted-foreground text-xs">Calculated after dispatch</span>
                </div>
                <div className="flex justify-between font-heading font-bold text-xl pt-2 border-t border-border">
                  <span>Total</span>
                  <span>Rs {total.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <input value={form.promo} onChange={e => setForm({ ...form, promo: e.target.value })} placeholder="Promo code" className="flex-1 h-10 px-3 rounded-lg border border-border bg-card text-sm focus:border-primary focus:outline-none" />
                <button type="button" className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-muted">Apply</button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
