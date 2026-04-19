import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { orders } from "@/data/mockData";
import { fetchAdminProductsFromDb } from "@/lib/supabase/productsApi";
import { fetchMembershipApplications } from "@/lib/supabase/applicationsApi";

export default function AdminDashboardPage() {
  const { data: cloudProducts = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: fetchAdminProductsFromDb,
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["membership-applications"],
    queryFn: fetchMembershipApplications,
    staleTime: 15_000,
  });

  const approvedCount = applications.filter(a => a.status === "approved").length;
  const pendingCount = applications.filter(a => a.status === "pending").length;
  const pendingPreview = applications.filter(a => a.status === "pending").slice(0, 5);

  const stats = [
    { label: "Live catalogue products", value: cloudProducts.length.toString() },
    { label: "Approved members", value: approvedCount.toString() },
    { label: "Revenue this month", value: "Rs 4,82,000" },
    { label: "Pending applications", value: pendingCount.toString(), accent: true },
  ];

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-6 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="font-heading font-bold text-2xl">Dashboard</h1>
          <Link
            href="/admin/products"
            className="text-sm font-medium text-primary hover:underline"
          >
            Manage products →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-card rounded-card border border-border p-5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`font-heading font-bold text-2xl mt-1 ${s.accent ? "text-primary" : ""}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-card border border-border p-6">
            <h2 className="font-heading font-semibold mb-3">Recent Orders</h2>
            {orders.slice(0, 5).map(o => (
              <div key={o.id} className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
                <span className="font-mono">#{o.id}</span>
                <span>Rs {o.total.toLocaleString()}</span>
                <span className="capitalize text-muted-foreground">{o.orderStatus}</span>
              </div>
            ))}
          </div>
          <div className="bg-card rounded-card border border-border p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-semibold">Pending applications</h2>
              <Link href="/admin/applications" className="text-xs text-primary hover:underline">
                Open →
              </Link>
            </div>
            {pendingPreview.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending applications.</p>
            ) : (
              pendingPreview.map(a => (
                <div key={a.id} className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
                  <span>{a.name}</span>
                  <span className="text-muted-foreground">{a.city}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
