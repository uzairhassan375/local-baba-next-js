import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { registerMember } from "@/lib/supabase/applicationsApi";

const sellOptions = ["Fashion & clothing", "Electronics accessories", "Home & kitchen", "Beauty & personal care", "Kids & toys", "Other"];
const whereOptions = ["Instagram / TikTok", "Daraz", "Physical retail shop", "Facebook Marketplace", "WhatsApp customers", "Other"];
const volumeOptions = ["Under Rs 20,000", "Rs 20,000 – 1,00,000", "Rs 1,00,000 – 5,00,000", "Rs 5,00,000+"];
const heardOptions = ["Instagram", "TikTok", "WhatsApp forward", "Friend or colleague", "Google search", "Other"];
const cities = ["Lahore", "Karachi", "Islamabad", "Faisalabad", "Rawalpindi", "Multan", "Peshawar", "Quetta", "Other"];

const benefits = [
  "Direct-importer pricing on 300+ products",
  "MOQ of just 30 pcs per SKU",
  "48-hour dispatch with live WhatsApp tracking",
  "Exclusive Thursday drops before public",
  "One dashboard replacing all your supplier broadcasts",
  "Dedicated WhatsApp support",
];

type RegisterForm = {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  whatsapp: string;
  city: string;
  businessName: string;
  sellsWhat: string[];
  sellsWhere: string[];
  monthlyVolume: string;
  heardFrom: string;
};

