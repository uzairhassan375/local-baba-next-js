"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Order } from "@/data/mockData";

interface AddOrderInput {
  items: Array<{
    productId: string;
    name: string;
    qty: number;
    pricePerPc: number;
    image: string;
  }>;
  total: number;
  paymentMethod: string;
  deliveryAddress: string;
  city: string;
  notes?: string;
}

interface OrdersContextType {
  orders: Order[];
  addOrder: (input: AddOrderInput) => Order;
  getOrderById: (id: string) => Order | undefined;
}

const STORAGE_KEY = "localbaba_member_orders";

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setOrders(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load saved orders", e);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error("Failed to save orders", e);
    }
  }, [orders, isLoaded]);

  const addOrder = (input: AddOrderInput): Order => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const orderId = `LB-${randomNum}`;
    const now = new Date();

    const formattedTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const formattedDate = now.toLocaleDateString([], { day: "2-digit", month: "short" });

    const newOrder: Order = {
      id: orderId,
      memberId: "m1",
      items: input.items,
      total: input.total,
      paymentMethod: input.paymentMethod as any,
      paymentStatus: input.paymentMethod === "cod" ? "pending" : "pending",
      orderStatus: "processing",
      createdAt: now.toISOString(),
      deliveryAddress: input.deliveryAddress,
      city: input.city,
      timeline: [
        { step: "Order placed", timestamp: `${formattedDate}, ${formattedTime}`, status: "completed" },
        { step: "Payment confirmation", timestamp: "within 2 hours of transfer", status: "active" },
        { step: "Packed", status: "pending" },
        { step: "Dispatched", status: "pending" },
        { step: "Out for delivery", status: "pending" },
        { step: "Delivered", status: "pending" },
      ],
    };

    setOrders(prev => [newOrder, ...prev]);
    return newOrder;
  };

  const getOrderById = (id: string): Order | undefined => {
    return orders.find(o => o.id === id);
  };

  return (
    <OrdersContext.Provider value={{ orders, addOrder, getOrderById }}>
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
