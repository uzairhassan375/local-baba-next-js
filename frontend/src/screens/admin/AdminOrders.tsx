"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useOrders } from "@/contexts/OrdersContext";
import { Package, CheckCircle, Clock, Eye, ExternalLink, RefreshCw, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const statusColors: Record<string, string> = {
  processing: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  dispatched: "bg-blue-500/10 text-blue-600 border border-blue-500/20",
  delivered: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  cancelled: "bg-danger/10 text-danger border border-danger/20",
};

export default function AdminOrdersPage() {
  const { orders, updateOrder, isLoadingOrders, refreshOrdersFromDb } = useOrders();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dispatchModal, setDispatchModal] = useState<string | null>(null);
  const [trackingNum, setTrackingNum] = useState("");
  const [courier, setCourier] = useState("TCS");
  const [viewScreenshotModal, setViewScreenshotModal] = useState<string | null>(null);

  const filtered = orders
    .filter(o => statusFilter === "all" || o.orderStatus === statusFilter || (statusFilter === "pending_payment" && o.paymentStatus === "pending"))
    .filter(o => !search || o.id.toLowerCase().includes(search.toLowerCase()) || (o.customerName && o.customerName.toLowerCase().includes(search.toLowerCase())));

  const handleUpdateStatus = async (id: string, status: string) => {
    if (status === "dispatched") {
      setDispatchModal(id);
      return;
    }
    try {
      await updateOrder(id, { orderStatus: status as any });
      toast.success(`Order #${id} status updated to ${status}`);
    } catch (err) {
      toast.error("Failed to update order status");
    }
  };

  const handleVerifyPayment = async (id: string) => {
    try {
      const ord = orders.find(o => o.id === id);
      const updatedTimeline = ord?.timeline.map(t => {
        if (t.step.includes("Payment")) return { ...t, status: "completed" as const, timestamp: "Verified by Admin" };
        if (t.step.includes("Packed")) return { ...t, status: "active" as const };
        return t;
      }) || [];

      await updateOrder(id, {
        paymentStatus: "confirmed",
        orderStatus: "processing",
        timeline: updatedTimeline,
      });

      toast.success(`Payment verified for Order #${id}! Status updated in DB & synced to member.`);
    } catch (err) {
      toast.error("Failed to verify payment");
    }
  };

  const confirmDispatch = async () => {
    if (!dispatchModal) return;
    try {
      const ord = orders.find(o => o.id === dispatchModal);
      const updatedTimeline = ord?.timeline.map(t => {
        if (t.step.includes("Dispatched")) return { ...t, status: "completed" as const, timestamp: `${courier}: ${trackingNum}` };
        if (t.step.includes("Out for delivery")) return { ...t, status: "active" as const };
        return t;
      }) || [];

      await updateOrder(dispatchModal, {
        orderStatus: "dispatched",
        courier,
        trackingNumber: trackingNum,
        timeline: updatedTimeline,
      });

      toast.success(`Order #${dispatchModal} dispatched via ${courier} (${trackingNum})`);
      setDispatchModal(null);
      setTrackingNum("");
    } catch (err) {
      toast.error("Failed to dispatch order");
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-6 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="font-heading font-bold text-2xl md:text-3xl flex items-center gap-2">
              <Package className="text-primary h-7 w-7" /> Admin Member Orders
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Verify member payment proof screenshots, confirm orders to packing, and manage dispatch tracking.
            </p>
          </div>

          <Button
            onClick={() => void refreshOrdersFromDb()}
            variant="outline"
            size="sm"
            className="gap-2 border-border self-start sm:self-auto"
            disabled={isLoadingOrders}
          >
            <RefreshCw size={14} className={isLoadingOrders ? "animate-spin" : ""} /> Refresh DB
          </Button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-card text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending_payment">⏳ Payment Confirmation Pending</option>
            <option value="processing">Processing / Packing</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search order ID or customer name..."
            className="h-10 px-3 flex-1 max-w-xs rounded-lg border border-border bg-card text-sm focus:border-primary focus:outline-none"
          />

          <span className="text-xs text-muted-foreground ml-auto">
            Showing {filtered.length} of {orders.length} order(s)
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-card rounded-card border border-border p-16 text-center">
            <Package size={48} className="mx-auto text-muted-foreground/60 mb-3" />
            <p className="font-heading font-semibold text-lg mb-1">No orders found</p>
            <p className="text-sm text-muted-foreground">
              Orders placed by members at Checkout will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-card border border-border overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-muted-foreground uppercase tracking-wider font-semibold">
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Customer / Member</th>
                    <th className="p-3">Items / Total</th>
                    <th className="p-3">Payment Status</th>
                    <th className="p-3">Proof Screenshot</th>
                    <th className="p-3">Order Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(o => {
                    const isPendingPayment = o.paymentStatus === "pending";
                    return (
                      <tr key={o.id} className="hover:bg-muted/20">
                        <td className="p-3 font-mono font-bold text-primary">#{o.id}</td>
                        <td className="p-3">
                          <p className="font-semibold text-foreground">{o.customerName || `Member #${o.memberId}`}</p>
                          <p className="text-[10px] text-muted-foreground">{o.city} · {new Date(o.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-foreground">Rs {o.total.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{o.items.length} items ({o.items.reduce((s, i) => s + i.qty, 0)} pcs)</p>
                        </td>
                        <td className="p-3">
                          {isPendingPayment ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center gap-1 w-fit">
                              <Clock size={11} /> Payment Pending
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center gap-1 w-fit">
                              <CheckCircle size={11} /> Verified
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {o.paymentScreenshot ? (
                            <button
                              onClick={() => setViewScreenshotModal(o.paymentScreenshot!)}
                              className="flex items-center gap-1.5 p-1 bg-muted/50 hover:bg-muted rounded border border-border transition-colors group"
                            >
                              <img src={o.paymentScreenshot} alt="Proof" className="w-8 h-8 object-cover rounded border border-border" />
                              <span className="text-[10px] text-primary group-hover:underline font-medium">View Receipt</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">No receipt attached</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[o.orderStatus] || "bg-muted text-muted-foreground"}`}>
                            {o.orderStatus === "processing" && o.paymentStatus === "confirmed" ? "Packing" : o.orderStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPendingPayment && (
                              <Button
                                size="sm"
                                onClick={() => void handleVerifyPayment(o.id)}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 shadow-xs"
                              >
                                <CheckCircle size={13} /> Confirm Payment
                              </Button>
                            )}

                            <select
                              onChange={e => void handleUpdateStatus(o.id, e.target.value)}
                              value={o.orderStatus}
                              className="h-7 px-2 rounded border border-border text-xs bg-background font-medium"
                            >
                              <option value="processing">Processing / Packing</option>
                              <option value="dispatched">Dispatched</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dispatch Modal */}
        {dispatchModal && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setDispatchModal(null)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card rounded-xl p-6 shadow-2xl z-50 space-y-4 border border-border animate-fade-in">
              <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                <Truck className="text-primary" /> Dispatch Order #{dispatchModal}
              </h3>
              <div>
                <label className="text-xs font-medium block mb-1">Courier Service</label>
                <select value={courier} onChange={e => setCourier(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs">
                  <option value="TCS">TCS Express</option>
                  <option value="Leopards">Leopards Courier</option>
                  <option value="Trax">Trax Logistics</option>
                  <option value="M&P">M&P Express</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Tracking Number</label>
                <input
                  value={trackingNum}
                  onChange={e => setTrackingNum(e.target.value)}
                  placeholder="e.g. TCS-9823418"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-mono focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setDispatchModal(null)} className="flex-1">
                  Cancel
                </Button>
                <Button size="sm" onClick={() => void confirmDispatch()} className="flex-1 bg-primary text-primary-foreground font-bold">
                  Confirm Dispatch
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Screenshot View Modal */}
        {viewScreenshotModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setViewScreenshotModal(null)}>
            <div className="bg-card border border-border rounded-2xl p-4 max-w-lg w-full space-y-3 relative text-center" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="font-heading font-bold text-sm">Payment Receipt Proof Screenshot</h3>
                <Button size="sm" variant="ghost" onClick={() => setViewScreenshotModal(null)}>✕</Button>
              </div>
              <img src={viewScreenshotModal} alt="Payment Receipt Screenshot" className="max-h-[70vh] w-auto mx-auto rounded-lg border border-border object-contain" />
              <p className="text-[11px] text-muted-foreground">Attached by customer during checkout.</p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
