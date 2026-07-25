"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Search,
  RefreshCw,
  Eye,
  ShieldCheck,
  CreditCard,
  User,
  X
} from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  fetchAllSubscriptions,
  confirmSubscriptionPayment,
  rejectSubscriptionPayment,
  SubscriptionInfo
} from "@/lib/api/subscriptionApi";

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchAllSubscriptions();
    setSubscriptions(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirm = async (sub: SubscriptionInfo) => {
    setActionId(sub.id || sub.userEmail);
    toast.info(`Confirming payment for ${sub.userEmail}...`);

    const res = await confirmSubscriptionPayment(sub.id || "", sub.userEmail);
    setActionId(null);

    if (res.success) {
      toast.success(`Subscription confirmed! User ${sub.userEmail} unlocked.`);
      loadData();
    } else {
      toast.error("Confirmation failed", { description: res.error });
    }
  };

  const handleReject = async (sub: SubscriptionInfo) => {
    setActionId(sub.id || sub.userEmail);
    const res = await rejectSubscriptionPayment(sub.id || "", sub.userEmail);
    setActionId(null);

    if (res.success) {
      toast.info(`Subscription rejected for ${sub.userEmail}.`);
      loadData();
    } else {
      toast.error("Rejection failed", { description: res.error });
    }
  };

  const filtered = subscriptions.filter(s => {
    const matchesFilter = filter === "all" ? true : s.status === filter;
    const matchesSearch =
      s.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      s.userName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
              <CreditCard className="text-primary" size={24} />
              Member Subscriptions ($10/month)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Verify bank transfer payment screenshots and unlock member AI Listing & Shopify Integrations.
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium hover:bg-muted transition-colors shrink-0"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh Requests
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-xl w-full sm:w-auto">
            {(["all", "pending", "active", "rejected"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                  filter === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-card text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground space-y-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm">Loading member subscriptions...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <p className="text-base font-semibold">No subscription records found.</p>
              <p className="text-xs">Member payment proof submissions will appear here for verification.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4">Member</th>
                    <th className="px-6 py-4">Payment Proof</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Submitted Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(sub => (
                    <tr key={sub.id || sub.userEmail} className="hover:bg-muted/30 transition-colors">
                      {/* User Info */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{sub.userName || "Member"}</div>
                        <div className="text-xs text-muted-foreground">{sub.userEmail}</div>
                      </td>

                      {/* Payment Proof Image */}
                      <td className="px-6 py-4">
                        {sub.paymentProofUrl ? (
                          <button
                            onClick={() => setViewImage(sub.paymentProofUrl)}
                            className="flex items-center gap-2 group text-xs text-primary hover:underline"
                          >
                            <img
                              src={sub.paymentProofUrl}
                              alt="Payment Proof Thumbnail"
                              className="w-12 h-12 object-cover rounded-lg border border-border group-hover:border-primary transition-all"
                            />
                            <span className="flex items-center gap-1 font-medium">
                              <Eye size={14} /> View Proof
                            </span>
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No Proof Attached</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 font-bold text-foreground">
                        ${sub.amount || 10.00} USD
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "—"}
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        {sub.status === "active" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 size={12} /> Confirmed & Active
                          </span>
                        )}
                        {sub.status === "pending" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Clock size={12} /> Pending Verification
                          </span>
                        )}
                        {sub.status === "rejected" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            <XCircle size={12} /> Rejected
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        {sub.status !== "active" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleConfirm(sub)}
                              disabled={actionId === (sub.id || sub.userEmail)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-60"
                            >
                              <ShieldCheck size={14} /> Confirm Payment
                            </button>
                            {sub.status === "pending" && (
                              <button
                                onClick={() => handleReject(sub)}
                                disabled={actionId === (sub.id || sub.userEmail)}
                                className="px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground font-medium text-xs hover:text-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Member Unlocked 🔓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal to view full-size image proof */}
        {viewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative max-w-3xl w-full max-h-[90vh] bg-card p-4 rounded-2xl border border-border shadow-2xl flex flex-col items-center">
              <button
                onClick={() => setViewImage(null)}
                className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black transition-colors"
              >
                <X size={20} />
              </button>
              <img
                src={viewImage}
                alt="Payment Proof Full Size"
                className="max-h-[80vh] w-auto object-contain rounded-lg"
              />
              <div className="mt-4 flex gap-4">
                <a
                  href={viewImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
                >
                  <ExternalLink size={14} /> Open Original File in New Tab
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
