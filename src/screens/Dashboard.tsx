import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, BookOpen, ArrowUpRight, TrendingUp, ShoppingBag, Globe2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

import { ProductCard } from "@/components/ProductCard";
import { fetchTrendingThisWeek } from "@/lib/supabase/productsApi";
import { fetchPublishedBlasts, blastVisibleForMemberCity } from "@/lib/supabase/blastsApi";
import { useMergedCatalog } from "@/hooks/useMergedCatalog";



function StatValue({ value, prefix = "" }: { value?: number | null; prefix?: string }) {
  if (value == null || value === 0) {
    return <p className="font-heading font-bold text-xl text-muted-foreground/60">—</p>;
  }
  return (
    <p className="font-heading font-bold text-xl text-primary-foreground">
      {prefix}
      {value.toLocaleString()}
    </p>
  );
}

export default function DashboardPage() {
  const { member } = useAuth();

  const { data: trendingFromDb } = useQuery({
    queryKey: ["trending-this-week"],
    queryFn: fetchTrendingThisWeek,
    staleTime: 30_000,
  });
  const trending = useMemo(() => trendingFromDb?.slice(0, 4) ?? [], [trendingFromDb]);


  const { data: publishedBlasts = [] } = useQuery({
    queryKey: ["blasts-published"],
    queryFn: fetchPublishedBlasts,
    staleTime: 30_000,
  });
  const memberBlasts = useMemo(
    () => publishedBlasts.filter(b => blastVisibleForMemberCity(b, member?.city)),
    [publishedBlasts, member?.city],
  );

  const monthlySpend = member?.totalSpent && member.totalSpent > 0 ? member.totalSpent : null;

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
            <StatValue value={member?.totalOrders} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">This month</p>
            <StatValue value={monthlySpend} prefix="Rs " />
          </div>
          <div className="relative">
            <p className="text-xs text-muted-foreground">Saved vs market</p>
            <StatValue value={member?.savedVsMarket} prefix="Rs " />
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

      {/* Learn more about e-commerce */}
      <div>
        <h3 className="font-heading font-bold text-lg mb-3 flex items-center gap-2">
          <BookOpen size={18} className="text-primary shrink-0" aria-hidden />
          Learn more about e-commerce
        </h3>
        <Link href="/blogs" className="block group">
          <div className="relative overflow-hidden rounded-card border border-border bg-card p-5 hover:border-primary/40 transition-all duration-300 hover:shadow-md">
            <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sourcing guides, Instagram growth tips, dropshipping strategies and Pakistan ecommerce trends — written for resellers like you.
                </p>
                {/* Topic chips */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    { icon: Globe2,      label: "Sourcing from China" },
                    { icon: TrendingUp,  label: "Instagram Growth"   },
                    { icon: ShoppingBag, label: "Dropshipping UAE"   },
                  ].map(({ icon: Icon, label }) => (
                    <span key={label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/15 text-primary text-[11px] font-mono">
                      <Icon size={11} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              {/* CTA */}
              <div className="shrink-0 self-center">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-primary bg-transparent text-primary font-mono text-xs font-semibold uppercase tracking-widest group-hover:bg-primary/8 transition-colors">
                  Read blogs
                  <ArrowUpRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
            </div>
          </div>
        </Link>
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


    </div>
  );
}
