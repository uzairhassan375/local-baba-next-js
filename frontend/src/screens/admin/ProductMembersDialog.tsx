import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShoppingCart, Heart, Send, ArrowLeft, Mail, Phone, MapPin, Tag } from "lucide-react";
import type { Product } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchAdminCartMembers, type AdminCartMember } from "@/lib/api/cartApi";
import { fetchAdminFavoriteMembers, type AdminFavoriteMember } from "@/lib/api/favoritesApi";
import { sendAdminMessage } from "@/lib/api/notificationsApi";
import { createAdminPromoCode, type DiscountType } from "@/lib/api/promoCodesApi";

type Kind = "cart" | "favorite";

interface Props {
  product: Product | null;
  kind: Kind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Both member shapes share these fields — the dialog only needs the common
// subset plus whichever timestamp/quantity is specific to cart vs favorite.
type MemberRow = {
  authUserId: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  city: string | null;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function ProductMembersDialog({ product, kind, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [cartMembers, setCartMembers] = useState<AdminCartMember[]>([]);
  const [favMembers, setFavMembers] = useState<AdminFavoriteMember[]>([]);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [includePromo, setIncludePromo] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType>("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [customCode, setCustomCode] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [validDays, setValidDays] = useState("7");

  const members: MemberRow[] = kind === "cart" ? cartMembers : favMembers;

  useEffect(() => {
    if (!open || !product) return;
    setComposing(false);
    setTitle("");
    setMessage("");
    setIncludePromo(false);
    setDiscountType("percent");
    setDiscountValue("10");
    setCustomCode("");
    setMinQuantity("");
    setValidDays("7");
    setLoading(true);
    (async () => {
      if (kind === "cart") {
        setCartMembers(await fetchAdminCartMembers(product.id));
      } else {
        setFavMembers(await fetchAdminFavoriteMembers(product.id));
      }
      setLoading(false);
    })();
  }, [open, product, kind]);

  const handleSend = async () => {
    if (!product) return;
    if (!title.trim() || !message.trim()) {
      toast.error("Write a title and a message before sending.");
      return;
    }
    const value = parseFloat(discountValue);
    if (includePromo && (!value || value <= 0)) {
      toast.error("Enter a valid discount amount for the promo code.");
      return;
    }

    setSending(true);

    let body = message.trim();
    if (includePromo) {
      const parsedMinQty = parseInt(minQuantity, 10);
      const parsedValidDays = parseInt(validDays, 10);
      const promoResult = await createAdminPromoCode({
        memberIds: members.map(m => m.authUserId),
        productId: product.id,
        discountType,
        discountValue: value,
        code: customCode.trim() || undefined,
        minQuantity: Number.isFinite(parsedMinQty) && parsedMinQty > 0 ? parsedMinQty : undefined,
        validDays: Number.isFinite(parsedValidDays) ? parsedValidDays : undefined,
      });
      if (!promoResult.success || !promoResult.promo) {
        setSending(false);
        toast.error(promoResult.error || "Could not create promo code.");
        return;
      }
      const discountText = discountType === "percent" ? `${value}% off` : `Rs ${value} off`;
      const conditions: string[] = [discountText];
      if (promoResult.promo.minQuantity > 0) conditions.push(`min ${promoResult.promo.minQuantity} pcs`);
      if (promoResult.promo.expiresAt) {
        conditions.push(`valid until ${new Date(promoResult.promo.expiresAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}`);
      }
      body += `\n\nYour promo code: ${promoResult.promo.code} (${conditions.join(", ")}). Apply it at checkout.`;
    }

    const result = await sendAdminMessage({
      memberIds: members.map(m => m.authUserId),
      title: title.trim(),
      body,
      productId: product.id,
    });
    setSending(false);
    if (result.success) {
      toast.success(`Sent to ${result.sent ?? members.length} member${members.length !== 1 ? "s" : ""}.`);
      setComposing(false);
      setTitle("");
      setMessage("");
      setIncludePromo(false);
    } else {
      toast.error(result.error || "Could not send message.");
    }
  };

  const label = kind === "cart" ? "Cart" : "Favourites";
  const Icon = kind === "cart" ? ShoppingCart : Heart;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto sm:max-w-xl">
        {composing ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setComposing(false)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Back to member list"
                >
                  <ArrowLeft size={16} />
                </button>
                Message {members.length} member{members.length !== 1 ? "s" : ""}
              </DialogTitle>
              <DialogDescription>
                {product?.name} — everyone currently shown in this list will receive this as a notification.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="admin-msg-title">Title</Label>
                <Input
                  id="admin-msg-title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Discount available on this product"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-msg-body">Message</Label>
                <Textarea
                  id="admin-msg-body"
                  rows={5}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="e.g. We're offering 10% off this item this week, or: it's back in stock — order now before it sells out."
                />
              </div>

              <div className="border border-border rounded-card p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-promo"
                    checked={includePromo}
                    onCheckedChange={v => setIncludePromo(v === true)}
                  />
                  <Label htmlFor="include-promo" className="font-normal cursor-pointer flex items-center gap-1.5">
                    <Tag size={14} className="text-primary" />
                    Include a promo code for these members only
                  </Label>
                </div>
                {includePromo && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="promo-type">Discount type</Label>
                      <select
                        id="promo-type"
                        value={discountType}
                        onChange={e => setDiscountType(e.target.value as DiscountType)}
                        className="w-full h-9 px-3 rounded-lg border border-border bg-card text-sm focus:border-primary focus:outline-none"
                      >
                        <option value="percent">Percent off</option>
                        <option value="fixed">Fixed amount off (Rs)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="promo-value">{discountType === "percent" ? "Percent (%)" : "Amount (Rs)"}</Label>
                      <Input
                        id="promo-value"
                        type="number"
                        min={1}
                        value={discountValue}
                        onChange={e => setDiscountValue(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label htmlFor="promo-code">Custom code (optional)</Label>
                      <Input
                        id="promo-code"
                        value={customCode}
                        onChange={e => setCustomCode(e.target.value.toUpperCase())}
                        placeholder="e.g. FIRSTORDER — leave blank to auto-generate"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="promo-min-qty">Minimum quantity</Label>
                      <Input
                        id="promo-min-qty"
                        type="number"
                        min={0}
                        value={minQuantity}
                        onChange={e => setMinQuantity(e.target.value)}
                        placeholder="No minimum"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="promo-valid-days">Valid for (days)</Label>
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
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setComposing(false)} disabled={sending}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sending} className="gap-2">
                <Send size={14} />
                {sending ? (includePromo ? "Creating code & sending…" : "Sending…") : "Send"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Icon size={18} className="text-primary" />
                {label} — {product?.name}
              </DialogTitle>
              <DialogDescription>
                {loading ? "Loading…" : `${members.length} member${members.length !== 1 ? "s" : ""} currently ${kind === "cart" ? "have this in their cart" : "have this favourited"}.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-1">
              {loading ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No members currently {kind === "cart" ? "have this in their cart." : "have this favourited."}
                </p>
              ) : (
                members.map(m => {
                  const cartRow = kind === "cart" ? (m as AdminCartMember) : null;
                  const favRow = kind === "favorite" ? (m as AdminFavoriteMember) : null;
                  return (
                    <div key={m.authUserId} className="border border-border rounded-card p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{m.name || "Unnamed member"}</span>
                        {cartRow && (
                          <span className="text-xs px-2 py-0.5 rounded-pill bg-primary/10 text-primary font-medium whitespace-nowrap">
                            Qty: {cartRow.quantity}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {m.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail size={12} /> {m.email}
                          </span>
                        )}
                        {m.whatsapp && (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={12} /> +92{m.whatsapp}
                          </span>
                        )}
                        {m.city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} /> {m.city}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {cartRow && `Added to cart ${formatDate(cartRow.addedAt)} · last updated ${formatDate(cartRow.updatedAt)}`}
                        {favRow && `Favourited ${formatDate(favRow.favoritedAt)}`}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {members.length > 0 && (
              <DialogFooter>
                <Button onClick={() => setComposing(true)} className="gap-2">
                  <Send size={14} />
                  Inform {members.length} member{members.length !== 1 ? "s" : ""}
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
