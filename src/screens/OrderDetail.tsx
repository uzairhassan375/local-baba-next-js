import Link from "next/link";
import { useParams } from "next/navigation";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";

import { ProductMedia } from "@/components/ProductMedia";
import { orders } from "@/data/mockData";

const statusColors: Record<string, string> = {
  processing: "bg-amber-100 text-amber-800",
  dispatched: "bg-blue-100 text-blue-800",
  delivered: "bg-olive/20 text-olive",
  cancelled: "bg-danger/10 text-danger",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-olive/20 text-olive",
  failed: "bg-danger/10 text-danger",
};

export default function OrderDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : undefined;
  const order = id ? orders.find(o => o.id === id) : undefined;
  const [copied, setCopied] = useState("");

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  if (!order) return (
    <div className="p-8 text-center">
      <h2 className="font-heading font-bold text-xl mb-2">Order not found</h2>
      <Link href="/orders" className="text-primary hover:underline">Back to orders</Link>
    </div>
  );

  return (
    <div className="p-4 md:p-8 animate-fade-in-up space-y-6">
      <p className="text-xs text-muted-foreground">
        <Link href="/orders" className="hover:text-primary">My orders</Link> › #{order.id}
      </p>

      {/* Header */}
      <div className="bg-card rounded-card border border-border p-6 flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <h1 className="font-heading font-bold text-2xl">Order #{order.id}</h1>
          <p className="text-sm text-muted-foreground mt-1">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className={`px-3 py-1 rounded-pill text-xs font-medium ${statusColors[order.orderStatus]}`}>{order.orderStatus}</span>
        <span className={`px-3 py-1 rounded-pill text-xs font-medium ${paymentStatusColors[order.paymentStatus]}`}>Payment: {order.paymentStatus}</span>
      </div>

      {/* Tracking */}
      <div className="bg-card rounded-card border border-border p-6">
        <h2 className="font-heading font-semibold mb-4">Live Tracking</h2>
        <div className="space-y-0">
          {order.timeline.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.status === "completed" ? "bg-olive text-primary-foreground" :
                  step.status === "active" ? "bg-primary animate-pulse-dot" : "bg-muted"
                }`}>
                  {step.status === "completed" && <span className="text-xs">✓</span>}
                </div>
                {i < order.timeline.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
              </div>
              <div className="pb-5">
                <p className={`text-sm font-medium ${step.status === "pending" ? "text-muted-foreground" : ""}`}>{step.step}</p>
                {step.timestamp && <p className="text-xs text-muted-foreground mt-0.5">{step.timestamp}</p>}
                {step.step === "Dispatched" && step.status === "completed" && order.trackingNumber && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Courier: {order.courier}</span>
                      <span className="flex items-center gap-1 font-mono">
                        {order.trackingNumber}
                        <button onClick={() => handleCopy(order.trackingNumber!, "tracking")} className="text-primary">
                          {copied === "tracking" ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <a href={order.courier === "TCS" ? "https://www.tcs.com.pk/tracking" : "https://leopardscourier.com/tracking"}
                        target="_blank" rel="noopener noreferrer"
                        className="h-8 px-3 rounded-lg border border-border text-xs flex items-center gap-1 hover:bg-muted">
                        Track on {order.courier} <ExternalLink size={12} />
                      </a>
                      <a href={`https://wa.me/923001234567?text=Track%20order%20${order.id}`} target="_blank" rel="noopener noreferrer"
                        className="h-8 px-3 rounded-lg bg-olive text-primary-foreground text-xs flex items-center">Get WA update</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="bg-card rounded-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Qty</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Price/pc</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <ProductMedia src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </td>
                  <td className="p-3">{item.qty}</td>
                  <td className="p-3">Rs {item.pricePerPc.toLocaleString()}</td>
                  <td className="p-3 text-right font-medium">Rs {(item.pricePerPc * item.qty).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td colSpan={3} className="p-3 text-right font-heading font-bold">Total</td>
                <td className="p-3 text-right font-heading font-bold text-lg">Rs {order.total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Address + Payment */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card rounded-card border border-border p-5">
          <h3 className="font-heading font-semibold text-sm mb-2">Delivery address</h3>
          <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
          <p className="text-sm text-muted-foreground">{order.city}</p>
        </div>
        <div className="bg-card rounded-card border border-border p-5">
          <h3 className="font-heading font-semibold text-sm mb-2">Payment details</h3>
          <p className="text-sm">Method: <span className="capitalize">{order.paymentMethod.replace("_", " ")}</span></p>
          <p className="text-sm">Amount: Rs {order.total.toLocaleString()}</p>
          <p className="text-sm">Status: <span className="capitalize">{order.paymentStatus}</span></p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button className="h-11 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-accent-hover transition-colors">Reorder all items</button>
        <button onClick={() => window.print()} className="h-11 px-6 rounded-lg border border-border text-sm hover:bg-muted transition-colors">Download invoice</button>
        <a href={`https://wa.me/923001234567?text=Issue%20with%20order%20${order.id}`} target="_blank" rel="noopener noreferrer"
          className="h-11 px-6 rounded-lg border border-border text-sm hover:bg-muted transition-colors flex items-center">Report an issue</a>
      </div>
    </div>
  );
}
