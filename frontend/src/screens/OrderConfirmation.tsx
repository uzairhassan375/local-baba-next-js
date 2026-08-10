import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useOrders } from "@/contexts/OrdersContext";

export default function OrderConfirmationPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "LB-2847";
  const { getOrderById } = useOrders();
  const order = getOrderById(id);
  const [copied, setCopied] = useState(false);

  const orderId = order?.id || id;
  const totalAmount = order?.total ? order.total.toLocaleString() : "28,400";
  const formattedDate = order?.createdAt
    ? new Date(order.createdAt).toLocaleString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Recently placed";

  const timeline = order?.timeline || [
    { step: "Order received", timestamp: formattedDate, status: "completed" as const },
    { step: "Payment confirmation", timestamp: "within 2 hours of transfer", status: "active" as const },
    { step: "Dispatched within 48 hours", timestamp: null, status: "pending" as const },
    { step: "WhatsApp tracking sent", timestamp: null, status: "pending" as const },
  ];

  const copyAll = () => {
    const text = `Bank: UBL\nAccount Title: FINK TECH\nAccount #: 0673388681734\nAmount: Rs ${totalAmount}\nReference: ${orderId}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 md:p-8 flex justify-center animate-fade-in-up">
      <div className="max-w-[600px] w-full space-y-6">
        {/* Checkmark */}
        <div className="text-center">
          <div className="w-[72px] h-[72px] rounded-full bg-olive mx-auto flex items-center justify-center animate-checkmark">
            <CheckCircle size={36} className="text-primary-foreground" />
          </div>
          <h1 className="font-heading font-bold text-3xl mt-4">Order placed!</h1>
          <p className="font-mono text-muted-foreground mt-1">Order #{orderId} · {formattedDate}</p>
        </div>

        {/* Payment reminder */}
        <div className="bg-amber-50 border border-amber-200 rounded-card p-5 space-y-3">
          <p className="text-sm font-medium">To confirm your order, transfer Rs {totalAmount} to:</p>
          <div className="space-y-1 text-sm">
            <p>Bank: <strong>UBL</strong></p>
            <p>Account Title: <strong>FINK TECH</strong></p>
            <p>Account #: <strong className="font-mono">0673388681734</strong></p>
            <p className="text-muted-foreground text-xs">Use order #{orderId} as your transfer reference</p>
          </div>
          <button onClick={copyAll} className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm hover:bg-card transition-colors">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy all details"}
          </button>
        </div>

        {/* Timeline */}
        <div className="bg-card rounded-card border border-border p-6">
          <h2 className="font-heading font-semibold mb-4">What happens next</h2>
          <div className="space-y-0">
            {timeline.map((t, i) => (
              <div key={i} className="flex gap-4 relative">
                <div className="flex flex-col items-center">
                  <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                    t.status === "completed" ? "bg-olive" : t.status === "active" ? "bg-primary animate-pulse-dot" : "bg-muted"
                  }`} />
                  {i < timeline.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                </div>
                <div className="pb-6">
                  <p className={`text-sm font-medium ${t.status === "pending" ? "text-muted-foreground" : ""}`}>{t.step}</p>
                  {"timestamp" in t && t.timestamp && <p className="text-xs text-muted-foreground mt-0.5">{t.timestamp}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link href={`/orders/${orderId}`} className="block w-full h-12 rounded-lg bg-primary text-primary-foreground text-center leading-[48px] font-heading font-semibold hover:bg-accent-hover transition-colors">
            View order details
          </Link>
          <Link href="/catalogue" className="block w-full h-12 rounded-lg border border-border text-center leading-[48px] text-sm hover:bg-muted transition-colors">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
