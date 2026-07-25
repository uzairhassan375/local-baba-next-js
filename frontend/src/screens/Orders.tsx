import { useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { useOrders } from "@/contexts/OrdersContext";

const statusColors: Record<string, string> = {
  processing: "bg-amber-100 text-amber-800",
  dispatched: "bg-blue-100 text-blue-800",
  delivered: "bg-olive/20 text-olive",
  cancelled: "bg-danger/10 text-danger",
};

const tabs = ["All", "Processing", "Dispatched", "Delivered", "Cancelled"];

export default function OrdersPage() {
  const { orders } = useOrders();
  const [activeTab, setActiveTab] = useState("All");

  const filtered = activeTab === "All" ? orders : orders.filter(o => o.orderStatus === activeTab.toLowerCase());

  return (
    <div className="p-4 md:p-8 animate-fade-in-up">
      <h1 className="font-heading font-bold text-2xl md:text-3xl mb-6">My orders</h1>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`h-9 px-4 rounded-pill text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              activeTab === t ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="font-heading font-bold text-xl mb-2">No orders yet</p>
          <Link href="/catalogue" className="inline-flex items-center h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Browse catalogue</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => (
            <div key={o.id} className="bg-card rounded-card border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm">#{o.id}</span>
                <span className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-muted-foreground">{o.items.length} products · {o.items.reduce((s, i) => s + i.qty, 0)} pcs total</p>
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold">Rs {o.total.toLocaleString()}</span>
                <span className={`px-2 py-0.5 rounded-pill text-xs font-medium ${statusColors[o.orderStatus]}`}>{o.orderStatus}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <Link href={`/orders/${o.id}`} className="h-8 px-3 rounded-lg border border-border text-xs flex items-center hover:bg-muted transition-colors">View details</Link>
                <Link href={`/track-order/${o.id}`} className="h-8 px-3 rounded-lg border border-border text-xs flex items-center hover:bg-muted transition-colors">Track order</Link>
                <button className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs hover:bg-accent-hover transition-colors">Reorder</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
