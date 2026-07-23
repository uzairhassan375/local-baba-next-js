import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/data/mockData";

/** Map a DB row from member_orders to the frontend Order interface */
export function mapRowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    customerName: (row.customer_name as string) ?? undefined,
    items: (row.items as Order["items"]) || [],
    total: Number(row.total) || 0,
    deliveryCharges: Number(row.delivery_charges) || 250,
    discount: Number(row.discount) || 0,
    paymentMethod: (row.payment_method as Order["paymentMethod"]) || "bank_transfer",
    paymentStatus: (row.payment_status as Order["paymentStatus"]) || "pending",
    orderStatus: (row.order_status as Order["orderStatus"]) || "processing",
    courier: (row.courier as string) ?? undefined,
    trackingNumber: (row.tracking_number as string) ?? undefined,
    deliveryAddress: (row.delivery_address as string) || "",
    city: (row.city as string) || "",
    notes: (row.notes as string) ?? undefined,
    paymentScreenshot: (row.payment_screenshot as string) ?? undefined,
    transactionRef: (row.transaction_ref as string) ?? undefined,
    timeline: (row.timeline as Order["timeline"]) || [],
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

function isTableMissingError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = error.message?.toLowerCase() || "";
  return msg.includes("schema cache") || msg.includes("does not exist") || error.code === "PGRST204" || error.code === "42P01";
}

/** Insert a new order into member_orders table in Supabase */
export async function insertMemberOrder(order: Order): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("member_orders").insert({
    id: order.id,
    member_id: order.memberId,
    customer_name: order.customerName ?? null,
    items: order.items,
    total: order.total,
    delivery_charges: order.deliveryCharges ?? 250,
    discount: order.discount ?? 0,
    payment_method: order.paymentMethod,
    payment_status: order.paymentStatus,
    order_status: order.orderStatus,
    courier: order.courier ?? null,
    tracking_number: order.trackingNumber ?? null,
    delivery_address: order.deliveryAddress,
    city: order.city,
    notes: order.notes ?? null,
    payment_screenshot: order.paymentScreenshot ?? null,
    transaction_ref: order.transactionRef ?? null,
    timeline: order.timeline,
  });
  if (error) {
    if (isTableMissingError(error)) {
      console.warn("Supabase table 'member_orders' does not exist yet. Please run the SQL migration in Supabase SQL Editor.");
      return;
    }
    console.error("Failed to insert member_order to Supabase:", error.message);
    throw error;
  }
}

/** Update an existing order in Supabase (admin price sync, status, etc.) */
export async function updateMemberOrder(
  id: string,
  patch: Partial<{
    items: Order["items"];
    total: number;
    delivery_charges: number;
    discount: number;
    payment_status: Order["paymentStatus"];
    order_status: Order["orderStatus"];
    payment_method: Order["paymentMethod"];
    courier: string;
    tracking_number: string;
    notes: string;
    payment_screenshot: string;
    transaction_ref: string;
    timeline: Order["timeline"];
  }>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("member_orders").update(patch).eq("id", id);
  if (error) {
    if (isTableMissingError(error)) {
      console.warn("Supabase table 'member_orders' does not exist yet. Please run the SQL migration in Supabase SQL Editor.");
      return;
    }
    console.error("Failed to update member_order in Supabase:", error.message);
    throw error;
  }
}

/** Fetch all member_orders for admin (all members) */
export async function fetchAllMemberOrders(): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("member_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    if (isTableMissingError(error)) {
      console.warn("Supabase table 'member_orders' not found. Run the provided SQL migration in Supabase SQL Editor.");
      return [];
    }
    console.error("Failed to fetch member_orders:", error.message);
    return [];
  }
  return (data || []).map(mapRowToOrder);
}

/** Fetch orders for a specific member (by member_id) */
export async function fetchMemberOrdersById(memberId: string): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("member_orders")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });
  if (error) {
    if (isTableMissingError(error)) return [];
    console.error("Failed to fetch member orders by id:", error.message);
    return [];
  }
  return (data || []).map(mapRowToOrder);
}

/** Fetch orders that contain a specific productId inside the items JSON array */
export async function fetchOrdersByProductId(productId: string): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("member_orders")
    .select("*")
    .contains("items", [{ productId }])
    .order("created_at", { ascending: false });
  if (error) {
    if (isTableMissingError(error)) return [];
    console.error("Failed to fetch orders by productId:", error.message);
    return [];
  }
  return (data || []).map(mapRowToOrder);
}
