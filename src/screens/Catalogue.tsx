import { useState, useMemo } from "react";
import { SlidersHorizontal, Search, X } from "lucide-react";
import { categories } from "@/data/mockData";
import { ProductCard } from "@/components/ProductCard";
import { CartSidebar } from "@/components/CartSidebar";
import { useMergedCatalog } from "@/hooks/useMergedCatalog";

export default function CataloguePage() {
  const { merged: products } = useMergedCatalog();
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState([50, 2000]);
  const [visibleCount, setVisibleCount] = useState(8);

  const filtered = useMemo(() => {
    let list = [...products];
    if (activeCategory === "New this week") list = list.filter(p => p.tags.includes("new"));
    else if (activeCategory === "Trending") list = list.filter(p => p.tags.includes("hot"));
    else if (activeCategory !== "All") list = list.filter(p => p.category === activeCategory);
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (stockFilter === "in_stock") list = list.filter(p => p.stock > 0);
    if (stockFilter === "low_stock") list = list.filter(p => p.stock > 0 && p.stock < 100);
    list = list.filter(p => p.pricePerPc >= priceRange[0] && p.pricePerPc <= priceRange[1]);
    if (sortBy === "price_asc") list.sort((a, b) => a.pricePerPc - b.pricePerPc);
    else if (sortBy === "price_desc") list.sort((a, b) => b.pricePerPc - a.pricePerPc);
    else if (sortBy === "trending") {
      const score = (p: (typeof list)[number]) =>
        (p.tags.includes("hot") ? 1 : 0) + (p.showInTrending ? 2 : 0);
      list.sort((a, b) => score(b) - score(a));
    }
    return list;
  }, [products, activeCategory, search, stockFilter, sortBy, priceRange]);

  return (
    <div className="p-4 md:p-8 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl md:text-3xl">Catalogue</h1>
        <span className="text-sm text-muted-foreground">{products.length} products · Updated Thursday 10 Apr</span>
      </div>

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
              <label className="text-sm font-medium block mb-2">Price range: Rs {priceRange[0]} – Rs {priceRange[1]}</label>
              <input type="range" min={50} max={2000} step={10} value={priceRange[1]} onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])}
                className="w-full accent-primary" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setStockFilter("all"); setSortBy("newest"); setPriceRange([50, 2000]); }} className="text-sm text-muted-foreground hover:text-foreground">Reset all</button>
          </div>
        </div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.slice(0, visibleCount).map(p => <ProductCard key={p.id} product={p} />)}
      </div>

      {visibleCount < filtered.length && (
        <div className="text-center mt-8">
          <button onClick={() => setVisibleCount(v => v + 8)} className="h-11 px-8 rounded-pill border border-border text-sm font-medium hover:bg-muted transition-colors">
            Load more products
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No products found matching your filters.</p>
        </div>
      )}

      <CartSidebar />
    </div>
  );
}
