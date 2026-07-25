"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ShoppingBag, Send, Trash2, CheckCircle2, ExternalLink, RefreshCw, Layers, Grid3X3, Lock, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { checkSubscriptionStatus } from "@/lib/api/subscriptionApi";
import {
  getSellerAiListings,
  deleteSellerAiListing,
  updateSellerAiListing,
  SavedAiListing
} from "@/lib/ai/sellerAiListingsApi";
import { createShopifyProduct } from "@/lib/api/shopifyApi";

export default function MyAiListingsScreen() {
  const { member } = useAuth();
  const [listings, setListings] = useState<SavedAiListing[]>([]);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subStatus, setSubStatus] = useState<"pending" | "active" | "rejected" | "expired" | "none">("none");
  const [subModalOpen, setSubModalOpen] = useState(false);

  useEffect(() => {
    setListings(getSellerAiListings());
    if (member?.email) {
      checkSubscriptionStatus(member.email).then(sub => {
        setIsSubscribed(sub.isSubscribed);
        setSubStatus(sub.status);
      });
    }
  }, [member]);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this saved AI listing?")) {
      deleteSellerAiListing(id);
      setListings(getSellerAiListings());
      toast.info("AI listing removed.");
    }
  };

  const handlePostToShopify = async (item: SavedAiListing) => {
    if (member?.email) {
      const sub = await checkSubscriptionStatus(member.email);
      if (!sub.isSubscribed) {
        setSubStatus(sub.status);
        setSubModalOpen(true);
        toast.error("Subscription required to post to Shopify ($10)");
        return;
      }
    }

    setPostingId(item.id);
    toast.info(`Publishing '${item.title}' to Shopify store...`);

    const result = await createShopifyProduct({
      title: item.title,
      body_html: `<p>${item.description}</p><ul>${item.keyFeatures.map(f => `<li>${f}</li>`).join("")}</ul>`,
      vendor: "Local Baba Seller",
      product_type: item.category,
      tags: item.tags.join(", "),
      price: item.pricePerPc.toString(),
      inventory_quantity: item.stock,
      images: item.selectedImages.map(src => ({ src })),
    });

    setPostingId(null);

    if (result.success) {
      updateSellerAiListing(item.id, {
        postedToShopify: true,
        shopifyProductId: result.product?.id?.toString() || "live",
        shopifyPostedAt: new Date().toISOString(),
      });
      setListings(getSellerAiListings());

      if (result.shopifyAdminUrl) {
        toast.success(`Published to Shopify!`, {
          description: result.message || `Product '${item.title}' is live on your store.`,
          action: {
            label: "Open in Shopify Admin",
            onClick: () => window.open(result.shopifyAdminUrl, "_blank"),
          },
        });
      } else {
        toast.success(`Published to Shopify!`, {
          description: result.message || `Product '${item.title}' is now live on your connected store.`,
        });
      }
    } else {
      toast.error("Failed to post to Shopify", { description: result.error });
    }
  };

  return (
    <div className="container py-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles size={22} />
            </span>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
              My AI Listings
            </h1>
            {!isSubscribed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 ml-1">
                <Lock size={12} /> Locked
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your AI-generated product listings and publish them directly to your connected Shopify store.
          </p>
        </div>

        <Link
          href="/catalogue"
          className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity self-start md:self-auto shadow-sm"
        >
          <Grid3X3 size={16} />
          Generate New AI Listing from Catalogue
        </Link>
      </div>

      {/* Full page Lock overlay for non-subscribed users */}
      {!isSubscribed && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-card border-2 border-amber-500/40 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-amber-500/10">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-amber-500/20 text-amber-500 shrink-0">
              <Lock size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                🔒 AI Listing Feature Locked
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
                {subStatus === "pending"
                  ? "⏳ Your $10 payment proof has been submitted! Waiting for confirmation from Admin. AI Listing features remain locked until Admin approves your payment."
                  : "Monthly subscription ($10/month) is required to unlock AI Listing generation and direct Shopify publishing. Pay via Meezan Bank and submit your screenshot proof."}
              </p>
              {subStatus === "pending" && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-semibold">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Payment Verification Pending Admin Approval ⏳
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setSubModalOpen(true)}
            className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-all shadow-md shadow-amber-500/30 flex items-center gap-2 shrink-0 whitespace-nowrap"
          >
            <CreditCard size={18} />
            {subStatus === "pending" ? "View Pending Status" : "Subscribe Now ($10/month)"}
          </button>
        </div>
      )}

      {/* Content — hidden when locked until admin confirms */}
      {!isSubscribed ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
            <Lock size={36} />
          </div>
          <div className="space-y-2">
            <h3 className="font-heading font-bold text-xl text-foreground">
              {subStatus === "pending"
                ? "⏳ Payment Pending Admin Confirmation"
                : subStatus === "expired"
                ? "⚠️ Monthly Subscription Expired ($10/month)"
                : "🔒 Monthly Subscription Required ($10/month)"}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {subStatus === "pending"
                ? "Your $10 payment proof screenshot has been submitted and is currently waiting for Admin confirmation. AI Listing features will unlock automatically as soon as Admin confirms your payment!"
                : subStatus === "expired"
                ? "Your 30-day subscription has expired. Please renew your $10/month subscription to regain access to AI Listing features."
                : "Subscribe for $10/month to unlock unlimited AI Listing generation and direct Shopify publishing. Pay via Meezan Bank and upload your screenshot proof."}
            </p>
          </div>
          <button
            onClick={() => setSubModalOpen(true)}
            className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 flex items-center gap-2"
          >
            <CreditCard size={18} />
            {subStatus === "pending" ? "View Submission Status" : "Subscribe Now ($10/month)"}
          </button>
        </div>
      ) : (

        <div className={listings.length === 0 ? "" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
          {listings.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Sparkles size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="font-heading font-bold text-lg text-foreground">No Saved AI Listings</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Browse products in the Wholesale Catalogue, click <b>AI Listing</b> on any item to generate visual AI listings, and save them here.
                </p>
              </div>
              <Link
                href="/catalogue"
                className="inline-flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
              >
                Go to Catalogue
              </Link>
            </div>
          ) : (
            listings.map(item => (
              <div
                key={item.id}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-card transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Product Image Preview */}
                  <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                    <img
                      src={item.selectedImages[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600"}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {item.postedToShopify && (
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold tracking-wide flex items-center gap-1 shadow-md">
                        <CheckCircle2 size={12} />
                        POSTED TO SHOPIFY
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                      title="Remove Listing"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Info Section */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      <span className="text-xs font-semibold text-primary">Rs. {item.pricePerPc} / pc</span>
                    </div>

                    <h3 className="font-heading font-bold text-base line-clamp-2 text-foreground">
                      {item.title}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="p-4 border-t border-border bg-muted/20">
                  <button
                    onClick={() => handlePostToShopify(item)}
                    disabled={postingId === item.id}
                    className={`w-full h-10 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-2 transition-all shadow-sm ${
                      item.postedToShopify
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-primary hover:opacity-90 text-primary-foreground"
                    } disabled:opacity-50`}
                  >
                    {postingId === item.id ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Posting to Shopify...
                      </>
                    ) : item.postedToShopify ? (
                      <>
                        <Send size={14} />
                        Re-Post to Shopify
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        Post to Shopify
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
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
