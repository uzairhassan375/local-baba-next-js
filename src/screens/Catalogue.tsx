import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, Search, X, Package } from "lucide-react";
import { categories } from "@/data/mockData";
import { ProductCard } from "@/components/ProductCard";
import { CartSidebar } from "@/components/CartSidebar";
import { useMergedCatalog } from "@/hooks/useMergedCatalog";
import { fetchChinaDeliveryPrices, deliveryPriceForCategory } from "@/lib/supabase/chinaDeliveryApi";

type CatalogTab = "standard" | "china";

export default function CataloguePage() {
  const { merged: products } = useMergedCatalog();
  const [catalogTab, setCatalogTab] = useState<CatalogTab>("standard");
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  /** null = use full bounds from loaded products (avoids hiding items outside the old 50–2000 default). */
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [visibleCount, setVisibleCount] = useState(8);

  const { data: chinaDeliveryPrices = [] } = useQuery({
    queryKey: ["china-delivery-prices"],
    queryFn: fetchChinaDeliveryPrices,
    staleTime: 60_000,
    enabled: catalogTab === "china",
  });

  const catalogProducts = useMemo(
    () => products.filter(p => (p.catalogType ?? "standard") === catalogTab),
    [products, catalogTab],
  );

  const priceBounds = useMemo((): [number, number] => {
    if (catalogProducts.length === 0) return [0, 2000];
    const prices = catalogProducts.map(p => p.pricePerPc);
    const min = Math.floor(Math.min(...prices) / 10) * 10;
    const max = Math.ceil(Math.max(...prices) / 10) * 10;
    return [Math.max(0, min), Math.max(min + 10, max)];
  }, [catalogProducts]);

  const activePriceRange = priceRange ?? priceBounds;

  const filtered = useMemo(() => {
    let list = [...catalogProducts];
    if (activeCategory === "New this week") list = list.filter(p => p.tags.includes("new"));
    else if (activeCategory === "Trending") list = list.filter(p => p.tags.includes("hot"));
    else if (activeCategory !== "All") list = list.filter(p => p.category === activeCategory);
    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q),
      );
    }
    if (stockFilter === "in_stock") list = list.filter(p => p.stock > 0);
    if (stockFilter === "low_stock") list = list.filter(p => p.stock > 0 && p.stock < 100);
    list = list.filter(p => p.pricePerPc >= activePriceRange[0] && p.pricePerPc <= activePriceRange[1]);
    if (sortBy === "price_asc") list.sort((a, b) => a.pricePerPc - b.pricePerPc);
    else if (sortBy === "price_desc") list.sort((a, b) => b.pricePerPc - a.pricePerPc);
    else if (sortBy === "trending") {
      const score = (p: (typeof list)[number]) =>
        (p.tags.includes("hot") ? 1 : 0) + (p.showInTrending ? 2 : 0);
      list.sort((a, b) => score(b) - score(a));
    }
    return list;
  }, [catalogProducts, activeCategory, search, stockFilter, sortBy, activePriceRange]);

  const switchTab = (tab: CatalogTab) => {
    setCatalogTab(tab);
    setActiveCategory("All");
    setVisibleCount(8);
    setPriceRange(null);
    setSearch("");
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl md:text-3xl">Catalogue</h1>
        <span className="text-sm text-muted-foreground">{catalogProducts.length} products</span>
      </div>

      {/* Catalog type tabs */}
      <div className="flex gap-2 mb-4">
        {([
          { id: "standard" as const, label: "Local catalog", desc: "Ready stock in Pakistan" },
          { id: "china" as const, label: "China catalog", desc: "Direct import · category delivery rates" },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`flex-1 md:flex-none md:min-w-[200px] p-4 rounded-card border text-left transition-colors ${
              catalogTab === tab.id
                ? "border-primary bg-primary/5 shadow-subtle"
                : "border-border hover:border-primary/50"
            }`}
          >
            <p className="font-heading font-semibold text-sm">{tab.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{tab.desc}</p>
          </button>
        ))}
      </div>

      {catalogTab === "china" && chinaDeliveryPrices.length > 0 && (
        <div className="bg-olive/10 rounded-card border border-olive/20 p-4 mb-4">
          <p className="text-xs font-medium text-olive mb-2 flex items-center gap-1.5">
            <Package size={14} /> Delivery by category
          </p>
          <div className="flex flex-wrap gap-2">
            {chinaDeliveryPrices.map(d => (
              <span key={d.id} className="text-xs bg-card border border-border rounded-pill px-3 py-1">
                {d.category}: <strong>Rs {d.deliveryPrice.toLocaleString()}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setVisibleCount(8); }}
            className={`h-9 px-4 rounded-pill text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              activeCategory === cat ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 mt-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products e.g. phone stand, kurta..."
            className="w-full h-11 pl-9 pr-3 rounded-lg border border-border bg-card focus:border-primary focus:outline-none text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="h-11 px-4 rounded-lg border border-border flex items-center gap-2 text-sm hover:bg-muted transition-colors"
        >
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-card rounded-card border border-border p-6 mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold">Filters</h3>
            <button onClick={() => setShowFilters(false)}><X size={18} /></button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium block mb-2">Stock status</label>
              {[{ v: "all", l: "All" }, { v: "in_stock", l: "In stock only" }, { v: "low_stock", l: "Low stock" }].map(o => (
                <label key={o.v} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                  <input type="radio" name="stock" checked={stockFilter === o.v} onChange={() => setStockFilter(o.v)} className="accent-primary" />{o.l}
                </label>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Sort by</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm">
                <option value="newest">Newest first</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="trending">Trending</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">
                Price range: Rs {activePriceRange[0]} – Rs {activePriceRange[1]}
              </label>
              <input
                type="range"
                min={priceBounds[0]}
                max={priceBounds[1]}
                step={10}
                value={activePriceRange[1]}
                onChange={e => setPriceRange([activePriceRange[0], Number(e.target.value)])}
                className="w-full accent-primary"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                setStockFilter("all");
                setSortBy("newest");
                setPriceRange(null);
                setActiveCategory("All");
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Reset all
            </button>
          </div>
        </div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {filtered.slice(0, visibleCount).map(p => (
          <ProductCard
            key={p.id}
            product={p}
            deliveryPrice={catalogTab === "china" ? deliveryPriceForCategory(chinaDeliveryPrices, p.category) : null}
          />
        ))}
      </div>

      {visibleCount < filtered.length && (
        <div className="text-center mt-8">
          <button onClick={() => setVisibleCount(v => v + 8)} className="h-11 px-8 rounded-pill border border-border text-sm font-medium hover:bg-muted transition-colors">
            Load more products
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <p className="text-muted-foreground">No products found in this catalog.</p>
          {catalogProducts.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {catalogProducts.length} product(s) loaded but hidden by filters — try category “All”, clear search, and
              Reset filters.
            </p>
          )}
        </div>
      )}

      <CartSidebar />
    </div>
  );
}
