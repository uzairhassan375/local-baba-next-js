import Link from "next/link";
import { useParams } from "next/navigation";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";

import { ProductMedia } from "@/components/ProductMedia";
import { orders as mockOrders } from "@/data/mockData";
import { useOrders } from "@/contexts/OrdersContext";

const statusColors: Record<string, string> = {
  processing: "bg-amber-100 text-amber-900 border border-amber-300 font-bold",
  dispatched: "bg-blue-100 text-blue-800 font-semibold",
  delivered: "bg-olive/20 text-olive font-semibold",
  cancelled: "bg-danger/10 text-danger font-semibold",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 font-bold border border-amber-300",
  confirmed: "bg-emerald-100 text-emerald-900 font-bold border border-emerald-300",
  failed: "bg-danger/10 text-danger font-semibold",
};

export default function OrderDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : undefined;
  const { getOrderById } = useOrders();
  const order = id ? (getOrderById(id) || mockOrders.find(o => o.id === id)) : undefined;
  const [copied, setCopied] = useState("");

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  if (!order) return (
    <div className="p-8 text-center">
      <h2 className="font-heading font-bold text-xl mb-2">Order not found</h2>
      <Link href="/orders" className="text-primary hover:underline">Back to orders</Link>
    </div>
  );

  const invoiceDate = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* Printable invoice — only visible when printing */}
      <div id="invoice-print" className="hidden print:block p-8 text-black bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">localbaba</h1>
              <p className="text-sm text-gray-600 mt-1">Wholesale for Pakistani sellers</p>
              <p className="text-xs text-gray-500 mt-2">Lahore, Pakistan</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">INVOICE</p>
              <p className="text-sm mt-1">#{order.id}</p>
              <p className="text-sm text-gray-600">{invoiceDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div>
              <p className="font-semibold text-xs uppercase tracking-wide text-gray-500 mb-1">Bill to</p>
              <p>{order.deliveryAddress}</p>
              <p className="text-gray-600">{order.city}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-xs uppercase tracking-wide text-gray-500 mb-1">Payment</p>
              <p className="capitalize">{order.paymentMethod.replace("_", " ")}</p>
              <p className="text-gray-600 capitalize">Status: {order.paymentStatus}</p>
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-2 font-semibold">Item</th>
                <th className="text-right py-2 font-semibold">Qty</th>
                <th className="text-right py-2 font-semibold">Rate</th>
                <th className="text-right py-2 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-2">{item.name}</td>
                  <td className="py-2 text-right">{item.qty}</td>
                  <td className="py-2 text-right">Rs {item.pricePerPc.toLocaleString()}</td>
                  <td className="py-2 text-right">Rs {(item.pricePerPc * item.qty).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td colSpan={3} className="py-2 text-right text-gray-600">Subtotal</td>
                <td className="py-2 text-right font-medium">
                  Rs {order.items.reduce((s, i) => s + i.pricePerPc * i.qty, 0).toLocaleString()}
                </td>
              </tr>
              {order.deliveryCharges !== undefined && (
                <tr className="border-t border-gray-100">
                  <td colSpan={3} className="py-2 text-right text-gray-600">Delivery Charges</td>
                  <td className="py-2 text-right font-medium">Rs {order.deliveryCharges.toLocaleString()}</td>
                </tr>
              )}
              {!!order.discount && (
                <tr className="border-t border-gray-100 text-emerald-700">
                  <td colSpan={3} className="py-2 text-right">Discount</td>
                  <td className="py-2 text-right font-medium">- Rs {order.discount.toLocaleString()}</td>
                </tr>
              )}
              <tr className="border-t-2 border-black">
                <td colSpan={3} className="py-3 text-right font-bold text-base">Total</td>
                <td className="py-3 text-right font-bold text-base">Rs {order.total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          <p className="text-xs text-gray-500 text-center border-t border-gray-200 pt-4">
            Thank you for your business · localbaba · This is a computer-generated invoice
          </p>
        </div>
      </div>

      {/* Screen content */}
      <div className="p-4 md:p-8 animate-fade-in-up space-y-6 no-print">
        <p className="text-xs text-muted-foreground">
          <Link href="/orders" className="hover:text-primary">My orders</Link> › #{order.id}
        </p>

        {/* Header */}
        <div className="bg-card rounded-card border border-border p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-heading font-bold text-2xl">Order #{order.id}</h1>
              <p className="text-sm text-muted-foreground mt-1">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-pill text-xs capitalize ${statusColors[order.orderStatus] || "bg-muted text-muted-foreground"}`}>
                Status: {order.orderStatus === "processing" && order.paymentStatus === "confirmed" ? "Packing" : order.orderStatus}
              </span>
              <span className={`px-3 py-1 rounded-pill text-xs capitalize ${paymentStatusColors[order.paymentStatus] || "bg-muted text-muted-foreground"}`}>
                Payment: {order.paymentStatus === "pending" ? "Confirmation Pending" : order.paymentStatus === "confirmed" ? "Verified" : order.paymentStatus}
              </span>
            </div>
          </div>

          {/* Payment Proof Status Banner */}
          {order.paymentStatus === "pending" ? (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-300 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold">⏳ Payment Confirmation Pending</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-0.5">
                  Our team is verifying your uploaded payment proof screenshot. Once verified by admin, your order will automatically proceed to packing!
                </p>
              </div>
              {order.paymentScreenshot && (
                <a href={order.paymentScreenshot} target="_blank" rel="noopener noreferrer" className="shrink-0 group">
                  <img src={order.paymentScreenshot} alt="Payment Receipt" className="w-12 h-12 object-cover rounded-lg border border-amber-300 group-hover:scale-105 transition-transform" />
                </a>
              )}
            </div>
          ) : order.paymentStatus === "confirmed" ? (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-900 dark:text-emerald-300 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold">✅ Payment Verified by Admin</p>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-400 mt-0.5">
                  Your payment receipt has been verified! Your order is now in packing and being prepared for dispatch.
                </p>
              </div>
              {order.paymentScreenshot && (
                <a href={order.paymentScreenshot} target="_blank" rel="noopener noreferrer" className="shrink-0 group">
                  <img src={order.paymentScreenshot} alt="Payment Receipt" className="w-12 h-12 object-cover rounded-lg border border-emerald-300 group-hover:scale-105 transition-transform" />
                </a>
              )}
            </div>
          ) : null}
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
                <tr className="border-t border-border bg-muted/20 text-xs">
                  <td colSpan={3} className="p-2.5 text-right font-medium text-muted-foreground">Items Subtotal</td>
                  <td className="p-2.5 text-right font-mono font-medium">
                    Rs {order.items.reduce((s, i) => s + i.pricePerPc * i.qty, 0).toLocaleString()}
                  </td>
                </tr>
                {order.deliveryCharges !== undefined && (
                  <tr className="border-t border-border bg-muted/20 text-xs">
                    <td colSpan={3} className="p-2.5 text-right font-medium text-muted-foreground">Delivery Charges</td>
                    <td className="p-2.5 text-right font-mono font-medium">Rs {order.deliveryCharges.toLocaleString()}</td>
                  </tr>
                )}
                {!!order.discount && (
                  <tr className="border-t border-border bg-muted/20 text-xs text-emerald-600">
                    <td colSpan={3} className="p-2.5 text-right font-medium">Discount / Adjustments</td>
                    <td className="p-2.5 text-right font-mono font-medium">- Rs {order.discount.toLocaleString()}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-border bg-muted/40">
                  <td colSpan={3} className="p-3 text-right font-heading font-bold">Grand Total</td>
                  <td className="p-3 text-right font-heading font-bold text-lg text-primary">
                    Rs {order.total.toLocaleString()}
                  </td>
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
          <button onClick={handlePrintInvoice} className="h-11 px-6 rounded-lg border border-border text-sm hover:bg-muted transition-colors">Download invoice</button>
          <a href={`https://wa.me/923001234567?text=Issue%20with%20order%20${order.id}`} target="_blank" rel="noopener noreferrer"
            className="h-11 px-6 rounded-lg border border-border text-sm hover:bg-muted transition-colors flex items-center">Report an issue</a>
        </div>
      </div>
    </>
  );
}
