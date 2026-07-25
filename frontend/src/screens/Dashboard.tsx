import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, BookOpen, ArrowRight, Clock, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/contexts/OrdersContext";

import { ProductCard } from "@/components/ProductCard";
import { ProductMedia } from "@/components/ProductMedia";
import { fetchTrendingThisWeek } from "@/lib/supabase/productsApi";
import { fetchPublishedBlasts, blastVisibleForMemberCity } from "@/lib/supabase/blastsApi";

function StatValue({ value, prefix = "" }: { value?: number | null; prefix?: string }) {
  if (value == null) {
    return <p className="font-heading font-bold text-xl text-muted-foreground/60">—</p>;
  }
  return (
    <p className="font-heading font-bold text-xl text-primary-foreground">
      {prefix}
      {value.toLocaleString()}
    </p>
  );
}

const ecommerceBlogs = [
  {
    id: "4",
    title: "How to Source Products from China: 2026 Beginner's Guide",
    category: "Sourcing Guide",
    readTime: "12 min read",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=450&fit=crop",
    excerpt: "Step-by-step guide for Pakistani resellers on finding factory suppliers, price negotiation, and shipping safely.",
    tag: "SOURCING",
    tagClass: "bg-primary text-primary-foreground",
  },
  {
    id: "2",
    title: "Dropshipping in UAE: Handling Customer Reviews & Returns",
    category: "Dropshipping Tips",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&h=450&fit=crop",
    excerpt: "How to protect your store reputation and manage cross-border returns effectively without losing profits.",
    tag: "DROPSHIPPING",
    tagClass: "bg-blue-600 text-white",
  },
  {
    id: "3",
    title: "Best Suppliers in Saudi Arabia: Ecommerce Blueprint 2026",
    category: "Supplier Guide",
    readTime: "10 min read",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=450&fit=crop",
    excerpt: "Comparing top suppliers, ZATCA VAT rules, and high-margin product niches for Saudi market resellers.",
    tag: "MARKET GUIDE",
    tagClass: "bg-emerald-600 text-white",
  },
  {
    id: "1",
    title: "The Local Baba Reviews: What Resellers Are Saying in 2026",
    category: "Reseller Reviews",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=450&fit=crop",
    excerpt: "Genuine reseller stories, 15-35% importer savings, and member experiences across Lahore, Karachi, and Islamabad.",
    tag: "REVIEWS",
    tagClass: "bg-amber-600 text-white",
  },
];

export default function DashboardPage() {
  const { member } = useAuth();
  const { orders } = useOrders();

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
    <div className="p-4 md:p-8 space-y-8 animate-fade-in-up">
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
            <StatValue value={orders.length} />
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

      {/* Learn more about e-commerce (Product Style Blog Grid) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-lg flex items-center gap-2">
            <BookOpen size={20} className="text-primary shrink-0" aria-hidden />
            Learn more about e-commerce
          </h3>
          <Link
            href="/blogs"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View all blogs <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {ecommerceBlogs.map(blog => (
            <div
              key={blog.id}
              className="bg-card rounded-card border border-border overflow-hidden group transition-all duration-300 hover:shadow-card hover:border-primary/40 flex flex-col h-full"
            >
              <Link href="/blogs" className="block relative aspect-[4/3] bg-muted overflow-hidden">
                <ProductMedia
                  src={blog.image}
                  alt={blog.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span
                  className={`absolute top-2 left-2 px-2 py-0.5 rounded-pill text-[10px] uppercase font-bold tracking-wide ${blog.tagClass}`}
                >
                  {blog.tag}
                </span>
              </Link>
              <div className="p-4 flex flex-col flex-1 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>{blog.category}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {blog.readTime}
                  </span>
                </div>
                <Link href="/blogs" className="block">
                  <h4 className="font-heading font-semibold text-sm leading-snug line-clamp-2 text-foreground hover:text-primary transition-colors">
                    {blog.title}
                  </h4>
                </Link>
                <p className="text-xs text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
                  {blog.excerpt}
                </p>
                <div className="pt-2">
                  <Link
                    href="/blogs"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-accent-hover transition-colors"
                  >
                    Read article <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
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
    </div>
  );
}
