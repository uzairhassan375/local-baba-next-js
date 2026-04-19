import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Megaphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { orders } from "@/data/mockData";
import { ProductCard } from "@/components/ProductCard";
import { fetchTrendingThisWeek } from "@/lib/supabase/productsApi";
import { fetchPublishedBlasts, blastVisibleForMemberCity } from "@/lib/supabase/blastsApi";

const statusColors: Record<string, string> = {
  processing: "bg-amber-100 text-amber-800",
  dispatched: "bg-blue-100 text-blue-800",
  delivered: "bg-olive/20 text-olive",
  cancelled: "bg-danger/10 text-danger",
};

export default function DashboardPage() {
  const { member } = useAuth();
  const { data: trendingFromDb } = useQuery({
    queryKey: ["trending-this-week"],
    queryFn: fetchTrendingThisWeek,
    staleTime: 30_000,
  });
  const trending = useMemo(() => trendingFromDb?.slice(0, 4) ?? [], [trendingFromDb]);
  const recentOrders = orders.slice(0, 4);

  const { data: publishedBlasts = [] } = useQuery({
    queryKey: ["blasts-published"],
    queryFn: fetchPublishedBlasts,
    staleTime: 30_000,
  });
  const memberBlasts = useMemo(
    () => publishedBlasts.filter(b => blastVisibleForMemberCity(b, member?.city)),
    [publishedBlasts, member?.city],
  );

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in-up">
      {/* Welcome */}
      <div className="bg-dark rounded-card p-6 border-l-4 border-primary">
        <p className="font-heading font-bold text-xl md:text-2xl text-primary-foreground">
          Good morning, {member?.name || "Member"}
        </p>
        <p className="text-muted-foreground text-sm mt-1">
          Member since {member?.joinedDate} · {member?.city}
        </p>
        <div className="flex flex-wrap gap-6 mt-4">
          <div>
            <p className="text-xs text-muted-foreground">Total orders</p>
            <p className="font-heading font-bold text-xl text-primary-foreground">{member?.totalOrders}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">This month</p>
            <p className="font-heading font-bold text-xl text-primary-foreground">Rs {(45000).toLocaleString()}</p>
          </div>
          <div className="relative">
            <p className="text-xs text-muted-foreground">Saved vs market</p>
            <p className="font-heading font-bold text-xl text-primary">Rs {member?.savedVsMarket?.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Admin announcements (blasts) */}
      {memberBlasts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading font-bold text-lg flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary shrink-0" aria-hidden />
            Announcements
          </h3>
          <div className="space-y-3">
            {memberBlasts.map(b => (
              <article
                key={b.id}
                className="bg-card rounded-card border border-border p-4 md:p-5 border-l-4 border-l-primary shadow-subtle"
              >
                {b.title ? (
                  <h4 className="font-heading font-semibold text-base">{b.title}</h4>
                ) : null}
                <p className={`text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed ${b.title ? "mt-2" : ""}`}>
                  {b.body}
                </p>
                <p className="text-[11px] text-muted-foreground mt-3">
                  {new Date(b.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Quick Reorder */}
      <div>
        <h3 className="font-heading font-bold text-lg mb-1">Reorder your favourites</h3>
        <p className="text-xs text-muted-foreground mb-3">Based on your last orders</p>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          {recentOrders.flatMap(o => o.items).slice(0, 4).map((item, i) => (
            <div key={i} className="min-w-[160px] bg-card rounded-card border border-border p-3 flex-shrink-0">
              <div className="w-full aspect-square bg-muted rounded-lg mb-2 overflow-hidden">
                <img src={item.image} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <p className="text-xs font-medium line-clamp-2">{item.name}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Last ordered: 18 Mar</p>
              <button className="w-full h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold mt-2 hover:bg-accent-hover transition-colors">
                Reorder {item.qty} pcs
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Trending */}
      <div>
        <h3 className="font-heading font-bold text-lg mb-3">Trending this week</h3>
        {trending.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No products in this list yet. In admin, mark active products as “Trending this week” to show them here.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trending.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div>
        <h3 className="font-heading font-bold text-lg mb-3">Recent orders</h3>
        <div className="bg-card rounded-card border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 font-medium text-muted-foreground">Order ID</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Items</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Total</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-mono font-medium">#{o.id}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{o.items.length} products</td>
                  <td className="p-3 font-heading font-bold">Rs {o.total.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-pill text-xs font-medium ${statusColors[o.orderStatus]}`}>
                      {o.orderStatus}
                    </span>
                  </td>
                  <td className="p-3">
                    <Link href={`/orders/${o.id}`} className="text-primary text-xs hover:underline">
                      {o.orderStatus === "delivered" ? "Reorder" : "Track"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Community */}
      <div className="bg-olive/10 rounded-card p-6 border border-olive/20">
        <h3 className="font-heading font-bold text-lg">Join the member community</h3>
        <p className="text-muted-foreground text-sm mt-1">Get early drops, selling tips, and flash deals before anyone else.</p>
        <a href="https://wa.me/923001234567" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 h-10 px-5 rounded-lg bg-olive text-primary-foreground text-sm font-semibold mt-4">
          Join WhatsApp group <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
}
