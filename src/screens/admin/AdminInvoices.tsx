"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useOrders, ManualInvoice } from "@/contexts/OrdersContext";
import { Order, Product, applications as mockApplications, currentMember } from "@/data/mockData";
import { useMergedCatalog } from "@/hooks/useMergedCatalog";
import { fetchMembershipApplications } from "@/lib/supabase/applicationsApi";
import { toast } from "sonner";
import {
  Search,
  Printer,
  Save,
  Plus,
  Trash2,
  Receipt,
  FileText,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Edit2,
  RefreshCw,
  Eye,
  User,
  Package,
  UserCheck,
  Sparkles,
  X,
  Check,
  Filter,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "auto" | "manual" | "overall";
type AutoSubTab = "search_edit" | "create_new";

interface UserOption {
  id: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  businessName?: string;
}

export default function AdminInvoicesPage() {
  const { orders, manualInvoices, updateOrder, addOrder, addManualInvoice, deleteManualInvoice, isLoadingOrders, refreshOrdersFromDb } = useOrders();
  const [activeMode, setActiveMode] = useState<Mode>("auto");
  const [autoSubTab, setAutoSubTab] = useState<AutoSubTab>("search_edit");

  // Load Database Products and Users
  const { merged: dbProducts = [] } = useMergedCatalog();
  const { data: memberApps = [] } = useQuery({
    queryKey: ["membership-applications"],
    queryFn: fetchMembershipApplications,
    staleTime: 30_000,
  });

  // Construct combined Database Users list
  const allDbUsers: UserOption[] = useMemo(() => {
    const list: UserOption[] = [];
    
    // Add current member
    list.push({
      id: currentMember.id,
      name: currentMember.name,
      phone: currentMember.whatsapp ? (currentMember.whatsapp.startsWith("0") ? currentMember.whatsapp : `0${currentMember.whatsapp}`) : "03001234567",
      city: currentMember.city,
      address: "Shop 14, Hall Road Market",
      businessName: "Ahmad Traders",
    });

    // Add approved/pending applications from Supabase DB
    memberApps.forEach(app => {
      if (!list.some(u => u.phone === app.whatsapp || u.id === app.id)) {
        list.push({
          id: app.id,
          name: app.name,
          phone: app.whatsapp ? (app.whatsapp.startsWith("0") ? app.whatsapp : `0${app.whatsapp}`) : "N/A",
          city: app.city || "Lahore",
          address: app.businessName ? `${app.businessName}, ${app.city}` : `${app.city} Market`,
          businessName: app.businessName,
        });
      }
    });

    // Add mock applications fallback
    mockApplications.forEach(app => {
      if (!list.some(u => u.phone === app.whatsapp || u.id === app.id)) {
        list.push({
          id: app.id,
          name: app.name,
          phone: `0${app.whatsapp}`,
          city: app.city,
          address: `${app.businessName}, ${app.city}`,
          businessName: app.businessName,
        });
      }
    });

    return list;
  }, [memberApps]);

  // -------------------------------------------------------------
  // AUTO DB MODE - 1. SEARCH PERSON OR PRODUCT -> SHOW ALL INVOICES
  // -------------------------------------------------------------
  const [personSearchQuery, setPersonSearchQuery] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<UserOption | null>(null);
  const [selectedProductFilter, setSelectedProductFilter] = useState<Product | null>(null);

  // Filtered Users list
  const filteredUsersList = useMemo(() => {
    if (!personSearchQuery.trim()) return [];
    const term = personSearchQuery.toLowerCase().trim();
    return allDbUsers.filter(
      u =>
        u.name.toLowerCase().includes(term) ||
        u.phone.toLowerCase().includes(term) ||
        u.city.toLowerCase().includes(term) ||
        (u.businessName && u.businessName.toLowerCase().includes(term))
    );
  }, [allDbUsers, personSearchQuery]);

  // Filtered Products list
  const filteredProductsList = useMemo(() => {
    if (!productSearchQuery.trim()) return [];
    const term = productSearchQuery.toLowerCase().trim();
    return dbProducts.filter(
      p =>
        p.name.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        p.category.toLowerCase().includes(term)
    );
  }, [dbProducts, productSearchQuery]);

  // All Invoices matching selected Person or selected Product (or query)
  const matchedPersonProductInvoices = useMemo(() => {
    return orders.filter(ord => {
      // Filter by selected person
      if (selectedPerson) {
        const matchName = ord.customerName?.toLowerCase().includes(selectedPerson.name.toLowerCase());
        const matchPhone = selectedPerson.phone && (ord.customerName?.includes(selectedPerson.phone) || ord.deliveryAddress?.includes(selectedPerson.phone));
        const matchMemberId = ord.memberId === selectedPerson.id;
        if (!matchName && !matchPhone && !matchMemberId) return false;
      }

      // Filter by selected product
      if (selectedProductFilter) {
        const hasProduct = ord.items.some(
          item =>
            item.productId === selectedProductFilter.id ||
            item.name.toLowerCase().includes(selectedProductFilter.name.toLowerCase()) ||
            (selectedProductFilter.sku && item.name.toLowerCase().includes(selectedProductFilter.sku.toLowerCase()))
        );
        if (!hasProduct) return false;
      }

      // General search query if entered
      if (personSearchQuery.trim() && !selectedPerson) {
        const term = personSearchQuery.toLowerCase().trim();
        const matchName = ord.customerName?.toLowerCase().includes(term);
        const matchId = ord.id.toLowerCase().includes(term);
        const matchCity = ord.city?.toLowerCase().includes(term);
        const matchAddr = ord.deliveryAddress?.toLowerCase().includes(term);
        if (!matchName && !matchId && !matchCity && !matchAddr) return false;
      }

      if (productSearchQuery.trim() && !selectedProductFilter) {
        const term = productSearchQuery.toLowerCase().trim();
        const hasProduct = ord.items.some(i => i.name.toLowerCase().includes(term) || i.productId.toLowerCase().includes(term));
        if (!hasProduct) return false;
      }

      return true;
    });
  }, [orders, selectedPerson, selectedProductFilter, personSearchQuery, productSearchQuery]);

  // Selected Order for editing
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Currently active selected order object
  const activeEditingOrder = useMemo(() => {
    if (selectedOrderId) {
      const found = orders.find(o => o.id === selectedOrderId);
      if (found) return found;
    }
    return matchedPersonProductInvoices[0] || orders[0] || null;
  }, [orders, selectedOrderId, matchedPersonProductInvoices]);

  // Editable fields state for selected order
  const [editingItemPrices, setEditingItemPrices] = useState<Record<number, number>>({});
  const [editingItemQtys, setEditingItemQtys] = useState<Record<number, number>>({});
  const [editingDelivery, setEditingDelivery] = useState<number | "">("");
  const [editingDiscount, setEditingDiscount] = useState<number | "">("");
  const [editingNotes, setEditingNotes] = useState<string>("");
  const [editingPaymentStatus, setEditingPaymentStatus] = useState<"confirmed" | "pending" | "failed">("confirmed");
  const [isSavingDb, setIsSavingDb] = useState(false);

  // Sync editor values when selected order changes
  const currentItems = useMemo(() => {
    if (!activeEditingOrder) return [];
    return activeEditingOrder.items.map((item, idx) => ({
      ...item,
      pricePerPc: editingItemPrices[idx] !== undefined ? editingItemPrices[idx] : item.pricePerPc,
      qty: editingItemQtys[idx] !== undefined ? editingItemQtys[idx] : item.qty,
    }));
  }, [activeEditingOrder, editingItemPrices, editingItemQtys]);

  const currentDeliveryCharges = editingDelivery !== "" ? Number(editingDelivery) : (activeEditingOrder?.deliveryCharges ?? 250);
  const currentDiscount = editingDiscount !== "" ? Number(editingDiscount) : (activeEditingOrder?.discount ?? 0);

  const calculatedSubtotal = useMemo(() => {
    return currentItems.reduce((acc, item) => acc + item.pricePerPc * item.qty, 0);
  }, [currentItems]);

  const calculatedTotal = useMemo(() => {
    return Math.max(0, calculatedSubtotal + currentDeliveryCharges - currentDiscount);
  }, [calculatedSubtotal, currentDeliveryCharges, currentDiscount]);

  // Save changes to Supabase & Sync to Member
  const handleSaveAutoInvoiceToDb = async () => {
    if (!activeEditingOrder) return;
    setIsSavingDb(true);

    try {
      const updatedItems = activeEditingOrder.items.map((item, idx) => ({
        ...item,
        pricePerPc: editingItemPrices[idx] !== undefined ? editingItemPrices[idx] : item.pricePerPc,
        qty: editingItemQtys[idx] !== undefined ? editingItemQtys[idx] : item.qty,
      }));

      await updateOrder(activeEditingOrder.id, {
        items: updatedItems,
        deliveryCharges: currentDeliveryCharges,
        discount: currentDiscount,
        total: calculatedTotal,
        notes: editingNotes || activeEditingOrder.notes,
        paymentStatus: editingPaymentStatus,
      });

      toast.success(`Invoice #${activeEditingOrder.id} updated in DB & synced to member dashboard!`);
    } catch (err) {
      toast.error("Failed to update invoice in database.");
      console.error(err);
    } finally {
      setIsSavingDb(false);
    }
  };

  // -------------------------------------------------------------
  // AUTO MODE - 2. CREATE NEW AUTO INVOICE FROM DB USER & PRODUCT
  // -------------------------------------------------------------
  const [newInvoiceUser, setNewInvoiceUser] = useState<UserOption | null>(null);
  const [newInvoiceProducts, setNewInvoiceProducts] = useState<
    Array<{
      productId: string;
      name: string;
      pricePerPc: number;
      qty: number;
      image: string;
      sku?: string;
    }>
  >([]);

  const [createDeliveryCharges, setCreateDeliveryCharges] = useState<number | "">(250);
  const [createDiscount, setCreateDiscount] = useState<number | "">(0);
  const [createPaymentMethod, setCreatePaymentMethod] = useState("bank_transfer");
  const [createPaymentStatus, setCreatePaymentStatus] = useState<"confirmed" | "pending" | "failed">("confirmed");
  const [createNotes, setCreateNotes] = useState("Thank you for doing business with Local Baba!");

  const createSubtotal = useMemo(() => {
    return newInvoiceProducts.reduce((sum, item) => sum + item.pricePerPc * item.qty, 0);
  }, [newInvoiceProducts]);

  const createGrandTotal = useMemo(() => {
    const del = createDeliveryCharges !== "" ? Number(createDeliveryCharges) : 0;
    const disc = createDiscount !== "" ? Number(createDiscount) : 0;
    return Math.max(0, createSubtotal + del - disc);
  }, [createSubtotal, createDeliveryCharges, createDiscount]);

  const handleCreateDbAutoInvoice = async () => {
    if (!newInvoiceUser) {
      toast.error("Please search and select a Customer first.");
      return;
    }
    if (newInvoiceProducts.length === 0) {
      toast.error("Please add at least one Product.");
      return;
    }

    try {
      const createdOrder = await addOrder({
        customerName: newInvoiceUser.name,
        memberId: newInvoiceUser.id,
        items: newInvoiceProducts,
        total: createGrandTotal,
        deliveryCharges: createDeliveryCharges !== "" ? Number(createDeliveryCharges) : 250,
        discount: createDiscount !== "" ? Number(createDiscount) : 0,
        paymentMethod: createPaymentMethod,
        paymentStatus: createPaymentStatus,
        deliveryAddress: newInvoiceUser.address,
        city: newInvoiceUser.city,
        notes: createNotes,
      });

      toast.success(`Auto Invoice #${createdOrder.id} saved to DB and linked to member!`);
      setNewInvoiceProducts([]);
      setNewInvoiceUser(null);
      setActiveMode("overall");
    } catch (err) {
      toast.error("Failed to create auto invoice in DB.");
    }
  };

  // -------------------------------------------------------------
  // MANUAL MODE - COMPLETELY EMPTY ON START WITH AUTOCOMPLETE & DB SYNC
  // -------------------------------------------------------------
  const [manualForm, setManualForm] = useState({
    invoiceNumber: `INV-LB-${Math.floor(1000 + Math.random() * 9000)}`,
    customerName: "",
    customerPhone: "",
    deliveryAddress: "",
    city: "",
    memberId: "m1",
    paymentMethod: "bank_transfer",
    paymentStatus: "confirmed" as "pending" | "confirmed" | "failed",
    dueDate: "",
    deliveryCharges: "" as number | "",
    discount: "" as number | "",
    notes: "",
    items: [] as { productId?: string; description: string; qty: number; rate: number; amount: number; image?: string }[],
  });

  const [showManualUserDropdown, setShowManualUserDropdown] = useState(false);
  const [activeManualProductDropdown, setActiveManualProductDropdown] = useState<number | null>(null);

  // Matching users for Manual Invoice Customer Name autocomplete
  const matchingManualUsers = useMemo(() => {
    if (!manualForm.customerName.trim()) return [];
    const term = manualForm.customerName.toLowerCase().trim();
    return allDbUsers.filter(
      u =>
        u.name.toLowerCase().includes(term) ||
        u.phone.toLowerCase().includes(term) ||
        u.city.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [allDbUsers, manualForm.customerName]);

  // Helper to match products for Manual Invoice item description autocomplete
  const getMatchingManualProducts = (text: string) => {
    if (!text.trim()) return [];
    const term = text.toLowerCase().trim();
    return dbProducts.filter(
      p =>
        p.name.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        p.category.toLowerCase().includes(term)
    ).slice(0, 5);
  };

  const manualSubtotal = useMemo(() => {
    return manualForm.items.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.rate) || 0)), 0);
  }, [manualForm.items]);

  const manualGrandTotal = useMemo(() => {
    const del = manualForm.deliveryCharges !== "" ? Number(manualForm.deliveryCharges) : 0;
    const disc = manualForm.discount !== "" ? Number(manualForm.discount) : 0;
    return Math.max(0, manualSubtotal + del - disc);
  }, [manualSubtotal, manualForm.deliveryCharges, manualForm.discount]);

  const handleAddManualItem = () => {
    setManualForm(prev => ({
      ...prev,
      items: [...prev.items, { description: "", qty: 1, rate: 0, amount: 0 }],
    }));
  };

  const handleUpdateManualItem = (index: number, field: string, value: any) => {
    setManualForm(prev => {
      const updated = [...prev.items];
      const item = { ...updated[index], [field]: value };
      if (field === "qty" || field === "rate") {
        item.amount = (Number(item.qty) || 0) * (Number(item.rate) || 0);
      }
      updated[index] = item;
      return { ...prev, items: updated };
    });
  };

  const handleRemoveManualItem = (index: number) => {
    setManualForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSaveManualInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.customerName.trim()) {
      toast.error("Please enter Customer / Seller Name.");
      return;
    }
    if (manualForm.items.length === 0) {
      toast.error("Please add at least one line item.");
      return;
    }

    try {
      // 1. Save directly to Supabase member_orders database table
      const createdOrder = await addOrder({
        customerName: manualForm.customerName,
        memberId: manualForm.memberId || "m1",
        items: manualForm.items.map((it, idx) => ({
          productId: it.productId || `manual-${idx}-${Date.now()}`,
          name: it.description || "Custom Item",
          qty: Number(it.qty) || 1,
          pricePerPc: Number(it.rate) || 0,
          image: it.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
        })),
        total: manualGrandTotal,
        deliveryCharges: Number(manualForm.deliveryCharges) || 0,
        discount: Number(manualForm.discount) || 0,
        paymentMethod: manualForm.paymentMethod,
        paymentStatus: manualForm.paymentStatus,
        deliveryAddress: manualForm.deliveryAddress || "Lahore Market",
        city: manualForm.city || "Lahore",
        notes: manualForm.notes,
      });

      // 2. Also add to manual invoices records list
      addManualInvoice({
        invoiceNumber: manualForm.invoiceNumber,
        customerName: manualForm.customerName,
        customerPhone: manualForm.customerPhone,
        deliveryAddress: manualForm.deliveryAddress || "Lahore Market",
        city: manualForm.city || "Lahore",
        items: manualForm.items,
        subtotal: manualSubtotal,
        deliveryCharges: Number(manualForm.deliveryCharges) || 0,
        discount: Number(manualForm.discount) || 0,
        total: manualGrandTotal,
        paymentMethod: manualForm.paymentMethod,
        paymentStatus: manualForm.paymentStatus,
        dueDate: manualForm.dueDate,
        notes: manualForm.notes,
      });

      toast.success(`Manual Invoice #${createdOrder.id} saved to Database and synced to Member Order Page!`);
      
      // Reset manual form to empty for next creation
      setManualForm({
        invoiceNumber: `INV-LB-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: "",
        customerPhone: "",
        deliveryAddress: "",
        city: "",
        memberId: "m1",
        paymentMethod: "bank_transfer",
        paymentStatus: "confirmed",
        dueDate: "",
        deliveryCharges: "",
        discount: "",
        notes: "",
        items: [],
      });
      setActiveMode("overall");
    } catch (err) {
      toast.error("Failed to save manual invoice to database.");
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // -------------------------------------------------------------
  // TOP SUMMARY CARDS - TIMEFRAME QUERY FILTER (ALL, TODAY, WEEK, MONTH, CUSTOM)
  // -------------------------------------------------------------
  const [statsTimeframe, setStatsTimeframe] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [customStatsStartDate, setCustomStatsStartDate] = useState<string>("");
  const [customStatsEndDate, setCustomStatsEndDate] = useState<string>("");

  const isDateInTimeframe = (dateStr: string) => {
    if (statsTimeframe === "all") return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();

    if (statsTimeframe === "today") {
      return d.toDateString() === now.toDateString();
    }
    if (statsTimeframe === "week") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return d >= sevenDaysAgo;
    }
    if (statsTimeframe === "month") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return d >= thirtyDaysAgo;
    }
    if (statsTimeframe === "custom") {
      if (customStatsStartDate) {
        const start = new Date(customStatsStartDate);
        start.setHours(0, 0, 0, 0);
        if (d < start) return false;
      }
      if (customStatsEndDate) {
        const end = new Date(customStatsEndDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    }
    return true;
  };

  // Filtered orders & manual invoices according to statsTimeframe
  const statsOrders = useMemo(() => orders.filter(o => isDateInTimeframe(o.createdAt)), [orders, statsTimeframe, customStatsStartDate, customStatsEndDate]);
  const statsManualInvoices = useMemo(() => manualInvoices.filter(m => isDateInTimeframe(m.createdAt)), [manualInvoices, statsTimeframe, customStatsStartDate, customStatsEndDate]);

  const statsTotalOrdersAmount = statsOrders.reduce((s, o) => s + o.total, 0);
  const statsTotalManualAmount = statsManualInvoices.reduce((s, m) => s + m.total, 0);
  const statsTotalCombinedInvoiced = statsTotalOrdersAmount + statsTotalManualAmount;
  const statsTotalInvoicesCount = statsOrders.length + statsManualInvoices.length;

  const statsTotalDeliveryCharges =
    statsOrders.reduce((s, o) => s + (o.deliveryCharges ?? 250), 0) +
    statsManualInvoices.reduce((s, m) => s + (Number(m.deliveryCharges) || 0), 0);

  const statsConfirmedCount =
    statsOrders.filter(o => o.paymentStatus === "confirmed").length +
    statsManualInvoices.filter(m => m.paymentStatus === "confirmed").length;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 md:p-8 space-y-6 animate-fade-in-up">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground flex items-center gap-2">
              <Receipt className="text-primary h-7 w-7" /> Admin Invoices & Billing
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Search member or product invoices from DB, edit unit prices/totals & sync back in real time.
            </p>
          </div>

          {/* Mode Selector Buttons */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border self-start sm:self-auto">
            <button
              onClick={() => setActiveMode("auto")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeMode === "auto"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles size={15} /> Auto DB Invoices
            </button>
            <button
              onClick={() => setActiveMode("manual")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeMode === "manual"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plus size={15} /> Manual Invoice
            </button>
            <button
              onClick={() => setActiveMode("overall")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeMode === "overall"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText size={15} /> Overall Records ({orders.length + manualInvoices.length})
            </button>
          </div>
        </div>

        {/* Timeframe Query Filter Bar */}
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Filter Summary Stats by Timeframe:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setStatsTimeframe("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statsTimeframe === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setStatsTimeframe("today")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statsTimeframe === "today"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setStatsTimeframe("week")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statsTimeframe === "week"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              1 Week (7 Days)
            </button>
            <button
              onClick={() => setStatsTimeframe("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statsTimeframe === "month"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              1 Month (30 Days)
            </button>
            <button
              onClick={() => setStatsTimeframe("custom")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statsTimeframe === "custom"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              Custom Date Range
            </button>
          </div>

          {/* Custom Date Inputs */}
          {statsTimeframe === "custom" && (
            <div className="w-full pt-2 flex items-center gap-2 border-t border-border">
              <span className="text-xs text-muted-foreground">From:</span>
              <Input
                type="date"
                value={customStatsStartDate}
                onChange={e => setCustomStatsStartDate(e.target.value)}
                className="h-8 text-xs w-36 font-mono bg-background"
              />
              <span className="text-xs text-muted-foreground">To:</span>
              <Input
                type="date"
                value={customStatsEndDate}
                onChange={e => setCustomStatsEndDate(e.target.value)}
                className="h-8 text-xs w-36 font-mono bg-background"
              />
            </div>
          )}
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Invoices</span>
              <FileText size={18} className="text-primary" />
            </div>
            <p className="text-2xl font-bold font-heading">{statsTotalInvoicesCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {statsOrders.length} Auto DB · {statsManualInvoices.length} Manual
            </p>
          </div>

          <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Amount</span>
              <DollarSign size={18} className="text-emerald-500" />
            </div>
            <p className="text-2xl font-bold font-heading text-emerald-600">
              Rs {statsTotalCombinedInvoiced.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Gross Billed Value</p>
          </div>

          <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Delivery Revenue</span>
              <TrendingUp size={18} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold font-heading text-blue-600">
              Rs {statsTotalDeliveryCharges.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total Delivery Charges</p>
          </div>

          <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Paid / Confirmed</span>
              <CheckCircle size={18} className="text-amber-500" />
            </div>
            <p className="text-2xl font-bold font-heading text-amber-600">
              {statsConfirmedCount} / {statsTotalInvoicesCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Confirmed Invoices</p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MODE 1: AUTO DB INVOICES (SEARCH PERSON / PRODUCT & EDIT)  */}
        {/* ========================================================= */}
        {activeMode === "auto" && (
          <div className="space-y-6">
            {/* Auto Mode Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setAutoSubTab("search_edit")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    autoSubTab === "search_edit"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Search size={14} /> Search Member or Product Invoices ({orders.length})
                </button>
                <button
                  onClick={() => setAutoSubTab("create_new")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    autoSubTab === "create_new"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Plus size={14} /> Create New Auto DB Invoice
                </button>
              </div>

              <Button
                onClick={() => void refreshOrdersFromDb()}
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                disabled={isLoadingOrders}
              >
                <RefreshCw size={13} className={isLoadingOrders ? "animate-spin" : ""} /> Refresh DB
              </Button>
            </div>

            {/* TAB 1: SEARCH MEMBER OR PRODUCT & EDIT EXISTING INVOICES */}
            {autoSubTab === "search_edit" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 5 Cols: Dual Search Bars (Person & Product) & Invoices List */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Search Box Card */}
                  <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
                    <h2 className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Filter size={14} className="text-primary" /> Filter DB Invoices by Person or Product
                    </h2>

                    {/* Search Person Input */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                        <User size={13} className="text-primary" /> Search Person (Name / Phone No):
                      </label>
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={personSearchQuery}
                          onChange={e => {
                            setPersonSearchQuery(e.target.value);
                            if (selectedPerson) setSelectedPerson(null);
                          }}
                          placeholder="Type member name or phone..."
                          className="pl-9 h-9 text-xs bg-background"
                        />
                        {selectedPerson && (
                          <button
                            onClick={() => setSelectedPerson(null)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-danger p-1"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Dropdown list of matching DB users if searching */}
                      {personSearchQuery.trim() && !selectedPerson && filteredUsersList.length > 0 && (
                        <div className="p-2 bg-popover border border-border rounded-lg shadow-md space-y-1 max-h-36 overflow-y-auto">
                          {filteredUsersList.map(u => (
                            <button
                              key={u.id}
                              onClick={() => {
                                setSelectedPerson(u);
                                setPersonSearchQuery(u.name);
                                toast.info(`Filtered invoices for: ${u.name}`);
                              }}
                              className="w-full text-left p-1.5 hover:bg-muted rounded text-xs flex items-center justify-between"
                            >
                              <span className="font-bold text-foreground">{u.name} ({u.city})</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{u.phone}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Search Product Input */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                        <Package size={13} className="text-primary" /> Search Product (Name / SKU):
                      </label>
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={productSearchQuery}
                          onChange={e => {
                            setProductSearchQuery(e.target.value);
                            if (selectedProductFilter) setSelectedProductFilter(null);
                          }}
                          placeholder="Type product name or SKU..."
                          className="pl-9 h-9 text-xs bg-background"
                        />
                        {selectedProductFilter && (
                          <button
                            onClick={() => setSelectedProductFilter(null)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-danger p-1"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Dropdown list of matching DB products if searching */}
                      {productSearchQuery.trim() && !selectedProductFilter && filteredProductsList.length > 0 && (
                        <div className="p-2 bg-popover border border-border rounded-lg shadow-md space-y-1 max-h-36 overflow-y-auto">
                          {filteredProductsList.map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setSelectedProductFilter(p);
                                setProductSearchQuery(p.name);
                                toast.info(`Filtered invoices containing: ${p.name}`);
                              }}
                              className="w-full text-left p-1.5 hover:bg-muted rounded text-xs flex items-center justify-between"
                            >
                              <span className="font-bold text-foreground truncate max-w-[200px]">{p.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">Rs {p.pricePerPc}/pc</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Active Filter Chips */}
                    {(selectedPerson || selectedProductFilter || personSearchQuery || productSearchQuery) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {selectedPerson && (
                          <span className="px-2 py-1 bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold rounded-md flex items-center gap-1">
                            <UserCheck size={11} /> {selectedPerson.name} ({selectedPerson.phone})
                            <X size={12} className="cursor-pointer hover:text-danger" onClick={() => setSelectedPerson(null)} />
                          </span>
                        )}
                        {selectedProductFilter && (
                          <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-600 text-[10px] font-bold rounded-md flex items-center gap-1">
                            <Package size={11} /> {selectedProductFilter.name}
                            <X size={12} className="cursor-pointer hover:text-danger" onClick={() => setSelectedProductFilter(null)} />
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setSelectedPerson(null);
                            setSelectedProductFilter(null);
                            setPersonSearchQuery("");
                            setProductSearchQuery("");
                          }}
                          className="text-[10px] text-muted-foreground hover:text-foreground underline ml-auto"
                        >
                          Clear Filters
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Left Column Invoices List */}
                  <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Matching Invoices ({matchedPersonProductInvoices.length})
                      </span>
                      <span className="text-[10px] text-muted-foreground">Click to edit invoice</span>
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin">
                      {matchedPersonProductInvoices.length > 0 ? (
                        matchedPersonProductInvoices.map(ord => {
                          const isSelected = ord.id === activeEditingOrder?.id;
                          return (
                            <button
                              key={ord.id}
                              onClick={() => {
                                setSelectedOrderId(ord.id);
                                setEditingItemPrices({});
                                setEditingItemQtys({});
                                setEditingDelivery("");
                                setEditingDiscount("");
                                setEditingNotes(ord.notes || "");
                                setEditingPaymentStatus(ord.paymentStatus);
                              }}
                              className={`w-full text-left p-3 rounded-lg border transition-all text-xs space-y-1.5 ${
                                isSelected
                                  ? "bg-primary/10 border-primary shadow-xs"
                                  : "bg-background border-border hover:border-primary/40 hover:bg-muted/30"
                              }`}
                            >
                              <div className="flex items-center justify-between font-mono font-bold">
                                <span className="text-primary">#{ord.id}</span>
                                <span className="text-foreground">Rs {ord.total.toLocaleString()}</span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="font-medium text-foreground truncate max-w-[170px]">
                                  👤 {ord.customerName || `Member #${ord.memberId}`}
                                </span>
                                <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                              </div>

                              <div className="text-[10px] text-muted-foreground truncate">
                                📦 {ord.items.map(i => i.name).join(", ")}
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center text-muted-foreground space-y-2">
                          <Receipt size={32} className="mx-auto opacity-50" />
                          <p className="font-semibold text-xs">No matching invoices found</p>
                          <p className="text-[10px]">Try clearing search filters above.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right 7 Cols: Printable Preview & Admin Unit Price/Total Editor */}
                <div className="lg:col-span-7 space-y-4">
                  {activeEditingOrder ? (
                    <div className="space-y-4">
                      {/* Top Action Bar */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h2 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
                            <Eye size={18} className="text-primary" /> Invoice #{activeEditingOrder.id}
                          </h2>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            activeEditingOrder.paymentStatus === "confirmed" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                          }`}>
                            {activeEditingOrder.paymentStatus}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
                            <Printer size={15} /> Print
                          </Button>
                          <Button
                            onClick={() => void handleSaveAutoInvoiceToDb()}
                            disabled={isSavingDb}
                            size="sm"
                            className="gap-2 bg-primary text-primary-foreground font-semibold shadow-xs"
                          >
                            <Save size={15} /> {isSavingDb ? "Saving..." : "Save & Sync to DB"}
                          </Button>
                        </div>
                      </div>

                      {/* Admin Unit Price & Delivery Editor Box */}
                      <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
                        <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-lg text-xs text-foreground flex items-center gap-2">
                          <Sparkles size={16} className="text-primary shrink-0" />
                          <span>
                            <strong>Real-time DB Sync:</strong> Any updates to unit prices, quantities, delivery, or discount save to Supabase and immediately update the member&apos;s view!
                          </span>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                            Edit Item Unit Prices & Quantities
                          </Label>

                          {activeEditingOrder.items.map((item, idx) => {
                            const curPrice = editingItemPrices[idx] !== undefined ? editingItemPrices[idx] : item.pricePerPc;
                            const curQty = editingItemQtys[idx] !== undefined ? editingItemQtys[idx] : item.qty;

                            return (
                              <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border space-y-2 text-xs">
                                <p className="font-semibold text-foreground truncate">{item.name}</p>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-[10px] text-muted-foreground block mb-0.5">Unit Price (Rs/pc)</label>
                                    <Input
                                      type="number"
                                      value={curPrice}
                                      onChange={e => setEditingItemPrices(prev => ({ ...prev, [idx]: Number(e.target.value) || 0 }))}
                                      className="h-8 text-xs font-mono bg-background"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground block mb-0.5">Qty (Pcs)</label>
                                    <Input
                                      type="number"
                                      value={curQty}
                                      onChange={e => setEditingItemQtys(prev => ({ ...prev, [idx]: Number(e.target.value) || 0 }))}
                                      className="h-8 text-xs font-mono bg-background"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground block mb-0.5">Item Total (Rs)</label>
                                    <div className="h-8 px-2 flex items-center font-mono font-bold text-foreground bg-muted/50 rounded border border-border">
                                      Rs {(curPrice * curQty).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Payment Screenshot & Proof Preview if available */}
                        {activeEditingOrder.paymentScreenshot && (
                          <div className="p-3 bg-muted/40 rounded-lg border border-border flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <a href={activeEditingOrder.paymentScreenshot} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                <img src={activeEditingOrder.paymentScreenshot} alt="Uploaded Payment Screenshot" className="w-12 h-12 object-cover rounded-lg border border-border hover:scale-105 transition-transform" />
                              </a>
                              <div>
                                <p className="font-bold text-foreground">Attached Payment Proof Screenshot</p>
                                <p className="text-[10px] text-muted-foreground">Click image to open full size</p>
                              </div>
                            </div>
                            {editingPaymentStatus === "pending" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setEditingPaymentStatus("confirmed");
                                  toast.info("Status set to Confirmed. Click 'Save & Sync to DB' to apply!");
                                }}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                              >
                                <Check size={13} /> Verify Payment
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Charges & Payment Status */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border pt-3">
                          <div>
                            <label className="text-xs font-medium block mb-1">Delivery Charges (Rs)</label>
                            <Input
                              type="number"
                              value={editingDelivery !== "" ? editingDelivery : (activeEditingOrder.deliveryCharges ?? 250)}
                              onChange={e => setEditingDelivery(e.target.value === "" ? "" : Number(e.target.value))}
                              className="h-9 text-xs font-mono bg-background"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium block mb-1">Discount / Adjustment (Rs)</label>
                            <Input
                              type="number"
                              value={editingDiscount !== "" ? editingDiscount : (activeEditingOrder.discount ?? 0)}
                              onChange={e => setEditingDiscount(e.target.value === "" ? "" : Number(e.target.value))}
                              className="h-9 text-xs font-mono bg-background"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium block mb-1">Payment Status</label>
                            <select
                              value={editingPaymentStatus}
                              onChange={e => setEditingPaymentStatus(e.target.value as any)}
                              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-bold"
                            >
                              <option value="confirmed">Confirmed / Paid</option>
                              <option value="pending">Pending Confirmation</option>
                              <option value="failed">Failed</option>
                            </select>
                          </div>
                        </div>

                        {/* Summary Total Box */}
                        <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-xs font-mono border border-border">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal:</span>
                            <span>Rs {calculatedSubtotal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Delivery Charges:</span>
                            <span>Rs {currentDeliveryCharges.toLocaleString()}</span>
                          </div>
                          {currentDiscount > 0 && (
                            <div className="flex justify-between text-emerald-600 font-medium">
                              <span>Discount:</span>
                              <span>- Rs {currentDiscount.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-foreground text-sm pt-1 border-t border-border">
                            <span>Updated Grand Total:</span>
                            <span className="text-primary">Rs {calculatedTotal.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Printable Invoice Container */}
                      <div id="invoice-printable" className="bg-white text-black p-6 sm:p-8 rounded-xl border border-gray-300 shadow-md space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-gray-300 pb-5 gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-heading font-extrabold text-2xl tracking-tight text-black">LOCAL BABA</span>
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider">Wholesale</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">B2B Sourcing Platform for Pakistani Sellers</p>
                            <p className="text-xs text-gray-500">Hall Road / Shah Alam Market, Lahore, Pakistan</p>
                          </div>

                          <div className="sm:text-right">
                            <span className="inline-block px-3 py-1 bg-black text-white text-xs font-mono font-bold tracking-widest rounded mb-2">INVOICE</span>
                            <p className="text-sm font-mono font-bold text-gray-900">#{activeEditingOrder.id}</p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              Date: {new Date(activeEditingOrder.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </p>
                            <p className="text-xs text-gray-600">
                              Status: <span className="uppercase font-semibold text-emerald-700">{editingPaymentStatus}</span>
                            </p>
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div>
                            <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-1">Billed To (Member/Seller):</p>
                            <p className="font-bold text-sm text-gray-900">{activeEditingOrder.customerName || `Member #${activeEditingOrder.memberId}`}</p>
                            <p className="text-gray-700 mt-0.5">{activeEditingOrder.deliveryAddress}</p>
                            <p className="text-gray-700 font-semibold">{activeEditingOrder.city}, Pakistan</p>
                          </div>
                          <div>
                            <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-1">Payment & Dispatch Info:</p>
                            <p className="text-gray-800"><span className="font-semibold">Method:</span> <span className="uppercase">{activeEditingOrder.paymentMethod.replace("_", " ")}</span></p>
                            <p className="text-gray-800"><span className="font-semibold">Order Status:</span> <span className="capitalize">{activeEditingOrder.orderStatus}</span></p>
                          </div>
                        </div>

                        {/* Line Items Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="border-b-2 border-gray-300 text-gray-700 bg-gray-100">
                                <th className="py-2.5 px-3 font-bold">#</th>
                                <th className="py-2.5 px-3 font-bold">Item Description</th>
                                <th className="py-2.5 px-3 font-bold text-right">Qty (Pcs)</th>
                                <th className="py-2.5 px-3 font-bold text-right">Unit Rate (Rs)</th>
                                <th className="py-2.5 px-3 font-bold text-right">Total (Rs)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {currentItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="py-2.5 px-3 text-gray-500 font-mono">{idx + 1}</td>
                                  <td className="py-2.5 px-3 font-semibold text-gray-900">{item.name}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-medium">{item.qty}</td>
                                  <td className="py-2.5 px-3 text-right font-mono">Rs {item.pricePerPc.toLocaleString()}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                                    Rs {(item.qty * item.pricePerPc).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Invoice Summary */}
                        <div className="flex flex-col sm:flex-row justify-between items-start pt-3 border-t border-gray-200 gap-4">
                          <div className="text-xs text-gray-500 space-y-1 max-w-xs">
                            <p className="font-bold text-gray-700">Terms & Conditions:</p>
                            <p>1. All prices are verified and updated by Local Baba Admin.</p>
                          </div>

                          <div className="w-full sm:w-64 space-y-2 text-xs text-gray-800">
                            <div className="flex justify-between py-1 border-b border-gray-100">
                              <span className="text-gray-600">Subtotal:</span>
                              <span className="font-mono font-semibold">Rs {calculatedSubtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-100">
                              <span className="text-gray-600">Delivery Charges:</span>
                              <span className="font-mono font-semibold">Rs {currentDeliveryCharges.toLocaleString()}</span>
                            </div>
                            {currentDiscount > 0 && (
                              <div className="flex justify-between py-1 border-b border-gray-100 text-emerald-700 font-medium">
                                <span>Discount / Adjustment:</span>
                                <span className="font-mono">- Rs {currentDiscount.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between py-2 border-t-2 border-gray-900 text-sm font-bold text-gray-900">
                              <span>Grand Total:</span>
                              <span className="font-mono text-base text-primary">Rs {calculatedTotal.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground space-y-3">
                      <Receipt size={40} className="mx-auto text-muted-foreground/50" />
                      <p className="font-heading font-semibold text-lg">No invoice selected</p>
                      <p className="text-xs">Select an invoice from the left panel to view and edit unit prices.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: CREATE NEW AUTO DB INVOICE */}
            {autoSubTab === "create_new" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-4">
                  {/* Select Customer */}
                  <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
                    <h2 className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <User size={14} className="text-primary" /> 1. Select Customer
                    </h2>

                    {newInvoiceUser ? (
                      <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-foreground">{newInvoiceUser.name}</p>
                          <p className="text-[10px] text-muted-foreground">{newInvoiceUser.city} · {newInvoiceUser.phone}</p>
                        </div>
                        <button onClick={() => setNewInvoiceUser(null)} className="text-muted-foreground hover:text-danger p-1">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          placeholder="Search user name or phone..."
                          value={personSearchQuery}
                          onChange={e => setPersonSearchQuery(e.target.value)}
                          className="h-8 text-xs bg-background"
                        />
                        <div className="space-y-1 max-h-36 overflow-y-auto">
                          {filteredUsersList.map(u => (
                            <button
                              key={u.id}
                              onClick={() => {
                                setNewInvoiceUser(u);
                                toast.success(`Selected customer: ${u.name}`);
                              }}
                              className="w-full text-left p-1.5 hover:bg-muted rounded text-xs flex items-center justify-between"
                            >
                              <span className="font-bold">{u.name} ({u.city})</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{u.phone}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Select Products */}
                  <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
                    <h2 className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Package size={14} className="text-primary" /> 2. Add Products
                    </h2>

                    <Input
                      placeholder="Search product name or SKU..."
                      value={productSearchQuery}
                      onChange={e => setProductSearchQuery(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />

                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {filteredProductsList.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setNewInvoiceProducts(prev => [
                              ...prev,
                              { productId: p.id, name: p.name, pricePerPc: p.pricePerPc, qty: p.moq || 1, image: p.images?.[0] || "", sku: p.sku },
                            ]);
                            toast.success(`Added ${p.name}`);
                          }}
                          className="p-2 border border-border hover:border-primary rounded text-xs flex items-center justify-between cursor-pointer"
                        >
                          <span className="font-bold truncate max-w-[200px]">{p.name}</span>
                          <span className="text-primary font-mono font-semibold">+ Add (Rs {p.pricePerPc})</span>
                        </div>
                      ))}
                    </div>

                    {/* Added Items List */}
                    {newInvoiceProducts.length > 0 && (
                      <div className="space-y-2 border-t border-border pt-2">
                        {newInvoiceProducts.map((item, idx) => (
                          <div key={idx} className="p-2 bg-muted/40 rounded flex items-center justify-between text-xs">
                            <span className="truncate max-w-[150px] font-semibold">{item.name}</span>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={item.qty}
                                onChange={e => {
                                  const val = Number(e.target.value);
                                  setNewInvoiceProducts(prev => prev.map((it, i) => (i === idx ? { ...it, qty: val } : it)));
                                }}
                                className="w-14 h-7 text-xs font-mono"
                              />
                              <Input
                                type="number"
                                value={item.pricePerPc}
                                onChange={e => {
                                  const val = Number(e.target.value);
                                  setNewInvoiceProducts(prev => prev.map((it, i) => (i === idx ? { ...it, pricePerPc: val } : it)));
                                }}
                                className="w-20 h-7 text-xs font-mono"
                              />
                              <button onClick={() => setNewInvoiceProducts(prev => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-danger">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="font-heading font-bold text-lg">New Auto Invoice Preview</h2>
                    <Button onClick={() => void handleCreateDbAutoInvoice()} className="gap-2 bg-primary text-primary-foreground font-semibold">
                      <Save size={15} /> Save & Insert Order to DB
                    </Button>
                  </div>

                  <div className="bg-white text-black p-6 rounded-xl border border-gray-300 shadow-md space-y-4 text-xs">
                    <div className="flex justify-between items-start border-b border-gray-300 pb-3">
                      <div>
                        <p className="font-heading font-bold text-xl text-black">LOCAL BABA</p>
                        <p className="text-[10px] text-gray-500">Auto Database Order Invoice</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-gray-900">#LB-NEW</p>
                        <p className="text-[10px] text-gray-500">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Billed To:</p>
                      <p className="font-bold text-gray-900">{newInvoiceUser?.name || "Select customer on left"}</p>
                      <p className="text-gray-600">{newInvoiceUser?.address}, {newInvoiceUser?.city}</p>
                    </div>

                    <table className="w-full text-left border-collapse border-y border-gray-200 py-2">
                      <thead>
                        <tr className="text-gray-600 font-bold bg-gray-50">
                          <th className="py-1 px-2">Item</th>
                          <th className="py-1 px-2 text-right">Qty</th>
                          <th className="py-1 px-2 text-right">Rate</th>
                          <th className="py-1 px-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newInvoiceProducts.map((it, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-1 px-2 font-medium">{it.name}</td>
                            <td className="py-1 px-2 text-right font-mono">{it.qty}</td>
                            <td className="py-1 px-2 text-right font-mono">Rs {it.pricePerPc}</td>
                            <td className="py-1 px-2 text-right font-mono font-bold">Rs {(it.qty * it.pricePerPc).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="space-y-1 text-right font-mono">
                      <p className="text-gray-600">Subtotal: <span className="font-semibold text-gray-900">Rs {createSubtotal.toLocaleString()}</span></p>
                      <p className="text-gray-600">Delivery: <span className="font-semibold text-gray-900">Rs {createDeliveryCharges || 0}</span></p>
                      <p className="text-sm font-bold text-black border-t border-gray-900 pt-1">
                        Grand Total: <span className="text-primary">Rs {createGrandTotal.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE 2: MANUAL INVOICE (COMPLETELY EMPTY DATA ON START)  */}
        {/* ========================================================= */}
        {activeMode === "manual" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Manual Invoice Creator Form */}
            <div className="lg:col-span-7 space-y-5 bg-card border border-border p-5 sm:p-6 rounded-xl shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="font-heading font-bold text-lg flex items-center gap-2">
                  <Plus size={18} className="text-primary" /> Generate Custom Manual Invoice
                </h2>
                <span className="text-xs font-mono text-muted-foreground">ID: {manualForm.invoiceNumber}</span>
              </div>

              <form onSubmit={handleSaveManualInvoice} className="space-y-4 text-xs">
                {/* Customer Details with Autocomplete Dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="font-medium block mb-1 text-foreground">Customer / Seller Name *</label>
                    <Input
                      value={manualForm.customerName}
                      onChange={e => {
                        setManualForm({ ...manualForm, customerName: e.target.value });
                        setShowManualUserDropdown(true);
                      }}
                      onFocus={() => setShowManualUserDropdown(true)}
                      placeholder="Type name or phone to auto-fill..."
                      required
                      className="h-9 bg-background"
                    />

                    {/* Customer Autocomplete Dropdown */}
                    {showManualUserDropdown && matchingManualUsers.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-popover border border-border rounded-xl shadow-xl p-1.5 space-y-1 max-h-48 overflow-y-auto">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-0.5">Click user to auto-fill details:</p>
                        {matchingManualUsers.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setManualForm({
                                ...manualForm,
                                customerName: u.name,
                                customerPhone: u.phone,
                                deliveryAddress: u.address,
                                city: u.city,
                                memberId: u.id,
                              });
                              setShowManualUserDropdown(false);
                              toast.success(`Auto-filled details for ${u.name}!`);
                            }}
                            className="w-full text-left p-2 hover:bg-muted rounded-lg text-xs flex items-center justify-between"
                          >
                            <div>
                              <p className="font-bold text-foreground">{u.name}</p>
                              <p className="text-[10px] text-muted-foreground">{u.address}, {u.city}</p>
                            </div>
                            <span className="text-[10px] font-mono text-primary font-semibold">{u.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="font-medium block mb-1 text-foreground">WhatsApp / Phone</label>
                    <Input
                      value={manualForm.customerPhone}
                      onChange={e => setManualForm({ ...manualForm, customerPhone: e.target.value })}
                      placeholder="e.g. 0300 1234567"
                      className="h-9 bg-background font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium block mb-1 text-foreground">Delivery Address</label>
                    <Input
                      value={manualForm.deliveryAddress}
                      onChange={e => setManualForm({ ...manualForm, deliveryAddress: e.target.value })}
                      placeholder="e.g. Shop 12, Anarkali Market"
                      className="h-9 bg-background"
                    />
                  </div>
                  <div>
                    <label className="font-medium block mb-1 text-foreground">City</label>
                    <Input
                      value={manualForm.city}
                      onChange={e => setManualForm({ ...manualForm, city: e.target.value })}
                      placeholder="e.g. Lahore"
                      className="h-9 bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-medium block mb-1 text-foreground">Payment Method</label>
                    <select
                      value={manualForm.paymentMethod}
                      onChange={e => setManualForm({ ...manualForm, paymentMethod: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs"
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="easypaisa">EasyPaisa / JazzCash</option>
                      <option value="cod">Cash on Delivery</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-medium block mb-1 text-foreground">Payment Status</label>
                    <select
                      value={manualForm.paymentStatus}
                      onChange={e => setManualForm({ ...manualForm, paymentStatus: e.target.value as any })}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-bold"
                    >
                      <option value="confirmed">Confirmed / Paid</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-medium block mb-1 text-foreground">Due Date</label>
                    <Input
                      type="date"
                      value={manualForm.dueDate}
                      onChange={e => setManualForm({ ...manualForm, dueDate: e.target.value })}
                      className="h-9 bg-background font-mono"
                    />
                  </div>
                </div>

                {/* Line Items Editor with Product Autocomplete */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground">Line Items ({manualForm.items.length})</span>
                    <Button type="button" onClick={handleAddManualItem} variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <Plus size={14} /> Add Line Item
                    </Button>
                  </div>

                  {manualForm.items.length > 0 ? (
                    <div className="space-y-2">
                      {manualForm.items.map((item, idx) => {
                        const matchingProds = getMatchingManualProducts(item.description);
                        const isFocused = activeManualProductDropdown === idx;

                        return (
                          <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-muted/30 rounded-lg border border-border relative">
                            <div className="flex-1 relative">
                              <Input
                                placeholder="Type item name or SKU to auto-fill..."
                                value={item.description}
                                onChange={e => {
                                  handleUpdateManualItem(idx, "description", e.target.value);
                                  setActiveManualProductDropdown(idx);
                                }}
                                onFocus={() => setActiveManualProductDropdown(idx)}
                                className="h-8 w-full bg-background"
                              />

                              {/* Product Autocomplete Dropdown */}
                              {isFocused && matchingProds.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-popover border border-border rounded-xl shadow-xl p-1.5 space-y-1 max-h-48 overflow-y-auto">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-0.5">Click product to auto-fill details:</p>
                                  {matchingProds.map(p => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => {
                                        setManualForm(prev => {
                                          const updated = [...prev.items];
                                          const qtyVal = p.moq || 1;
                                          const rateVal = p.pricePerPc;
                                          updated[idx] = {
                                            ...updated[idx],
                                            description: p.name,
                                            rate: rateVal,
                                            qty: qtyVal,
                                            amount: qtyVal * rateVal,
                                            productId: p.id,
                                            image: p.images?.[0],
                                          };
                                          return { ...prev, items: updated };
                                        });
                                        setActiveManualProductDropdown(null);
                                        toast.success(`Auto-filled "${p.name}" (Rs ${p.pricePerPc}/pc)!`);
                                      }}
                                      className="w-full text-left p-2 hover:bg-muted rounded-lg text-xs flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        {p.images?.[0] && (
                                          <img src={p.images[0]} alt={p.name} className="w-7 h-7 object-cover rounded" />
                                        )}
                                        <span className="font-bold text-foreground truncate">{p.name}</span>
                                      </div>
                                      <span className="text-[10px] font-mono text-primary font-bold shrink-0 ml-2">Rs {p.pricePerPc}/pc</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Qty"
                                value={item.qty || ""}
                                onChange={e => handleUpdateManualItem(idx, "qty", e.target.value)}
                                className="h-8 w-16 text-right font-mono bg-background"
                              />
                              <Input
                                type="number"
                                placeholder="Rate (Rs)"
                                value={item.rate || ""}
                                onChange={e => handleUpdateManualItem(idx, "rate", e.target.value)}
                                className="h-8 w-24 text-right font-mono bg-background"
                              />
                              <span className="w-20 text-right font-mono font-bold text-foreground">
                                Rs {((Number(item.qty) || 0) * (Number(item.rate) || 0)).toLocaleString()}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveManualItem(idx)}
                                className="p-1.5 text-muted-foreground hover:text-danger rounded"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center border-2 border-dashed border-border rounded-lg space-y-2 bg-muted/20">
                      <p className="text-muted-foreground text-xs">No line items added yet.</p>
                      <Button type="button" onClick={handleAddManualItem} size="sm" className="gap-1 text-xs bg-primary text-primary-foreground">
                        <Plus size={14} /> Add First Line Item
                      </Button>
                    </div>
                  )}
                </div>

                {/* Additional Charges */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <label className="font-medium block mb-1">Delivery Charges (Rs)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={manualForm.deliveryCharges}
                      onChange={e => setManualForm({ ...manualForm, deliveryCharges: e.target.value === "" ? "" : Number(e.target.value) })}
                      className="h-9 bg-background font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-medium block mb-1">Discount (Rs)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={manualForm.discount}
                      onChange={e => setManualForm({ ...manualForm, discount: e.target.value === "" ? "" : Number(e.target.value) })}
                      className="h-9 bg-background font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-medium block mb-1">Notes / Instructions</label>
                  <Input
                    placeholder="e.g. Terms, delivery notes..."
                    value={manualForm.notes}
                    onChange={e => setManualForm({ ...manualForm, notes: e.target.value })}
                    className="h-9 bg-background text-xs"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-3 flex gap-3">
                  <Button type="submit" className="flex-1 h-10 gap-2 bg-primary text-primary-foreground font-semibold">
                    <Save size={16} /> Generate & Save Invoice
                  </Button>
                </div>
              </form>
            </div>

            {/* Right 5 Cols: Live Manual Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-bold text-lg flex items-center gap-2">
                  <Eye size={18} className="text-primary" /> Live Format Preview
                </h2>
                <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
                  <Printer size={16} /> Print
                </Button>
              </div>

              <div id="manual-invoice-printable" className="bg-white text-black p-6 rounded-xl border border-gray-300 shadow-md space-y-4 text-xs">
                <div className="flex justify-between items-start border-b border-gray-300 pb-3">
                  <div>
                    <p className="font-heading font-bold text-xl text-black">LOCAL BABA</p>
                    <p className="text-[10px] text-gray-500">Custom Manual Billing</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-gray-900">{manualForm.invoiceNumber}</p>
                    <p className="text-[10px] text-gray-500">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Billed To:</p>
                  <p className="font-bold text-gray-900">{manualForm.customerName || "Customer Name"}</p>
                  <p className="text-gray-600">{manualForm.deliveryAddress || "Delivery Address"}, {manualForm.city || "City"}</p>
                  <p className="text-gray-600">{manualForm.customerPhone || "Phone Number"}</p>
                </div>

                <table className="w-full text-left border-collapse border-y border-gray-200 py-2">
                  <thead>
                    <tr className="text-gray-600 font-bold bg-gray-50">
                      <th className="py-1 px-2">Item</th>
                      <th className="py-1 px-2 text-right">Qty</th>
                      <th className="py-1 px-2 text-right">Rate</th>
                      <th className="py-1 px-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualForm.items.length > 0 ? (
                      manualForm.items.map((it, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-1 px-2 font-medium">{it.description || "Item description"}</td>
                          <td className="py-1 px-2 text-right font-mono">{it.qty || 0}</td>
                          <td className="py-1 px-2 text-right font-mono">Rs {it.rate || 0}</td>
                          <td className="py-1 px-2 text-right font-mono font-bold">Rs {((Number(it.qty) || 0) * (Number(it.rate) || 0)).toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-400 italic">No items added to manual invoice</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="space-y-1 text-right font-mono">
                  <p className="text-gray-600">Subtotal: <span className="font-semibold text-gray-900">Rs {manualSubtotal.toLocaleString()}</span></p>
                  <p className="text-gray-600">Delivery: <span className="font-semibold text-gray-900">Rs {manualForm.deliveryCharges || 0}</span></p>
                  {Number(manualForm.discount) > 0 && <p className="text-emerald-700">Discount: -Rs {manualForm.discount}</p>}
                  <p className="text-sm font-bold text-black border-t border-gray-900 pt-1">
                    Grand Total: <span className="text-primary">Rs {manualGrandTotal.toLocaleString()}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE 3: OVERALL INVOICES LIST & DETAILS                   */}
        {/* ========================================================= */}
        {activeMode === "overall" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="font-heading font-bold text-lg">All Invoice Records</h2>
                <div className="text-xs text-muted-foreground">Showing {orders.length + manualInvoices.length} invoices overall</div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold">
                      <th className="p-3">Invoice / Order ID</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Customer / Member</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Items / Pcs</th>
                      <th className="p-3 text-right">Grand Total</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {/* Auto Orders Invoices */}
                    {orders.map(ord => (
                      <tr key={ord.id} className="hover:bg-muted/20">
                        <td className="p-3 font-mono font-bold text-primary">#{ord.id}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold text-[10px]">
                            Auto DB Order
                          </span>
                        </td>
                        <td className="p-3 font-medium text-foreground">{ord.customerName || `Member #${ord.memberId}`} ({ord.city})</td>
                        <td className="p-3 text-muted-foreground">{new Date(ord.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 text-right font-mono">{ord.items.length} items ({ord.items.reduce((s, i) => s + i.qty, 0)} pcs)</td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">Rs {ord.total.toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            ord.paymentStatus === "confirmed" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                          }`}>
                            {ord.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedOrderId(ord.id);
                              setActiveMode("auto");
                              setAutoSubTab("search_edit");
                            }}
                            className="h-7 text-xs text-primary hover:underline gap-1"
                          >
                            <Edit2 size={12} /> Edit / View
                          </Button>
                        </td>
                      </tr>
                    ))}

                    {/* Manual Invoices */}
                    {manualInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-muted/20">
                        <td className="p-3 font-mono font-bold text-purple-600">{inv.invoiceNumber}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 font-semibold text-[10px]">
                            Manual Custom
                          </span>
                        </td>
                        <td className="p-3 font-medium text-foreground">{inv.customerName} ({inv.city})</td>
                        <td className="p-3 text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 text-right font-mono">{inv.items.length} lines ({inv.items.reduce((s, i) => s + i.qty, 0)} pcs)</td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">Rs {inv.total.toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            inv.paymentStatus === "confirmed" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                          }`}>
                            {inv.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteManualInvoice(inv.id)}
                            className="h-7 text-xs text-danger hover:bg-danger/10"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