export default function ApplyPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<RegisterForm>({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    whatsapp: "",
    city: "",
    businessName: "",
    sellsWhat: [],
    sellsWhere: [],
    monthlyVolume: "",
    heardFrom: "",
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      registerMember({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        whatsapp: form.whatsapp.replace(/\D/g, ""),
        city: form.city,
        business_name: form.businessName.trim(),
        sells_what: form.sellsWhat,
        sells_where: form.sellsWhere,
        monthly_volume: form.monthlyVolume,
        heard_from: form.heardFrom.trim(),
      }),
    onSuccess: async result => {
      void queryClient.invalidateQueries({ queryKey: ["membership-applications"] });
      if (result.flow === "awaiting_email_confirmation") {
        toast.success(
          "Account created. Confirm your email from the message we sent, then sign in — your shop details will be saved automatically.",
        );
        router.replace("/login");
        return;
      }
      await refreshAuth();
      toast.success("You're in! Redirecting to your dashboard…");
      router.replace("/dashboard");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Could not register. Check Supabase Auth and migrations.");
    },
  });

  const update = <K extends keyof RegisterForm>(field: K, value: RegisterForm[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      const n = { ...prev };
      delete n[field];
      return n;
    });
  };

  const toggleArr = (field: "sellsWhat" | "sellsWhere", val: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(val) ? prev[field].filter(v => v !== val) : [...prev[field], val],
    }));
    setErrors(prev => {
      const n = { ...prev };
      delete n[field];
      return n;
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const email = form.email.trim();
    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";

    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "Use at least 6 characters";

    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";

    if (!form.name.trim()) e.name = "Name is required";
    if (!form.whatsapp.trim()) e.whatsapp = "WhatsApp number is required";
    if (!form.city) e.city = "City is required";
    if (!form.businessName.trim()) e.businessName = "Business name is required";
    if (form.sellsWhat.length === 0) e.sellsWhat = "Select at least one";
    if (form.sellsWhere.length === 0) e.sellsWhere = "Select at least one";
    if (!form.monthlyVolume) e.monthlyVolume = "Select your volume";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    if (form.whatsapp.replace(/\D/g, "").length < 10) {
      setErrors(prev => ({ ...prev, whatsapp: "Enter a valid mobile number" }));
      return;
    }
    submitMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <div className="container py-8 md:py-12">
        <div className="mb-6">
          <p className="text-xs text-muted-foreground">
            <Link href="/" className="hover:text-primary">
              Home
            </Link>{" "}
            › Register
          </p>
          <h1 className="font-heading font-bold text-3xl md:text-4xl mt-2">Create your member account</h1>
          <p className="text-muted-foreground mt-1">Register with email and password. You can sign in right away.</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {["500+ active members", "Verified sellers only", "Takes 60 seconds"].map(t => (
              <span key={t} className="px-3 py-1 rounded-pill text-xs border border-border font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-3">
            <div className="bg-card rounded-card shadow-subtle border border-border p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-heading font-semibold">Register</p>
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-pill">1 step · ~60 seconds</span>
                </div>

                <div className="space-y-4 border-b border-border pb-6">
                  <p className="text-sm font-heading font-semibold text-muted-foreground">Account</p>
                  <div>
                    <label className="text-sm font-medium block mb-1">Email *</label>
                    <input
                      value={form.email}
                      onChange={e => update("email", e.target.value)}
                      placeholder="you@example.com"
                      type="email"
                      autoComplete="email"
                      className={`w-full h-11 px-3 rounded-lg border ${errors.email ? "border-danger" : "border-border"} bg-card focus:border-primary focus:outline-none transition-colors`}
                    />
                    {errors.email && <p className="text-danger text-xs mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Password *</label>
                    <input
                      value={form.password}
                      onChange={e => update("password", e.target.value)}
                      type="password"
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      className={`w-full h-11 px-3 rounded-lg border ${errors.password ? "border-danger" : "border-border"} bg-card focus:border-primary focus:outline-none transition-colors`}
                    />
                    {errors.password && <p className="text-danger text-xs mt-1">{errors.password}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Confirm password *</label>
                    <input
                      value={form.confirmPassword}
                      onChange={e => update("confirmPassword", e.target.value)}
                      type="password"
                      autoComplete="new-password"
                      placeholder="Repeat password"
                      className={`w-full h-11 px-3 rounded-lg border ${errors.confirmPassword ? "border-danger" : "border-border"} bg-card focus:border-primary focus:outline-none transition-colors`}
                    />
                    {errors.confirmPassword && <p className="text-danger text-xs mt-1">{errors.confirmPassword}</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-heading font-semibold text-muted-foreground">About you</p>
                  <div>
                    <label className="text-sm font-medium block mb-1">Full name *</label>
                    <input
                      value={form.name}
                      onChange={e => update("name", e.target.value)}
                      placeholder="Ahmad Khan"
                      className={`w-full h-11 px-3 rounded-lg border ${errors.name ? "border-danger" : "border-border"} bg-card focus:border-primary focus:outline-none transition-colors`}
                    />
                    {errors.name && <p className="text-danger text-xs mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">WhatsApp number *</label>
                    <div className="flex">
                      <span className="h-11 px-3 flex items-center text-sm bg-muted border border-r-0 border-border rounded-l-lg text-muted-foreground">
                        +92
                      </span>
                      <input
                        value={form.whatsapp}
                        onChange={e => update("whatsapp", e.target.value)}
                        placeholder="3001234567"
                        type="tel"
                        className={`flex-1 h-11 px-3 rounded-r-lg border ${errors.whatsapp ? "border-danger" : "border-border"} bg-card focus:border-primary focus:outline-none transition-colors`}
                      />
                    </div>
                    {errors.whatsapp && <p className="text-danger text-xs mt-1">{errors.whatsapp}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">City *</label>
                    <select
                      value={form.city}
                      onChange={e => update("city", e.target.value)}
                      className={`w-full h-11 px-3 rounded-lg border ${errors.city ? "border-danger" : "border-border"} bg-card focus:border-primary focus:outline-none`}
                    >
                      <option value="">Select city</option>
                      {cities.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {errors.city && <p className="text-danger text-xs mt-1">{errors.city}</p>}
                  </div>
                </div>

                <div className="border-t border-border pt-6 space-y-4">
                  <p className="text-sm font-heading font-semibold text-muted-foreground">Your business</p>
                  <div>
                    <label className="text-sm font-medium block mb-1">Business / shop name *</label>
                    <input
                      value={form.businessName}
                      onChange={e => update("businessName", e.target.value)}
                      placeholder="Style Hub PK"
                      className={`w-full h-11 px-3 rounded-lg border ${errors.businessName ? "border-danger" : "border-border"} bg-card focus:border-primary focus:outline-none transition-colors`}
                    />
                    {errors.businessName && <p className="text-danger text-xs mt-1">{errors.businessName}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">What do you sell? *</label>
                    <div className="flex flex-wrap gap-2">
                      {sellOptions.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleArr("sellsWhat", opt)}
                          className={`h-9 px-4 rounded-pill text-sm border transition-colors ${
                            form.sellsWhat.includes(opt)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:border-primary"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {errors.sellsWhat && <p className="text-danger text-xs mt-1">{errors.sellsWhat}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Where do you sell? *</label>
                    <div className="flex flex-wrap gap-2">
                      {whereOptions.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleArr("sellsWhere", opt)}
                          className={`h-9 px-4 rounded-pill text-sm border transition-colors ${
                            form.sellsWhere.includes(opt)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:border-primary"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {errors.sellsWhere && <p className="text-danger text-xs mt-1">{errors.sellsWhere}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Estimated monthly order volume *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {volumeOptions.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => update("monthlyVolume", opt)}
                          className={`h-12 px-4 rounded-card text-sm border text-left transition-colors ${
                            form.monthlyVolume === opt
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:border-primary"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {errors.monthlyVolume && <p className="text-danger text-xs mt-1">{errors.monthlyVolume}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">How did you hear about us?</label>
                    <select
                      value={form.heardFrom}
                      onChange={e => update("heardFrom", e.target.value)}
                      className="w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:outline-none"
                    >
                      <option value="">Select</option>
                      {heardOptions.map(h => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="w-full h-[52px] rounded-lg bg-primary text-primary-foreground font-heading font-semibold text-lg hover:bg-accent-hover transition-all active:scale-[0.97] disabled:opacity-60"
                >
                  {submitMutation.isPending ? "Creating account…" : "Create account →"}
                </button>
                <p className="text-center text-sm text-muted-foreground">
                  Already registered?{" "}
                  <Link href="/login" className="text-primary font-medium hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </div>
          </div>

          <div className="hidden md:block md:col-span-2">
            <div className="sticky top-24 bg-dark rounded-card p-8">
              <h3 className="font-heading font-bold text-lg text-primary-foreground mb-4">What you get as a member</h3>
              <ul className="space-y-3">
                {benefits.map(b => (
                  <li key={b} className="flex items-start gap-2 text-sm text-primary-foreground/80">
                    <CheckCircle size={16} className="text-olive mt-0.5 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-sm italic mt-6">"Instant access after you register."</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
