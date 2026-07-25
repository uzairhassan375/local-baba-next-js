import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useOrders } from "@/contexts/OrdersContext";
import { Copy, Check, MapPin, Plus, Upload, X, ShieldAlert, CreditCard, Landmark, Smartphone } from "lucide-react";
import { toast } from "sonner";

const cities = ["Lahore", "Karachi", "Islamabad", "Faisalabad", "Rawalpindi", "Multan", "Peshawar", "Quetta", "Other"];

const provinceMap: Record<string, string> = {
  Lahore: "Punjab", Faisalabad: "Punjab", Rawalpindi: "Punjab", Multan: "Punjab",
  Karachi: "Sindh", Islamabad: "ICT", Peshawar: "KPK", Quetta: "Balochistan",
};

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { member } = useAuth();
  const { addresses, defaultAddress } = useProfile();
  const { addOrder } = useOrders();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [addressMode, setAddressMode] = useState<"saved" | "new">(addresses.length > 0 ? "saved" : "new");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(defaultAddress?.id ?? null);
  const [form, setForm] = useState({
    name: member?.name || "", whatsapp: member?.whatsapp || "",
    address: "", city: member?.city || "", landmark: "", notes: "", promo: "",
  });

  // Modal State for Payment Proof Upload
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string>("");
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (addressMode !== "saved" || !selectedAddressId) return;
    const addr = addresses.find(a => a.id === selectedAddressId);
    if (!addr) return;
    setForm(f => ({
      ...f,
      name: addr.name,
      whatsapp: addr.whatsapp,
      address: addr.address,
      city: addr.city,
      landmark: addr.landmark,
    }));
  }, [addressMode, selectedAddressId, addresses]);

  useEffect(() => {
    if (defaultAddress && !selectedAddressId) {
      setSelectedAddressId(defaultAddress.id);
    }
  }, [defaultAddress, selectedAddressId]);

  const province = provinceMap[form.city] || "";

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Screenshot file size should be less than 10MB");
      return;
    }

    setUploadingImage(true);
    const toastId = toast.loading("Uploading payment proof to Bunny Storage...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-payment-proof", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to upload to Bunny Storage");
      }

      setPaymentScreenshot(data.url);
      toast.success("Payment proof screenshot uploaded to Bunny CDN!", { id: toastId });
    } catch (err: any) {
      console.error("Bunny upload error:", err);
      toast.error(err.message || "Failed to upload screenshot. Please try again.", { id: toastId });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOpenPaymentModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.whatsapp || !form.address || !form.city || !paymentMethod) {
      toast.error("Please fill in all required delivery details.");
      return;
    }
    if (paymentMethod === "card") {
      toast.error("Credit/Debit card payment is coming soon. Please select Bank Transfer or EasyPaisa/JazzCash.");
      return;
    }
    setShowPaymentModal(true);
  };

  const handleFinalOrderSubmit = async () => {
    if (!paymentScreenshot) {
      toast.error("Please upload your payment screenshot/receipt image.");
      return;
    }

    setLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const createdOrder = await addOrder({
        customerName: form.name,
        memberId: user?.id || "m1",
        items: items.map(i => ({
          productId: i.productId,
          name: i.name,
          qty: i.qty,
          pricePerPc: i.pricePerPc,
          image: i.image,
        })),
        total,
        paymentMethod,
        paymentStatus: "pending",
        paymentScreenshot,
        transactionRef,
        deliveryAddress: `${form.address}${form.landmark ? `, ${form.landmark}` : ""}, ${form.city}`,
        city: form.city,
        notes: form.notes,
      });

      clearCart();
      setShowPaymentModal(false);
      toast.success("Order placed! Payment confirmation is pending admin verification.");
      router.push(`/order/${createdOrder.id}`);
    } catch (err) {
      console.error("Order placement failed:", err);
      toast.error("Order placement failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
      <form onSubmit={handleOpenPaymentModal}>
        <div className="grid md:grid-cols-5 gap-8">
          {/* Form */}
          <div className="md:col-span-3 space-y-6">
            {/* Delivery */}
            <div className="bg-card rounded-card border border-border p-6 space-y-4">
              <h2 className="font-heading font-semibold text-lg">Delivery details</h2>

              {addresses.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAddressMode("saved")}
                    className={`flex-1 h-10 rounded-lg text-sm font-medium border transition-colors ${
                      addressMode === "saved" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <MapPin size={14} className="inline mr-1.5 -mt-0.5" />
                    Saved address
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddressMode("new")}
                    className={`flex-1 h-10 rounded-lg text-sm font-medium border transition-colors ${
                      addressMode === "new" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Plus size={14} className="inline mr-1.5 -mt-0.5" />
                    New address
                  </button>
                </div>
              )}

              {addressMode === "saved" && addresses.length > 0 && (
                <div className="space-y-2">
                  {addresses.map(addr => (
                    <label
                      key={addr.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAddressId === addr.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="accent-primary mt-1"
                      />
                      <div>
                        <p className="text-sm font-medium">{addr.label}{addr.isDefault ? " · Default" : ""}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{addr.name} · +92{addr.whatsapp}</p>
                        <p className="text-xs text-muted-foreground">{addr.address}, {addr.city}</p>
                      </div>
                    </label>
                  ))}
                  <Link href="/profile" className="text-xs text-primary hover:underline">Manage addresses in profile →</Link>
                </div>
              )}

              {(addressMode === "new" || addresses.length === 0) && (
                <>
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
                </>
              )}
            </div>

            {/* Payment Methods Section */}
            <div className="bg-card rounded-card border border-border p-6 space-y-4">
              <h2 className="font-heading font-semibold text-lg">Payment method</h2>
              
              {/* Option 1: Bank Transfer */}
              <div>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bank_transfer")}
                  className={`w-full p-4 rounded-card border text-left transition-colors flex items-center justify-between ${
                    paymentMethod === "bank_transfer" ? "border-primary bg-primary/5" : "border-border hover:border-primary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Landmark size={22} className="text-primary" />
                    <div>
                      <p className="font-medium text-sm">Direct Bank Transfer</p>
                      <p className="text-xs text-muted-foreground">Meezan Bank Account Transfer</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">Active</span>
                </button>

                {paymentMethod === "bank_transfer" && (
                  <div className="mt-3 p-4 bg-muted rounded-lg text-sm space-y-1 animate-fade-in-up border border-border">
                    <p>Bank: <strong>Meezan Bank</strong></p>
                    <p>Account Title: <strong>The Local Baba Trading</strong></p>
                    <div className="flex items-center gap-2">
                      <p>IBAN: <strong className="font-mono">PK00MEZN000123456789</strong></p>
                      <button type="button" onClick={() => handleCopy("PK00MEZN000123456789")} className="text-primary">
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Option 2: EasyPaisa / JazzCash */}
              <div>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("easypaisa")}
                  className={`w-full p-4 rounded-card border text-left transition-colors flex items-center justify-between ${
                    paymentMethod === "easypaisa" ? "border-primary bg-primary/5" : "border-border hover:border-primary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Smartphone size={22} className="text-primary" />
                    <div>
                      <p className="font-medium text-sm">EasyPaisa / JazzCash</p>
                      <p className="text-xs text-muted-foreground">Mobile Wallet Direct Payment</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">Active</span>
                </button>

                {paymentMethod === "easypaisa" && (
                  <div className="mt-3 p-4 bg-muted rounded-lg text-sm space-y-1 animate-fade-in-up border border-border">
                    <p>Account Title: <strong>The Local Baba</strong></p>
                    <div className="flex items-center gap-2">
                      <p>Mobile Number: <strong className="font-mono">0300 1234567</strong></p>
                      <button type="button" onClick={() => handleCopy("03001234567")} className="text-primary">
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Option 3: Credit / Debit Card (COMING SOON) */}
              <div>
                <div
                  className="w-full p-4 rounded-card border border-border bg-muted/30 opacity-70 cursor-not-allowed flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard size={22} className="text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm text-muted-foreground">Credit / Debit Card</p>
                      <p className="text-xs text-muted-foreground">Visa, MasterCard, PayPak</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-card rounded-card border border-border p-6">
              <label className="text-sm font-medium block mb-1">Order notes (optional)</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any special instructions for packing or delivery?" rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-card focus:border-primary focus:outline-none resize-none" />
            </div>

            <button type="submit" disabled={loading || !paymentMethod || paymentMethod === "card"}
              className="w-full h-[52px] rounded-lg bg-primary text-primary-foreground font-heading font-semibold text-lg hover:bg-accent-hover transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
              Proceed to Upload Payment Proof →
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
            </div>
          </div>
        </div>
      </form>

      {/* ========================================================= */}
      {/* POPUP MODAL: PAYMENT SCREENSHOT / RECEIPT UPLOAD           */}
      {/* ========================================================= */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-1 border-b border-border pb-3">
              <span className="text-3xl">📸</span>
              <h3 className="font-heading font-bold text-xl text-foreground">Upload Payment Screenshot</h3>
              <p className="text-xs text-muted-foreground">
                Transfer <strong>Rs {total.toLocaleString()}</strong> via {paymentMethod === "bank_transfer" ? "Bank Transfer" : "EasyPaisa"} and attach your receipt.
              </p>
            </div>

            {/* Payment Transfer Instructions Box */}
            <div className="p-3 bg-muted/60 rounded-xl text-xs space-y-1.5 border border-border font-mono">
              {paymentMethod === "bank_transfer" ? (
                <>
                  <p><span className="text-muted-foreground font-sans">Bank:</span> Meezan Bank</p>
                  <p><span className="text-muted-foreground font-sans">Account Title:</span> The Local Baba Trading</p>
                  <p><span className="text-muted-foreground font-sans">IBAN:</span> PK00MEZN000123456789</p>
                </>
              ) : (
                <>
                  <p><span className="text-muted-foreground font-sans">Method:</span> EasyPaisa / JazzCash</p>
                  <p><span className="text-muted-foreground font-sans">Account Title:</span> The Local Baba</p>
                  <p><span className="text-muted-foreground font-sans">Mobile Number:</span> 0300 1234567</p>
                </>
              )}
            </div>

            {/* File Upload Box */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-foreground">
                Attach Payment Screenshot / Receipt *
              </label>

              {paymentScreenshot ? (
                <div className="relative rounded-xl border border-primary/30 p-2 bg-primary/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={paymentScreenshot} alt="Payment Proof" className="w-14 h-14 object-cover rounded-lg border border-border" />
                    <div>
                      <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Check size={14} /> Screenshot Attached
                      </p>
                      <p className="text-[10px] text-muted-foreground">Ready to submit for verification</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentScreenshot("")}
                    className="p-1.5 text-muted-foreground hover:text-danger rounded-lg hover:bg-muted"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40">
                  <Upload size={28} className="text-primary mb-2" />
                  <p className="text-xs font-semibold text-foreground">Click to upload screenshot</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG or JPEG (Max 5MB)</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Transaction Ref / TRX ID input */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground block">
                Transaction Ref / TRX ID (Optional)
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={e => setTransactionRef(e.target.value)}
                placeholder="e.g. TRX-9823417"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs font-mono focus:border-primary focus:outline-none"
              />
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <ShieldAlert size={16} className="shrink-0 text-amber-600 mt-0.5" />
              <span>
                Once submitted, your order status will show <strong>Payment Confirmation Pending</strong> until our team verifies your receipt.
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 h-11 rounded-lg border border-border text-xs font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading || !paymentScreenshot || uploadingImage}
                onClick={() => void handleFinalOrderSubmit()}
                className="flex-2 h-11 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-accent-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Submitting Order..." : "Submit Proof & Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
