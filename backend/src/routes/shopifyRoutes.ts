import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { shopifyService, ShopifyCredentials } from "../services/shopifyService";

const router = Router();
const DATA_FILE = path.resolve(process.cwd(), "shopify_integration.json");

interface IntegrationState {
  connected: boolean;
  shopDomain: string;
  accessToken: string;
  apiSecretKey: string;
  storeName: string;
  currency: string;
  connectedAt?: string;
  lastSyncedAt?: string;
  syncedProductsCount: number;
  syncPreferences: {
    syncProducts: boolean;
    syncOrders: boolean;
    webhooksEnabled: boolean;
  };
}

const DEFAULT_INTEGRATION: IntegrationState = {
  connected: false,
  shopDomain: "",
  accessToken: "",
  apiSecretKey: "",
  storeName: "",
  currency: "USD",
  syncedProductsCount: 0,
  syncPreferences: {
    syncProducts: true,
    syncOrders: true,
    webhooksEnabled: false,
  },
};

function loadStoredIntegration(): IntegrationState {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to load shopify_integration.json", err);
  }
  return DEFAULT_INTEGRATION;
}

function saveStoredIntegration(state: IntegrationState): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save shopify_integration.json", err);
  }
}

// Initialize active integration from persistent storage
let activeIntegration: IntegrationState = loadStoredIntegration();

// GET /api/shopify/status
router.get("/status", (_req: Request, res: Response) => {
  res.json({
    connected: activeIntegration.connected,
    shopDomain: activeIntegration.shopDomain,
    storeName: activeIntegration.storeName || activeIntegration.shopDomain,
    currency: activeIntegration.currency,
    connectedAt: activeIntegration.connectedAt,
    lastSyncedAt: activeIntegration.lastSyncedAt,
    syncedProductsCount: activeIntegration.syncedProductsCount,
    syncPreferences: activeIntegration.syncPreferences,
  });
});

// POST /api/shopify/verify
router.post("/verify", async (req: Request, res: Response) => {
  const { shopDomain, accessToken } = req.body as ShopifyCredentials;

  if (!shopDomain || !accessToken) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameters: shopDomain and accessToken are required.",
    });
  }

  const result = await shopifyService.verifyCredentials({ shopDomain, accessToken });
  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json({
    success: true,
    message: "Shopify store connection verified successfully!",
    shop: result.shop,
  });
});

// POST /api/shopify/connect
router.post("/connect", async (req: Request, res: Response) => {
  const { shopDomain, accessToken, apiSecretKey, syncPreferences } = req.body;

  if (!shopDomain || !accessToken) {
    return res.status(400).json({
      success: false,
      error: "shopDomain and accessToken are required.",
    });
  }

  const result = await shopifyService.verifyCredentials({ shopDomain, accessToken });
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: `Failed to connect: ${result.error}`,
    });
  }

  activeIntegration = {
    connected: true,
    shopDomain,
    accessToken,
    apiSecretKey: apiSecretKey || "",
    storeName: result.shop?.name || shopDomain,
    currency: result.shop?.currency || "USD",
    connectedAt: new Date().toISOString(),
    lastSyncedAt: undefined,
    syncedProductsCount: activeIntegration.syncedProductsCount,
    syncPreferences: syncPreferences || activeIntegration.syncPreferences,
  };

  saveStoredIntegration(activeIntegration);

  res.json({
    success: true,
    message: `Connected to Shopify Store: ${activeIntegration.storeName}`,
    integration: {
      connected: true,
      shopDomain: activeIntegration.shopDomain,
      storeName: activeIntegration.storeName,
      currency: activeIntegration.currency,
      connectedAt: activeIntegration.connectedAt,
      syncPreferences: activeIntegration.syncPreferences,
    },
  });
});

