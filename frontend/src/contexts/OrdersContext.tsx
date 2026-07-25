"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { orders as initialMockOrders, type Order } from "@/data/mockData";
import { insertMemberOrder, updateMemberOrder, fetchAllMemberOrders } from "@/lib/supabase/memberOrdersApi";

export interface ManualInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress: string;
  city: string;
  items: { description: string; qty: number; rate: number; amount: number }[];
  subtotal: number;
  deliveryCharges: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: "pending" | "confirmed" | "failed";
  createdAt: string;
  dueDate?: string;
  notes?: string;
}

interface AddOrderInput {
  customerName?: string;
  items: Array<{
    productId: string;
    name: string;
    qty: number;
    pricePerPc: number;
    image: string;
  }>;
  total: number;
  deliveryCharges?: number;
  discount?: number;
  paymentMethod: string;
  paymentStatus?: "pending" | "confirmed" | "failed";
  deliveryAddress: string;
  city: string;
  notes?: string;
  paymentScreenshot?: string;
  transactionRef?: string;
  memberId?: string;
}

interface OrdersContextType {
  orders: Order[];
  manualInvoices: ManualInvoice[];
  isLoadingOrders: boolean;
  addOrder: (input: AddOrderInput) => Promise<Order>;
  updateOrder: (id: string, updatedData: Partial<Order>) => Promise<void>;
  getOrderById: (id: string) => Order | undefined;
  addManualInvoice: (invoice: Omit<ManualInvoice, "id" | "createdAt">) => ManualInvoice;
  deleteManualInvoice: (id: string) => void;
  refreshOrdersFromDb: () => Promise<void>;
}

