"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";

import { useOrders } from "@/contexts/OrdersContext";

export default function TrackOrderDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : undefined;
  const { getOrderById } = useOrders();
  const order = id ? getOrderById(id) : undefined;
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!order) return (
    <div className="p-8 text-center">
      <h2 className="font-heading font-bold text-xl mb-2">Order not found</h2>
      <Link href="/track-order" className="text-primary hover:underline">Back to track order</Link>
    </div>
  );

  return (
    <div className="p-4 md:p-8 animate-fade-in-up space-y-6">
      <p className="text-xs text-muted-foreground">
        <Link href="/track-order" className="hover:text-primary">Track order</Link> › #{order.id}
      </p>

      <div className="bg-card rounded-card border border-border p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl">Order #{order.id}</h1>
          <p className="text-sm text-muted-foreground mt-1">Placed {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <Link
          href={`/orders/${order.id}`}
          className="h-9 px-4 rounded-lg border border-border text-sm flex items-center hover:bg-muted transition-colors"
        >
          View order details
        </Link>
      </div>

      {/* Live tracking timeline */}
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
                        <button onClick={() => handleCopy(order.trackingNumber!)} className="text-primary">
                          {copied ? <Check size={12} /> : <Copy size={12} />}
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

      {/*
        Future: courier API integration. Once wired up, this becomes a form
        where the tracking number above is submitted to the courier's API
        (TCS/Leopards/etc.) and the live shipment status/location is rendered
        directly here instead of just linking out to the courier's own site.
      */}
      {order.trackingNumber && (
        <div className="bg-card rounded-card border border-dashed border-border p-6 text-sm text-muted-foreground">
          Real-time courier tracking (live status, current location) is coming soon. For now, use{" "}
          <span className="font-medium text-foreground">Track on {order.courier}</span> above to check status directly on the courier&apos;s site.
        </div>
      )}
    </div>
  );
}
