"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { type Order } from "@/data/mockData";
import { createOrder as apiCreateOrder, updateOrder as apiUpdateOrder, fetchOrders } from "@/lib/api/ordersApi";

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

  // Load from the backend first, fallback to localStorage/mock
  useEffect(() => {
    async function loadOrders() {
      setIsLoadingOrders(true);
      try {
        // Try to get from the backend
        const dbOrders = await fetchOrders();
        if (dbOrders.length > 0) {
          setOrders(dbOrders);
        } else {
          // Fallback: try localStorage
          try {
            const saved = localStorage.getItem("localbaba_member_orders");
            setOrders(saved ? JSON.parse(saved) : []);
          } catch {
            setOrders([]);
          }
        }
      } catch (err) {
        console.warn("Backend order fetch failed, using local fallback:", err);
        try {
          const saved = localStorage.getItem("localbaba_member_orders");
          setOrders(saved ? JSON.parse(saved) : []);
        } catch {
          setOrders([]);
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

  /** Refresh orders from the backend (callable from admin) */
  const refreshOrdersFromDb = async () => {
    setIsLoadingOrders(true);
    try {
      const dbOrders = await fetchOrders();
      if (dbOrders.length > 0) {
        setOrders(dbOrders);
      }
    } catch (err) {
      console.error("Failed to refresh orders from backend:", err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const addOrder = async (input: AddOrderInput): Promise<Order> => {
    // Created server-side (id, default timeline, notification) so the
    // order-lifecycle notifications actually fire — see backend/app/api/orders/routes.py.
    const res = await apiCreateOrder({
      customerName: input.customerName,
      items: input.items,
      total: input.total,
      deliveryCharges: input.deliveryCharges,
      discount: input.discount,
      paymentMethod: input.paymentMethod,
      deliveryAddress: input.deliveryAddress,
      city: input.city,
      notes: input.notes,
      paymentScreenshot: input.paymentScreenshot,
      transactionRef: input.transactionRef,
    });

    if (!res.success || !res.order) {
      throw new Error(res.error || "Could not place order.");
    }

    setOrders(prev => [res.order!, ...prev]);
    return res.order;
  };

  const updateOrder = async (id: string, updatedData: Partial<Order>): Promise<void> => {
    // Update local state immediately
    setOrders(prev =>
      prev.map(o => (o.id === id ? { ...o, ...updatedData } : o))
    );

    // Build the backend patch object (snake_case, matching /api/orders PATCH)
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
      const res = await apiUpdateOrder(id, patch);
      if (!res.success) {
        console.warn("Order update failed:", res.error);
        throw new Error(res.error || "Could not update order.");
      }
      if (res.order) {
        setOrders(prev => prev.map(o => (o.id === id ? res.order! : o)));
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
