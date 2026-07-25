"use client";

import { useState, useEffect } from "react";
import { Lock, Copy, Check, Upload, Clock, ShieldCheck, X, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { submitPaymentProof } from "@/lib/api/subscriptionApi";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
  currentStatus?: "pending" | "active" | "rejected" | "expired" | "none";
  onSuccess?: () => void;
}

const BANK_DETAILS = {
  bankName: "Meezan Bank",
  accountTitle: "The Local Baba Trading",
  iban: "PK00MEZN000123456789",
  amount: "$10.00",
};

export function SubscriptionModal({
  isOpen,
  onClose,
  userEmail = "",
  userName = "",
  currentStatus = "none",
  onSuccess,
}: SubscriptionModalProps) {
  // Hooks must always be called unconditionally (Rules of Hooks)
  const { member } = useAuth();

  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);

  // Sync email/name whenever props or member changes
  useEffect(() => {
    const resolvedEmail = userEmail || member?.email || "";
    const resolvedName = userName || member?.name || "";
    setEmailInput(resolvedEmail);
    setNameInput(resolvedName);
  }, [userEmail, userName, member]);

  if (!isOpen) return null;

  const handleCopyIban = () => {
    navigator.clipboard.writeText(BANK_DETAILS.iban);
    setCopiedIban(true);
    toast.success("IBAN copied to clipboard!");
    setTimeout(() => setCopiedIban(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WEBP)");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }

    setFile(selected);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Please upload your payment screenshot proof.");
      return;
    }

    const targetEmail = (emailInput || userEmail || member?.email || "").trim();
    if (!targetEmail) {
      toast.error("Member email not found. Please log in again.");
      return;
    }
    const targetName = nameInput.trim() || targetEmail.split("@")[0] || "Member";

    setUploading(true);
    toast.info("Uploading payment proof...");

    try {
      // ── Step 1: Upload image to Bunny CDN via server API ──────────────────
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload-payment-proof", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json().catch(() => null);

      if (!uploadRes.ok || !uploadData?.success || !uploadData?.url) {
        setUploading(false);
        toast.error("Upload failed", {
          description: uploadData?.error || "Could not upload payment proof. Please try again.",
        });
        return;
      }

      const imageUrl: string = uploadData.url;
      console.log("[SubscriptionModal] ✅ Image uploaded to Bunny CDN:", imageUrl.slice(0, 80));

      toast.info("Saving payment proof to database...");

      // ── Step 3: Save to Supabase via /api/subscriptions/submit ─────────────
      const result = await submitPaymentProof({
        userEmail: targetEmail,
        userName: targetName,
        paymentProofUrl: imageUrl,
        amount: 10.0,
      });

      setUploading(false);

      if (result.success) {
        toast.success("Payment Proof Submitted! ⏳", {
          description: "Waiting for Admin confirmation. Features will unlock once Admin approves your payment.",
          duration: 6000,
        });
        // NOTE: onSuccess sets status to PENDING — pages stay locked until admin confirms
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error("Submission failed", { description: result.error });
      }
    } catch (err: any) {
      setUploading(false);
      toast.error("Error submitting payment proof", { description: err?.message || "Unexpected error" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
            <Lock size={28} />
          </div>
          <h2 className="text-2xl font-bold font-heading">Unlock AI Listing &amp; Integrations</h2>
          <p className="text-sm text-muted-foreground">
            Get full monthly access to AI Listing features and direct Shopify store integration.
          </p>
        </div>

        {/* Pending Banner */}
        {currentStatus === "pending" && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <Clock className="text-amber-500 mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-semibold text-amber-500 text-sm">Payment Pending Confirmation from Admin ⏳</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Your $10 payment screenshot has been sent to Admin for verification. Features remain locked until Admin reviews and confirms your payment.
              </p>
            </div>
          </div>
        )}

        {/* Pricing Badge */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-amber-500/10 border border-primary/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Monthly Subscription</span>
            <h3 className="text-lg font-bold">AI Listing + Shopify Integration</h3>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold text-primary">$10</span>
            <span className="text-xs text-muted-foreground block">/ month</span>
          </div>
        </div>

        {/* Bank Account Details */}
        <div className="space-y-3 bg-muted/40 p-4 rounded-xl border border-border">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
            <Building2 size={14} /> Bank Account Transfer Details
          </h4>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Bank Name:</span>
              <span className="font-medium text-foreground">{BANK_DETAILS.bankName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Account Title:</span>
              <span className="font-medium text-foreground">{BANK_DETAILS.accountTitle}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">IBAN Number:</span>
              <div className="flex items-center gap-2">
                <code className="bg-background px-2 py-0.5 rounded text-xs font-mono font-semibold text-primary">
                  {BANK_DETAILS.iban}
                </code>
                <button
                  type="button"
                  onClick={handleCopyIban}
                  className="p-1 text-muted-foreground hover:text-primary transition-colors"
                  title="Copy IBAN"
                >
                  {copiedIban ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email Field */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Your Account Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="your@email.com"
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Upload Payment Transfer Screenshot Proof
            </label>
            <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-4 text-center cursor-pointer transition-colors relative bg-muted/20">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {previewUrl ? (
                <div className="space-y-2">
                  <img
                    src={previewUrl}
                    alt="Payment Proof Preview"
                    className="max-h-36 mx-auto rounded-lg border border-border object-contain"
                  />
                  <p className="text-xs text-emerald-500 font-medium flex items-center justify-center gap-1">
                    <Check size={14} /> {file?.name} ({((file?.size || 0) / 1024).toFixed(0)} KB)
                  </p>
                </div>
              ) : (
                <div className="space-y-1 text-muted-foreground">
                  <Upload size={24} className="mx-auto text-primary" />
                  <p className="text-xs font-medium">Click or drag screenshot here</p>
                  <p className="text-[10px]">PNG, JPG, WEBP up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-60"
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                Submit Payment Proof ($10/month)
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
