"use client";

import { useState, useEffect } from "react";
import {
  ShoppingBag,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Zap,
  HelpCircle,
  Sparkles,
  Layers,
  ArrowRight,
  Database,
  Unplug,
  Lock,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { checkSubscriptionStatus } from "@/lib/api/subscriptionApi";
import {
  fetchShopifyStatus,
  verifyShopifyConnection,
  connectShopifyStore,
  syncShopifyProducts,
  disconnectShopifyStore,
  ShopifyIntegrationState
} from "@/lib/api/shopifyApi";

export default function IntegrationsScreen() {
  const { member } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subStatus, setSubStatus] = useState<"pending" | "active" | "rejected" | "expired" | "none">("none");
  const [subModalOpen, setSubModalOpen] = useState(false);

  const [state, setState] = useState<ShopifyIntegrationState>({
    connected: false,
    shopDomain: "",
    storeName: "",
    currency: "USD",
    syncedProductsCount: 0,
    syncPreferences: {
      syncProducts: true,
      syncOrders: true,
      webhooksEnabled: true,
    },
  });

  // Form inputs
  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [apiSecretKey, setApiSecretKey] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Status flags
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Load status on mount
  useEffect(() => {
    async function loadStatus() {
      setLoading(true);
      if (member?.email) {
        const sub = await checkSubscriptionStatus(member.email);
        setIsSubscribed(sub.isSubscribed);
        setSubStatus(sub.status);
      }
      const data = await fetchShopifyStatus();
      setState(data);
      if (data.shopDomain) setShopDomain(data.shopDomain);
      setLoading(false);
    }
    loadStatus();
  }, [member]);

  const handleTestConnection = async () => {
    if (!shopDomain.trim()) {
      toast.error("Please enter your Shopify store domain (e.g. store.myshopify.com)");
      return;
    }
    if (!accessToken.trim()) {
      toast.error("Please enter your Shopify Admin API Access Token");
      return;
    }

    setTesting(true);
    const result = await verifyShopifyConnection({
      shopDomain: shopDomain.trim(),
      accessToken: accessToken.trim(),
    });
    setTesting(false);

    if (result.success) {
      toast.success(
        `Connection verified! Store: ${result.shop?.name || shopDomain}`,
        { description: "Click 'Connect Store' below to save and activate your integration." }
      );
    } else {
      toast.error("Verification failed", { description: result.error });
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopDomain.trim() || !accessToken.trim()) {
      toast.error("Store domain and Admin API Access Token are required.");
      return;
    }

    setConnecting(true);
    const result = await connectShopifyStore({
      shopDomain: shopDomain.trim(),
      accessToken: accessToken.trim(),
      apiSecretKey: apiSecretKey.trim(),
      syncPreferences: state.syncPreferences,
    });
    setConnecting(false);

    if (result.success) {
      toast.success("Shopify Store connected successfully!");
      const updated = await fetchShopifyStatus();
      setState(updated);
    } else {
      toast.error("Failed to connect store", { description: result.error });
    }
  };

  const handleSyncProducts = async () => {
    setSyncing(true);
    toast.info("Syncing products from Shopify store...");
    const result = await syncShopifyProducts();
    setSyncing(false);

    if (result.success) {
      toast.success(result.message || "Products synced successfully!");
      const updated = await fetchShopifyStatus();
      setState(updated);
    } else {
      toast.error("Sync failed", { description: result.error });
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm("Are you sure you want to disconnect your Shopify store?")) {
      const result = await disconnectShopifyStore();
      if (result.success) {
        toast.info("Shopify store disconnected.");
        setAccessToken("");
        setApiSecretKey("");
        const updated = await fetchShopifyStatus();
        setState(updated);
      }
    }
  };

  if (loading) {
    return (
      <div className="container py-12 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-primary" size={28} />
          <p className="text-sm text-muted-foreground font-medium">Loading Integrations…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Layers size={22} />
            </span>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
              Store Integrations
            </h1>
            {!isSubscribed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Lock size={12} /> Locked ($10/month Subscription Required)
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Connect your Shopify e-commerce store with your website for automated catalog syncing and live inventory updates.
          </p>
        </div>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors self-start md:self-auto"
        >
          <HelpCircle size={15} className="text-primary" />
          {showGuide ? "Hide Setup Instructions" : "How to Get Shopify Credentials"}
        </button>
      </div>

      {/* Subscription Lock Banner */}
      {!isSubscribed && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-card border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-500 shrink-0 mt-1">
              <Lock size={24} />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">
                Shopify Integration &amp; AI Listing Features Locked
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                {subStatus === "pending"
                  ? "⏳ Your $10 payment proof has been submitted! Features remain locked until Admin reviews and confirms your payment."
                  : "Monthly subscription ($10/month) is required to unlock access to Shopify store integration, product sync, and AI listing generators."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSubModalOpen(true)}
            className="px-5 py-3 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 shrink-0"
          >
            <CreditCard size={16} />
            {subStatus === "pending" ? "View Pending Status" : "Unlock Subscription ($10/month)"}
          </button>
        </div>
      )}

      {/* Setup Guide Collapsible Banner */}
      {showGuide && (
        <div className="bg-card border border-primary/20 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in-down">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-base flex items-center gap-2 text-foreground">
              <Sparkles size={18} className="text-amber-500" />
              How to get your Shopify Admin API Token
            </h3>
            <span className="text-xs font-mono bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">
              Shopify Admin API
            </span>
          </div>

          <ol className="grid md:grid-cols-4 gap-4 text-xs">
            <li className="p-3.5 bg-muted/60 rounded-xl space-y-1.5 border border-border">
              <div className="font-bold text-primary flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] flex items-center justify-center font-bold">1</span>
                Open Shopify Admin
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Log into your Shopify admin panel at <code className="bg-background px-1 py-0.5 rounded text-[11px]">admin.shopify.com</code>
              </p>
            </li>
            <li className="p-3.5 bg-muted/60 rounded-xl space-y-1.5 border border-border">
              <div className="font-bold text-primary flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] flex items-center justify-center font-bold">2</span>
                Create Custom App
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Go to <b>Settings</b> &rarr; <b>Apps and developer channels</b> &rarr; <b>Develop apps</b> &rarr; <b>Create an app</b>.
              </p>
            </li>
            <li className="p-3.5 bg-muted/60 rounded-xl space-y-1.5 border border-border">
              <div className="font-bold text-primary flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] flex items-center justify-center font-bold">3</span>
                Set API Scopes
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Enable <code className="bg-background px-1 py-0.5 rounded text-[11px]">read_products</code>, <code className="bg-background px-1 py-0.5 rounded text-[11px]">write_products</code>, & <code className="bg-background px-1 py-0.5 rounded text-[11px]">read_orders</code>.
              </p>
            </li>
            <li className="p-3.5 bg-muted/60 rounded-xl space-y-1.5 border border-border">
              <div className="font-bold text-primary flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] flex items-center justify-center font-bold">4</span>
                Copy Access Token
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Click <b>Install app</b> and copy your Admin API Access Token (<code className="bg-background px-1 py-0.5 rounded text-[11px]">shpat_...</code>).
              </p>
            </li>
          </ol>
        </div>
      )}

      {/* Main Integration Card — solid locked view when not subscribed */}
      {!isSubscribed ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto shadow-sm">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Lock size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-foreground text-xl font-heading">
              {subStatus === "pending"
                ? "⏳ Payment Pending Admin Confirmation"
                : subStatus === "expired"
                ? "⚠️ Monthly Subscription Expired ($10/month)"
                : "🔒 Shopify Integration Locked"}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {subStatus === "pending"
                ? "Your $10 payment proof has been submitted and is waiting for Admin confirmation. Shopify Integration will unlock automatically once Admin confirms your payment."
                : subStatus === "expired"
                ? "Your 30-day subscription has expired. Please renew your $10/month subscription to reconnect your Shopify store."
                : "A $10/month subscription is required. Transfer to Meezan Bank and submit your screenshot proof to unlock full Shopify store integration."}
            </p>
          </div>
          {subStatus === "pending" ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-semibold">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Pending Confirmation from Admin ⏳
            </div>
          ) : (
            <button
              onClick={() => setSubModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-all shadow-md shadow-amber-500/30 flex items-center gap-2"
            >
              <CreditCard size={18} /> Subscribe Now ($10/month)
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Integration Status & Overview */}
        <div className="lg:col-span-1 space-y-6">
          {/* Shopify Platform Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold">
                  <ShoppingBag size={24} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-foreground">Shopify</h3>
                  <p className="text-xs text-muted-foreground">E-Commerce Store</p>
                </div>
              </div>
              <div>
                {state.connected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/15 text-slate-600 dark:text-slate-400 text-xs font-medium border border-slate-500/20">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Disconnected
                  </span>
                )}
              </div>
            </div>

            {state.connected ? (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="p-3.5 bg-muted/40 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Store Name:</span>
                    <span className="font-semibold text-foreground">{state.storeName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Domain:</span>
                    <span className="font-mono text-primary truncate max-w-[160px]">{state.shopDomain}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Synced Products:</span>
                    <span className="font-semibold text-foreground">{state.syncedProductsCount} Items</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Last Sync:</span>
                    <span className="text-muted-foreground">
                      {state.lastSyncedAt ? new Date(state.lastSyncedAt).toLocaleTimeString() : "Never"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSyncProducts}
                    disabled={syncing}
                    className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                    {syncing ? "Syncing..." : "Sync Products"}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="inline-flex items-center justify-center p-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                    title="Disconnect Store"
                  >
                    <Unplug size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border">
                Connect your Shopify account to automatically import product listings, update prices, and synchronize orders in real-time.
              </p>
            )}
          </div>

          {/* Sync Preferences */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              Sync Features
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">Import Product Catalog</p>
                  <p className="text-[11px] text-muted-foreground">Auto-sync titles, prices, & images</p>
                </div>
                <input
                  type="checkbox"
                  checked={state.syncPreferences?.syncProducts ?? true}
                  onChange={e =>
                    setState(prev => ({
                      ...prev,
                      syncPreferences: { ...prev.syncPreferences, syncProducts: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">Order Syncing</p>
                  <p className="text-[11px] text-muted-foreground">Export website orders to Shopify</p>
                </div>
                <input
                  type="checkbox"
                  checked={state.syncPreferences?.syncOrders ?? true}
                  onChange={e =>
                    setState(prev => ({
                      ...prev,
                      syncPreferences: { ...prev.syncPreferences, syncOrders: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">Real-time Webhooks</p>
                  <p className="text-[11px] text-muted-foreground">Instant stock update listeners</p>
                </div>
                <input
                  type="checkbox"
                  checked={state.syncPreferences?.webhooksEnabled ?? true}
                  onChange={e =>
                    setState(prev => ({
                      ...prev,
                      syncPreferences: { ...prev.syncPreferences, webhooksEnabled: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Connection Form */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
                  <ShieldCheck size={20} className="text-primary" />
                  Connect Shopify Store
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter your Shopify Admin API credentials to connect your store with the website.
                </p>
              </div>
            </div>

            <form onSubmit={handleConnect} className="space-y-5">
              {/* Store Domain */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground">
                  Shopify Store URL <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="my-brand-store.myshopify.com"
                    value={shopDomain}
                    onChange={e => setShopDomain(e.target.value)}
                    className="w-full h-11 px-3.5 pr-10 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="absolute right-3 top-3 text-muted-foreground">
                    <ExternalLink size={16} />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Your store's default domain ending in <code className="text-primary">.myshopify.com</code>
                </p>
              </div>

              {/* Admin API Access Token */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground">
                  Admin API Access Token <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    required
                    placeholder="shpat_1a2b3c4d5e6f7g8h9i0j..."
                    value={accessToken}
                    onChange={e => setAccessToken(e.target.value)}
                    className="w-full h-11 px-3.5 pr-10 rounded-xl bg-background border border-border text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Generated inside Shopify Admin &rarr; Develop apps &rarr; Admin API Access Token.
                </p>
              </div>

              {/* API Secret Key */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground">
                  API Secret Key <span className="text-muted-foreground font-normal">(Optional, for Webhooks)</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    placeholder="shpss_9a8b7c6d5e4f..."
                    value={apiSecretKey}
                    onChange={e => setApiSecretKey(e.target.value)}
                    className="w-full h-11 px-3.5 pr-10 rounded-xl bg-background border border-border text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Used to cryptographically sign real-time webhook payloads from Shopify.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="w-full sm:w-auto h-11 px-5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} className={testing ? "animate-spin" : ""} />
                  {testing ? "Testing Connection..." : "Test Connection"}
                </button>

                <button
                  type="submit"
                  disabled={connecting}
                  className="w-full sm:w-1/2 h-11 px-6 rounded-xl bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md"
                >
                  {connecting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      {state.connected ? "Update Credentials" : "Connect Shopify Store"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}

      <SubscriptionModal
        isOpen={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        userEmail={member?.email || ""}
        userName={member?.name || ""}
        currentStatus={subStatus}
        onSuccess={() => {
          // Payment submitted — stay locked until admin confirms
          setIsSubscribed(false);
          setSubStatus("pending");
        }}
      />
    </div>
  );
}
