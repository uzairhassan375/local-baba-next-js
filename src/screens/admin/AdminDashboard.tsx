import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
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

  const stats = [
    { label: "Live catalogue products", value: cloudProducts.length.toString() },
    { label: "Approved members", value: approvedCount.toString() },
    { label: "Revenue this month", value: "Rs 4,82,000" },
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-card rounded-card border border-border p-5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-heading font-bold text-2xl mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Recent Orders — live only, no mocks */}
        <div className="bg-card rounded-card border border-border p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Orders placed by members will appear here once received.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
