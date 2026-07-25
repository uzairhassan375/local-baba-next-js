import crypto from "crypto";

export interface ShopifyCredentials {
  shopDomain: string;
  accessToken: string;
  apiSecretKey?: string;
}

export interface ShopifyShopInfo {
  id: number;
  name: string;
  email: string;
  domain: string;
  currency: string;
  country_name: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  created_at?: string;
  images?: Array<{ src: string }>;
  variants?: Array<{ price: string; inventory_quantity: number }>;
}

export class ShopifyService {
  private cleanDomain(domain: string): string {
    let clean = domain.trim().toLowerCase();
    clean = clean.replace(/^https?:\/\//, "");
    clean = clean.replace(/\/.*$/, "");
    if (!clean.includes(".myshopify.com") && !clean.includes(".")) {
      clean = `${clean}.myshopify.com`;
    }
    return clean;
  }

  async verifyCredentials(credentials: ShopifyCredentials): Promise<{ success: boolean; shop?: ShopifyShopInfo; error?: string }> {
    const shopDomain = this.cleanDomain(credentials.shopDomain);
    const url = `https://${shopDomain}/admin/api/2024-01/shop.json`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": credentials.accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: "Invalid Access Token or unauthorized access." };
        }
        if (response.status === 404) {
          return { success: false, error: "Shop domain not found. Check your .myshopify.com URL." };
        }
        return { success: false, error: `Shopify API returned status ${response.status}` };
      }

      const data = await response.json() as { shop: ShopifyShopInfo };
      return {
        success: true,
        shop: data.shop,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to reach Shopify server. Please check network connection and domain.",
      };
    }
  }

  async fetchProducts(credentials: ShopifyCredentials, limit = 50): Promise<{ success: boolean; products?: ShopifyProduct[]; count?: number; error?: string }> {
    const shopDomain = this.cleanDomain(credentials.shopDomain);
    const url = `https://${shopDomain}/admin/api/2024-01/products.json?limit=${limit}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": credentials.accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, error: `Shopify returned error ${response.status}` };
      }

      const data = await response.json() as { products: ShopifyProduct[] };
      return {
        success: true,
        products: data.products || [],
        count: (data.products || []).length,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to fetch products from Shopify.",
      };
    }
  }

  async createProduct(
    credentials: ShopifyCredentials,
    productData: {
      title: string;
      body_html: string;
      vendor?: string;
      product_type?: string;
      tags?: string;
      price?: string;
      inventory_quantity?: number;
      images?: Array<{ src: string }>;
    }
  ): Promise<{ success: boolean; product?: ShopifyProduct; error?: string }> {
    const shopDomain = this.cleanDomain(credentials.shopDomain);
    const url = `https://${shopDomain}/admin/api/2024-01/products.json`;

    const payload = {
      product: {
        title: productData.title,
        body_html: productData.body_html,
        vendor: productData.vendor || "Local Baba Seller",
        product_type: productData.product_type || "General",
        tags: productData.tags || "",
        variants: [
          {
            price: productData.price || "0.00",
            inventory_quantity: productData.inventory_quantity ?? 100,
          },
        ],
        images: productData.images || [],
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": credentials.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            error:
              "Invalid Admin API Access Token. Please go to Integrations and re-enter a valid token from your Shopify Admin (Develop Apps -> API Credentials).",
          };
        }
        if (response.status === 403) {
          return {
            success: false,
            error:
              "Access denied. Your token does not have 'write_products' scope. Go to Shopify Admin -> Develop Apps -> Edit Scopes and enable write_products.",
          };
        }
        const errorText = await response.text();
        return { success: false, error: `Shopify returned error ${response.status}: ${errorText}` };
      }

      const data = (await response.json()) as { product: ShopifyProduct };
      return {
        success: true,
        product: data.product,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to create product on Shopify.",
      };
    }
  }

  verifyHmac(rawBody: string, hmacHeader: string, secretKey: string): boolean {
    if (!hmacHeader || !secretKey) return false;
    const generatedHmac = crypto
      .createHmac("sha256", secretKey)
      .update(rawBody, "utf8")
      .digest("base64");
    return crypto.timingSafeEqual(Buffer.from(generatedHmac), Buffer.from(hmacHeader));
  }
}

export const shopifyService = new ShopifyService();

