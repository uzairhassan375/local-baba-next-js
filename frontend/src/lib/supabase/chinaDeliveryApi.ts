import { createClient } from "@/lib/supabase/client";

export interface ChinaDeliveryPrice {
  id: string;
  category: string;
  deliveryPrice: number;
}

type Row = {
  id: string;
  category: string;
  delivery_price: number | string;
};

function mapRow(row: Row): ChinaDeliveryPrice {
  return {
    id: row.id,
    category: row.category,
    deliveryPrice: Number(row.delivery_price),
  };
}

export async function fetchChinaDeliveryPrices(): Promise<ChinaDeliveryPrice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("china_delivery_prices")
    .select("*")
    .order("category", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(mapRow);
}

export async function upsertChinaDeliveryPrice(category: string, deliveryPrice: number): Promise<ChinaDeliveryPrice> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("china_delivery_prices")
    .upsert({ category, delivery_price: deliveryPrice }, { onConflict: "category" })
    .select("*")
    .single();
  if (error) throw error;
  return mapRow(data as Row);
}

export async function deleteChinaDeliveryPrice(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("china_delivery_prices").delete().eq("id", id);
  if (error) throw error;
}

export function deliveryPriceForCategory(
  prices: ChinaDeliveryPrice[],
  category: string,
): number | null {
  const match = prices.find(p => p.category.toLowerCase() === category.toLowerCase());
  return match ? match.deliveryPrice : null;
}
