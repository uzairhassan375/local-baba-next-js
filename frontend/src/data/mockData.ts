export interface Product {
  id: string;
  /** Stable catalogue identifier (unique). */
  sku: string;
  slug: string;
  name: string;
  category: string;
  pricePerPc: number;
  marketRate: number;
  moq: number;
  stock: number;
  status: "active" | "draft" | "sold_out";
  tags: ("new" | "hot" | "featured" | "low_stock")[];
  variants: { type: string; options: string[]; stock?: Record<string, number> }[];
  images: string[];
  description: string;
  specs: { label: string; value: string }[];
  sellerTips: string[];
  /** Set when loaded from Supabase admin catalogue */
  showInTrending?: boolean;
  trendingSort?: number;
  /** standard = local catalog, china = China import catalog */
  catalogType?: "standard" | "china";
  /** Shown on public landing page (admin-curated) */
  showOnLanding?: boolean;
  landingSort?: number;
  /** Shown in its category's curated home-page collection row (mobile app) */
  showInCategoryHome?: boolean;
}

export interface Order {
  id: string;
  memberId: string;
  items: { productId: string; name: string; qty: number; pricePerPc: number; image: string }[];
  total: number;
  paymentMethod: "bank_transfer" | "easypaisa" | "cod" | "card";
  paymentStatus: "pending" | "confirmed" | "failed";
  orderStatus: "processing" | "dispatched" | "delivered" | "cancelled";
  courier?: string;
  trackingNumber?: string;
  deliveryCharges?: number;
  discount?: number;
  customerName?: string;
  notes?: string;
  paymentScreenshot?: string;
  transactionRef?: string;
  createdAt: string;
  deliveryAddress: string;
  city: string;
  timeline: { step: string; timestamp?: string; status: "completed" | "active" | "pending" }[];
}

export interface Member {
  id: string;
  name: string;
  city: string;
  whatsapp: string;
  joinedDate: string;
  totalOrders: number;
  totalSpent: number;
  savedVsMarket: number;
  status: "active" | "suspended";
  avatar?: string;
  /** Set when the member registered with email (Supabase Auth). */
  email?: string;
}

export interface Application {
  id: string;
  name: string;
  whatsapp: string;
  city: string;
  businessName: string;
  sellsWhat: string[];
  sellsWhere: string[];
  monthlyVolume: string;
  heardFrom: string;
  appliedAt: string;
  status: "pending" | "approved" | "rejected";
  /** Set when the member registered with email (Supabase Auth). */
  email?: string;
}

export const categories = [
  "All",
  "New this week",
  "Trending",
  "Fashion",
  "Electronics",
  "Home",
  "Beauty",
  "Kids",
];

export const cities = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Faisalabad",
  "Rawalpindi",
  "Multan",
  "Peshawar",
  "Quetta",
  "Other",
];

export const orders: Order[] = [];

export const currentMember: Member = {
  id: "m1",
  name: "Ahmad Khan",
  city: "Lahore",
  whatsapp: "3001234567",
  joinedDate: "April 2025",
  totalOrders: 14,
  totalSpent: 245000,
  savedVsMarket: 49800,
  status: "active",
};

export const applications: Application[] = [
  { id: "a1", name: "Hira Shahid", whatsapp: "3211234567", city: "Karachi", businessName: "Hira Collections", sellsWhat: ["Fashion & clothing", "Beauty & personal care"], sellsWhere: ["Instagram / TikTok", "WhatsApp customers"], monthlyVolume: "Rs 20,000 – 1,00,000", heardFrom: "Instagram", appliedAt: "2026-04-12T10:30:00", status: "pending" },
  { id: "a2", name: "Bilal Ahmed", whatsapp: "3331234567", city: "Lahore", businessName: "Bilal Electronics", sellsWhat: ["Electronics accessories"], sellsWhere: ["Daraz", "Facebook Marketplace"], monthlyVolume: "Rs 1,00,000 – 5,00,000", heardFrom: "Friend or colleague", appliedAt: "2026-04-12T09:15:00", status: "pending" },
  { id: "a3", name: "Sana Malik", whatsapp: "3451234567", city: "Islamabad", businessName: "Style Hub PK", sellsWhat: ["Fashion & clothing", "Kids & toys"], sellsWhere: ["Instagram / TikTok", "Daraz"], monthlyVolume: "Rs 20,000 – 1,00,000", heardFrom: "TikTok", appliedAt: "2026-04-11T16:45:00", status: "pending" },
  { id: "a4", name: "Farhan Ali", whatsapp: "3121234567", city: "Faisalabad", businessName: "Ali General Store", sellsWhat: ["Home & kitchen"], sellsWhere: ["Physical retail shop"], monthlyVolume: "Under Rs 20,000", heardFrom: "WhatsApp forward", appliedAt: "2026-04-11T14:20:00", status: "pending" },
  { id: "a5", name: "Zainab Raza", whatsapp: "3001239876", city: "Lahore", businessName: "Z Beauty Bar", sellsWhat: ["Beauty & personal care"], sellsWhere: ["Instagram / TikTok", "WhatsApp customers"], monthlyVolume: "Rs 20,000 – 1,00,000", heardFrom: "Instagram", appliedAt: "2026-04-11T11:00:00", status: "pending" },
  { id: "a6", name: "Omar Sheikh", whatsapp: "3331112222", city: "Rawalpindi", businessName: "Tech Corner RWP", sellsWhat: ["Electronics accessories"], sellsWhere: ["Physical retail shop", "Facebook Marketplace"], monthlyVolume: "Rs 1,00,000 – 5,00,000", heardFrom: "Google search", appliedAt: "2026-04-10T18:30:00", status: "pending" },
  { id: "a7", name: "Amna Khalid", whatsapp: "3009998888", city: "Multan", businessName: "Amna Fashion House", sellsWhat: ["Fashion & clothing"], sellsWhere: ["Instagram / TikTok"], monthlyVolume: "Under Rs 20,000", heardFrom: "TikTok", appliedAt: "2026-04-10T09:00:00", status: "pending" },
  { id: "a8", name: "Rashid Mehmood", whatsapp: "3451119999", city: "Peshawar", businessName: "Rashid Traders", sellsWhat: ["Home & kitchen", "Kids & toys"], sellsWhere: ["Physical retail shop", "WhatsApp customers"], monthlyVolume: "Rs 5,00,000+", heardFrom: "Friend or colleague", appliedAt: "2026-04-09T15:00:00", status: "pending" },
];

export const members: Member[] = [
  currentMember,
  { id: "m2", name: "Ayesha Rizwan", city: "Lahore", whatsapp: "3009876543", joinedDate: "March 2025", totalOrders: 22, totalSpent: 380000, savedVsMarket: 68000, status: "active" },
  { id: "m3", name: "Usman Khan", city: "Karachi", whatsapp: "3211112233", joinedDate: "February 2025", totalOrders: 35, totalSpent: 520000, savedVsMarket: 95000, status: "active" },
  { id: "m4", name: "Fatima Malik", city: "Islamabad", whatsapp: "3331234568", joinedDate: "January 2025", totalOrders: 18, totalSpent: 290000, savedVsMarket: 52000, status: "active" },
  { id: "m5", name: "Hassan Ali", city: "Faisalabad", whatsapp: "3451234568", joinedDate: "December 2024", totalOrders: 8, totalSpent: 120000, savedVsMarket: 22000, status: "suspended" },
];
