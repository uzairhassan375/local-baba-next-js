"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tag, Send, Users } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { fetchAdminProductsFromDb } from "@/lib/supabase/productsApi";
import {
  fetchEligibleMembers,
  createAdminPromoCode,
  type DiscountType,
} from "@/lib/api/promoCodesApi";
import { sendAdminMessage } from "@/lib/api/notificationsApi";

const CITIES = ["Lahore", "Karachi", "Islamabad", "Faisalabad", "Rawalpindi", "Multan", "Peshawar", "Quetta", "Other"];

export default function AdminPromoCodes() {
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: fetchAdminProductsFromDb,
  });

  const [productId, setProductId] = useState("");
  const [city, setCity] = useState(""); // "" = all cities
  const [discountType, setDiscountType] = useState<DiscountType>("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [customCode, setCustomCode] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [validDays, setValidDays] = useState("7");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Recompute how many members this would reach whenever the city changes —
  // that's the whole point of this tool ("select Lahore → only Lahore
  // members get notified"), so admins should see the count before sending.
  useEffect(() => {
    setLoadingCount(true);
    (async () => {
      const members = await fetchEligibleMembers(city || undefined);
      setEligibleCount(members.length);
      setLoadingCount(false);
    })();
  }, [city]);

  const selectedProduct = useMemo(() => products.find(p => p.id === productId) ?? null, [products, productId]);

  const resetForm = () => {
    setDiscountValue("10");
    setCustomCode("");
    setMinQuantity("");
    setValidDays("7");
    setTitle("");
    setMessage("");
  };

  const handleCreateAndSend = async () => {
    const value = parseFloat(discountValue);
    if (!value || value <= 0) {
      toast.error("Enter a valid discount amount.");
      return;
    }
    if (!title.trim() || !message.trim()) {
      toast.error("Write a notification title and message.");
      return;
    }

    setCreating(true);

    const members = await fetchEligibleMembers(city || undefined);
    if (members.length === 0) {
      setCreating(false);
      toast.error(city ? `No approved members found in ${city}.` : "No approved members found.");
      return;
    }
    const memberIds = members.map(m => m.authUserId);

    const parsedMinQty = parseInt(minQuantity, 10);
    const parsedValidDays = parseInt(validDays, 10);

    const promoResult = await createAdminPromoCode({
      memberIds,
      productId: productId || undefined,
      discountType,
      discountValue: value,
      code: customCode.trim() || undefined,
      minQuantity: Number.isFinite(parsedMinQty) && parsedMinQty > 0 ? parsedMinQty : undefined,
      validDays: Number.isFinite(parsedValidDays) ? parsedValidDays : undefined,
    });
    if (!promoResult.success || !promoResult.promo) {
      setCreating(false);
      toast.error(promoResult.error || "Could not create promo code.");
      return;
    }

    const discountText = discountType === "percent" ? `${value}% off` : `Rs ${value} off`;
    const conditions: string[] = [discountText];
    if (promoResult.promo.minQuantity > 0) conditions.push(`min ${promoResult.promo.minQuantity} pcs`);
    if (promoResult.promo.expiresAt) {
      conditions.push(`valid until ${new Date(promoResult.promo.expiresAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}`);
    }
    const body = `${message.trim()}\n\nYour promo code: ${promoResult.promo.code} (${conditions.join(", ")}). Apply it at checkout.`;

    const sendResult = await sendAdminMessage({
      memberIds,
      title: title.trim(),
      body,
      productId: productId || undefined,
    });
    setCreating(false);

    if (sendResult.success) {
      toast.success(`Promo code ${promoResult.promo.code} created and sent to ${sendResult.sent ?? memberIds.length} member${memberIds.length !== 1 ? "s" : ""}.`);
      resetForm();
    } else {
      toast.error(sendResult.error || "Promo code was created, but the notification failed to send.");
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 max-w-2xl space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
            <Tag size={22} className="text-primary" />
            Promo Codes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a targeted promo code and notify exactly the members who qualify — by city, item, minimum order
            quantity, and time limit.
          </p>
        </div>

        <div className="bg-card rounded-card border border-border p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="promo-city">City</Label>
              <select
                id="promo-city"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm focus:border-primary focus:outline-none"
              >
                <option value="">All cities</option>
                {CITIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users size={12} />
                {loadingCount ? "Checking…" : `${eligibleCount ?? 0} member${eligibleCount === 1 ? "" : "s"} will be notified`}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promo-product">Selected item</Label>
              <select
                id="promo-product"
                value={productId}
                onChange={e => setProductId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Any product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="promo-type">Discount type</Label>
              <select
                id="promo-type"
                value={discountType}
                onChange={e => setDiscountType(e.target.value as DiscountType)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm focus:border-primary focus:outline-none"
              >
                <option value="percent">Percent off</option>
                <option value="fixed">Fixed amount off (Rs)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promo-value">{discountType === "percent" ? "Percent (%)" : "Amount (Rs)"}</Label>
              <Input id="promo-value" type="number" min={1} value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="promo-code">Custom code (optional)</Label>
            <Input
              id="promo-code"
              value={customCode}
              onChange={e => setCustomCode(e.target.value.toUpperCase())}
              placeholder="e.g. FIRSTORDER — leave blank to auto-generate"
              className="font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="promo-min-qty">Minimum order quantity</Label>
              <Input
                id="promo-min-qty"
                type="number"
                min={0}
                value={minQuantity}
                onChange={e => setMinQuantity(e.target.value)}
                placeholder="No minimum"
              />
              {selectedProduct && <p className="text-xs text-muted-foreground">pcs of {selectedProduct.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promo-valid-days">Time limit (days)</Label>
              <Input
                id="promo-valid-days"
                type="number"
                min={0}
                value={validDays}
                onChange={e => setValidDays(e.target.value)}
                placeholder="0 = never expires"
              />
            </div>
          </div>

          <div className="border-t border-border pt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="promo-notif-title">Notification title</Label>
              <Input
                id="promo-notif-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Special discount for Lahore members"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promo-notif-body">Notification message</Label>
              <Textarea
                id="promo-notif-body"
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="e.g. We're offering a limited-time discount on this item for members in your city."
              />
            </div>
          </div>

          <Button onClick={() => void handleCreateAndSend()} disabled={creating} className="w-full gap-2">
            <Send size={14} />
            {creating ? "Creating & sending…" : `Create code & notify ${eligibleCount ?? 0} member${eligibleCount === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
