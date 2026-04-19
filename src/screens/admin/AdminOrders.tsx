import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { orders as initialOrders } from "@/data/mockData";

const statusColors: Record<string, string> = {
  processing: "bg-amber-100 text-amber-800",
  dispatched: "bg-blue-100 text-blue-800",
  delivered: "bg-olive/20 text-olive",
  cancelled: "bg-danger/10 text-danger",
};

export default function AdminOrdersPage() {
  const [orderList, setOrderList] = useState(initialOrders);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dispatchModal, setDispatchModal] = useState<string | null>(null);
  const [trackingNum, setTrackingNum] = useState("");
  const [courier, setCourier] = useState("TCS");

  const filtered = orderList
    .filter(o => statusFilter === "all" || o.orderStatus === statusFilter)
    .filter(o => !search || o.id.includes(search));

  const updateStatus = (id: string, status: string) => {
    if (status === "dispatched") { setDispatchModal(id); return; }
    setOrderList(prev => prev.map(o => o.id === id ? { ...o, orderStatus: status as any } : o));
  };

  const confirmDispatch = () => {
    if (!dispatchModal) return;
    setOrderList(prev => prev.map(o => o.id === dispatchModal ? { ...o, orderStatus: "dispatched" as any, courier, trackingNumber: trackingNum } : o));
    setDispatchModal(null);
    setTrackingNum("");
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-6 animate-fade-in-up">
        <h1 className="font-heading font-bold text-2xl">Orders</h1>
        <div className="flex flex-wrap gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-border bg-card text-sm">
            <option value="all">All statuses</option>
            <option value="processing">Processing</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order ID..." className="h-10 px-3 rounded-lg border border-border bg-card text-sm focus:border-primary focus:outline-none" />
        </div>
        <div className="bg-card rounded-card border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Order ID</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Items</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Total</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-mono font-medium">#{o.id}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{o.items.length} items</td>
                  <td className="p-3">Rs {o.total.toLocaleString()}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-pill text-xs font-medium ${statusColors[o.orderStatus]}`}>{o.orderStatus}</span></td>
                  <td className="p-3">
                    <select onChange={e => updateStatus(o.id, e.target.value)} value={o.orderStatus} className="h-7 px-2 rounded border border-border text-xs bg-card">
                      <option value="processing">Processing</option>
                      <option value="dispatched">Dispatched</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {dispatchModal && (
          <>
            <div className="fixed inset-0 bg-foreground/30 z-50" onClick={() => setDispatchModal(null)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card rounded-card p-6 shadow-card z-50 animate-fade-in-up space-y-4">
              <h3 className="font-heading font-bold text-lg">Dispatch Order #{dispatchModal}</h3>
              <div><label className="text-sm font-medium block mb-1">Courier</label>
                <select value={courier} onChange={e => setCourier(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm">
                  <option>TCS</option><option>Leopards</option><option>Trax</option>
                </select>
              </div>
              <div><label className="text-sm font-medium block mb-1">Tracking number</label>
                <input value={trackingNum} onChange={e => setTrackingNum(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm focus:border-primary focus:outline-none" />
              </div>
              <button onClick={confirmDispatch} className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold">Confirm dispatch</button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