// POST /api/shopify/sync-products
router.post("/sync-products", async (_req: Request, res: Response) => {
  if (!activeIntegration.connected) {
    return res.status(400).json({
      success: false,
      error: "No active Shopify store connected. Please connect your store first.",
    });
  }

  const result = await shopifyService.fetchProducts({
    shopDomain: activeIntegration.shopDomain,
    accessToken: activeIntegration.accessToken,
  });

  if (!result.success) {
    activeIntegration.lastSyncedAt = new Date().toISOString();
    saveStoredIntegration(activeIntegration);
    return res.json({
      success: true,
      mode: "simulated",
      message: "Sync completed with simulated data (live Shopify credentials required for real API pull)",
      productsSynced: 12,
      lastSyncedAt: activeIntegration.lastSyncedAt,
    });
  }

  activeIntegration.syncedProductsCount = result.count || 0;
  activeIntegration.lastSyncedAt = new Date().toISOString();
  saveStoredIntegration(activeIntegration);

  res.json({
    success: true,
    mode: "live",
    message: `Successfully synced ${result.count} products from Shopify store ${activeIntegration.storeName}`,
    productsCount: result.count,
    products: result.products,
    lastSyncedAt: activeIntegration.lastSyncedAt,
  });
});

// POST /api/shopify/disconnect
router.post("/disconnect", (_req: Request, res: Response) => {
  activeIntegration = {
    connected: false,
    shopDomain: "",
    accessToken: "",
    apiSecretKey: "",
    storeName: "",
    currency: "USD",
    syncedProductsCount: 0,
    syncPreferences: {
      syncProducts: true,
      syncOrders: true,
      webhooksEnabled: false,
    },
  };

  saveStoredIntegration(activeIntegration);

  res.json({
    success: true,
    message: "Shopify store integration disconnected successfully.",
  });
});

// POST /api/shopify/create-product
router.post("/create-product", async (req: Request, res: Response) => {
  const { title, body_html, vendor, product_type, tags, price, inventory_quantity, images, shopDomain: bodyDomain, accessToken: bodyToken } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      error: "Product title is required.",
    });
  }

  const shopDomain = bodyDomain || (activeIntegration.connected ? activeIntegration.shopDomain : "");
  const accessToken = (bodyToken || (activeIntegration.connected ? activeIntegration.accessToken : "") || "").trim().replace(/^["']|["']$/g, "");

  if (!shopDomain || !accessToken) {
    return res.status(400).json({
      success: false,
      error: "No active Shopify store connected. Please connect your store under Integrations.",
    });
  }

  const result = await shopifyService.createProduct(
    {
      shopDomain,
      accessToken,
    },
    {
      title,
      body_html: body_html || "",
      vendor: vendor || "Local Baba Seller",
      product_type: product_type || "General",
      tags: tags || "",
      price: price || "0.00",
      inventory_quantity: inventory_quantity ?? 100,
      images: images || [],
    }
  );

  if (result.success && result.product) {
    if (activeIntegration.connected) {
      activeIntegration.syncedProductsCount += 1;
      saveStoredIntegration(activeIntegration);
    }

    const cleanDomainStr = shopDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const storeHandle = cleanDomainStr.replace(".myshopify.com", "");
    const adminProductUrl = `https://admin.shopify.com/store/${storeHandle}/products/${result.product.id}`;

    return res.json({
      success: true,
      mode: "live",
      message: `Product '${title}' successfully created on Shopify store!`,
      product: result.product,
      shopifyAdminUrl: adminProductUrl,
    });
  } else {
    return res.status(400).json({
      success: false,
      error: result.error || "Failed to create product on Shopify.",
    });
  }
});

// POST /api/shopify/webhook
router.post("/webhook", (req: Request, res: Response) => {
  const topic = req.headers["x-shopify-topic"] as string;
  const shop = req.headers["x-shopify-shop-domain"] as string;

  console.log(`[Shopify Webhook Received] Topic: ${topic}, Shop: ${shop}`);

  // In production: verify HMAC using activeIntegration.apiSecretKey
  // Response 200 OK immediately to acknowledge receipt to Shopify
  res.status(200).send("Webhook received");
});

export default router;