const MANUAL_INVOICES_KEY = "localbaba_manual_invoices";

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [manualInvoices, setManualInvoices] = useState<ManualInvoice[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  // Load from Supabase first, fallback to localStorage/mock
  useEffect(() => {
    async function loadOrders() {
      setIsLoadingOrders(true);
      try {
        // Try to get from Supabase
        const dbOrders = await fetchAllMemberOrders();
        if (dbOrders.length > 0) {
          setOrders(dbOrders);
        } else {
          // Fallback: try localStorage, then mock data
          try {
            const saved = localStorage.getItem("localbaba_member_orders");
            if (saved) {
              setOrders(JSON.parse(saved));
            } else {
              setOrders(initialMockOrders);
            }
          } catch {
            setOrders(initialMockOrders);
          }
        }
      } catch (err) {
        console.warn("Supabase order fetch failed, using local fallback:", err);
        try {
          const saved = localStorage.getItem("localbaba_member_orders");
          if (saved) {
            setOrders(JSON.parse(saved));
          } else {
            setOrders(initialMockOrders);
          }
        } catch {
          setOrders(initialMockOrders);
        }
      } finally {
        setIsLoadingOrders(false);
        setIsLoaded(true);
      }
    }

    loadOrders();
  }, []);

  // Load manual invoices from localStorage
  useEffect(() => {
    try {
      const savedManual = localStorage.getItem(MANUAL_INVOICES_KEY);
      if (savedManual) {
        setManualInvoices(JSON.parse(savedManual));
      }
    } catch (e) {
      console.error("Failed to load manual invoices", e);
    }
  }, []);

  // Persist manual invoices to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(MANUAL_INVOICES_KEY, JSON.stringify(manualInvoices));
    } catch (e) {
      console.error("Failed to save manual invoices", e);
    }
  }, [manualInvoices, isLoaded]);

  /** Refresh orders from Supabase DB (callable from admin) */
  const refreshOrdersFromDb = async () => {
    setIsLoadingOrders(true);
    try {
      const dbOrders = await fetchAllMemberOrders();
      if (dbOrders.length > 0) {
        setOrders(dbOrders);
      }
    } catch (err) {
      console.error("Failed to refresh orders from DB:", err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const addOrder = async (input: AddOrderInput): Promise<Order> => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const orderId = `LB-${randomNum}`;
    const now = new Date();

    const formattedTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const formattedDate = now.toLocaleDateString([], { day: "2-digit", month: "short" });

    const newOrder: Order = {
      id: orderId,
      memberId: input.memberId || "m1",
      customerName: input.customerName,
      items: input.items,
      total: input.total,
      deliveryCharges: input.deliveryCharges ?? 250,
      discount: input.discount ?? 0,
      paymentMethod: input.paymentMethod as any,
      paymentStatus: input.paymentStatus || "pending",
      orderStatus: "processing",
      createdAt: now.toISOString(),
      deliveryAddress: input.deliveryAddress,
      city: input.city,
      notes: input.notes,
      paymentScreenshot: input.paymentScreenshot,
      transactionRef: input.transactionRef,
      timeline: [
        { step: "Order placed", timestamp: `${formattedDate}, ${formattedTime}`, status: "completed" },
        { step: "Payment confirmation", timestamp: "within 2 hours of transfer", status: "active" },
        { step: "Packed", status: "pending" },
        { step: "Dispatched", status: "pending" },
        { step: "Out for delivery", status: "pending" },
        { step: "Delivered", status: "pending" },
      ],
    };

    // Update local state immediately
    setOrders(prev => [newOrder, ...prev]);

    // Persist to Supabase in background (don't block UI)
    try {
      await insertMemberOrder(newOrder);
    } catch (err) {
      console.warn("Supabase order insert failed (saved locally):", err);
      // Still save to localStorage as fallback
      try {
        const saved = localStorage.getItem("localbaba_member_orders");
        const existing: Order[] = saved ? JSON.parse(saved) : [];
        localStorage.setItem("localbaba_member_orders", JSON.stringify([newOrder, ...existing]));
      } catch {}
    }

    return newOrder;
  };

  const updateOrder = async (id: string, updatedData: Partial<Order>): Promise<void> => {
    // Update local state immediately
    setOrders(prev =>
      prev.map(o => (o.id === id ? { ...o, ...updatedData } : o))
    );

    // Build Supabase patch object (snake_case)
    const patch: Record<string, unknown> = {};
    if (updatedData.items !== undefined) patch.items = updatedData.items;
    if (updatedData.total !== undefined) patch.total = updatedData.total;
    if (updatedData.deliveryCharges !== undefined) patch.delivery_charges = updatedData.deliveryCharges;
    if (updatedData.discount !== undefined) patch.discount = updatedData.discount;
    if (updatedData.paymentStatus !== undefined) patch.payment_status = updatedData.paymentStatus;
    if (updatedData.orderStatus !== undefined) patch.order_status = updatedData.orderStatus;
    if (updatedData.paymentMethod !== undefined) patch.payment_method = updatedData.paymentMethod;
    if (updatedData.courier !== undefined) patch.courier = updatedData.courier;
    if (updatedData.trackingNumber !== undefined) patch.tracking_number = updatedData.trackingNumber;
    if (updatedData.notes !== undefined) patch.notes = updatedData.notes;
    if (updatedData.timeline !== undefined) patch.timeline = updatedData.timeline;

    if (Object.keys(patch).length > 0) {
      try {
        await updateMemberOrder(id, patch as any);
      } catch (err) {
        console.warn("Supabase order update failed:", err);
      }
    }
  };

  const getOrderById = (id: string): Order | undefined => {
    return orders.find(o => o.id === id);
  };

  const addManualInvoice = (input: Omit<ManualInvoice, "id" | "createdAt">): ManualInvoice => {
    const newInv: ManualInvoice = {
      ...input,
      id: `INV-M-${Math.floor(10000 + Math.random() * 90000)}`,
      createdAt: new Date().toISOString(),
    };
    setManualInvoices(prev => [newInv, ...prev]);
    return newInv;
  };

  const deleteManualInvoice = (id: string) => {
    setManualInvoices(prev => prev.filter(inv => inv.id !== id));
  };

  return (
    <OrdersContext.Provider
      value={{
        orders,
        manualInvoices,
        isLoadingOrders,
        addOrder,
        updateOrder,
        getOrderById,
        addManualInvoice,
        deleteManualInvoice,
        refreshOrdersFromDb,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error("useOrders must be used within an OrdersProvider");
  }
  return context;
}
