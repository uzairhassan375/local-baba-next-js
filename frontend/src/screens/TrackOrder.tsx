import Link from "next/link";
import { MapPin, Package } from "lucide-react";
import { useOrders } from "@/contexts/OrdersContext";

const statusColors: Record<string, string> = {
  processing: "bg-amber-100 text-amber-800",
  dispatched: "bg-blue-100 text-blue-800",
  delivered: "bg-olive/20 text-olive",
  cancelled: "bg-danger/10 text-danger",
};

export default function TrackOrderPage() {
  const { orders } = useOrders();

  return (
    <div className="p-4 md:p-8 animate-fade-in-up">
      <h1 className="font-heading font-bold text-2xl md:text-3xl mb-1">Track order</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Live dispatch and courier status for your orders. For invoices and item details, see{" "}
        <Link href="/orders" className="text-primary hover:underline">My orders</Link>.
      </p>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <MapPin size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="font-heading font-bold text-xl mb-2">No orders to track yet</p>
          <Link href="/catalogue" className="inline-flex items-center h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Browse catalogue</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <Link
              key={o.id}
              href={`/track-order/${o.id}`}
              className="block bg-card rounded-card border border-border p-4 space-y-2 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm">#{o.id}</span>
                <span className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-pill text-xs font-medium ${statusColors[o.orderStatus]}`}>{o.orderStatus}</span>
                {o.trackingNumber ? (
                  <span className="text-xs text-muted-foreground font-mono">{o.courier}: {o.trackingNumber}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Not yet dispatched</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
