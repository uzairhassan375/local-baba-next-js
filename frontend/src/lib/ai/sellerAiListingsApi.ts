export interface SavedAiListing {
  id: string;
  originalProductId?: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  keyFeatures: string[];
  specs: { label: string; value: string }[];
  pricePerPc: number;
  stock: number;
  moq: number;
  selectedImages: string[];
  savedAt: string;
  postedToShopify?: boolean;
  shopifyProductId?: string;
  shopifyPostedAt?: string;
}

const STORAGE_KEY = "localbaba_seller_ai_listings";

export function getSellerAiListings(): SavedAiListing[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read seller AI listings", err);
    return [];
  }
}

export function saveSellerAiListing(listing: Omit<SavedAiListing, "id" | "savedAt">): SavedAiListing {
  const current = getSellerAiListings();
  const newItem: SavedAiListing = {
    ...listing,
    id: "ai_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    savedAt: new Date().toISOString(),
    postedToShopify: false,
  };
  const updated = [newItem, ...current];
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return newItem;
}

export function updateSellerAiListing(id: string, patch: Partial<SavedAiListing>): void {
  const current = getSellerAiListings();
  const updated = current.map(item => (item.id === id ? { ...item, ...patch } : item));
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
}

export function deleteSellerAiListing(id: string): void {
  const current = getSellerAiListings();
  const updated = current.filter(item => item.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
}
