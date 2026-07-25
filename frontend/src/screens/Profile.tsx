import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { User, MapPin, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, type SavedAddress } from "@/contexts/ProfileContext";
import { createClient } from "@/lib/supabase/client";
import { updateMemberProfile } from "@/lib/supabase/applicationsApi";
import { cities } from "@/data/mockData";

const emptyAddress = (): Omit<SavedAddress, "id"> => ({
  label: "",
  name: "",
  whatsapp: "",
  address: "",
  city: "",
  landmark: "",
  isDefault: false,
});

export default function ProfilePage() {
  const { member, refreshAuth } = useAuth();
  const { addresses, addAddress, updateAddress, removeAddress, setDefaultAddress } = useProfile();
  const queryClient = useQueryClient();

  const [profileForm, setProfileForm] = useState({
    name: member?.name ?? "",
    whatsapp: member?.whatsapp ?? "",
    city: member?.city ?? "",
    businessName: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState(emptyAddress());
  const [showAddressForm, setShowAddressForm] = useState(false);

  useEffect(() => {
    if (!member) return;
    setProfileForm(f => ({
      ...f,
      name: member.name,
      whatsapp: member.whatsapp,
      city: member.city,
    }));
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("membership_applications")
        .select("business_name")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (data?.business_name) {
        setProfileForm(f => ({ ...f, businessName: data.business_name }));
      }
    })();
  }, [member]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim() || !profileForm.whatsapp.trim() || !profileForm.city) {
      toast.error("Name, WhatsApp, and city are required");
      return;
    }
    setSavingProfile(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      await updateMemberProfile(user.id, {
        name: profileForm.name,
        whatsapp: profileForm.whatsapp,
        city: profileForm.city,
        business_name: profileForm.businessName,
      });
      await refreshAuth();
      queryClient.invalidateQueries();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const openAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      ...emptyAddress(),
      name: member?.name ?? "",
      whatsapp: member?.whatsapp ?? "",
      city: member?.city ?? "",
      isDefault: addresses.length === 0,
    });
    setShowAddressForm(true);
  };

  const openEditAddress = (addr: SavedAddress) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      label: addr.label,
      name: addr.name,
      whatsapp: addr.whatsapp,
      address: addr.address,
      city: addr.city,
      landmark: addr.landmark,
      isDefault: addr.isDefault,
    });
    setShowAddressForm(true);
  };

  const handleSaveAddress = () => {
    if (!addressForm.label.trim() || !addressForm.name.trim() || !addressForm.address.trim() || !addressForm.city) {
      toast.error("Label, name, address, and city are required");
      return;
    }
    if (editingAddressId) {
      updateAddress(editingAddressId, addressForm);
      toast.success("Address updated");
    } else {
      addAddress(addressForm);
      toast.success("Address saved");
    }
    setShowAddressForm(false);
    setEditingAddressId(null);
  };

  const initials = member?.name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "MB";

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in-up max-w-2xl">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-olive text-primary-foreground text-xl font-bold flex items-center justify-center">
          {initials}
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl">{member?.name}</h1>
          <p className="text-sm text-muted-foreground">Member since {member?.joinedDate} · {member?.city}</p>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSaveProfile} className="bg-card rounded-card border border-border p-6 space-y-4">
        <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
          <User size={18} className="text-primary" />
          Personal details
        </h2>
        <div>
          <label className="text-sm font-medium block mb-1">Full name</label>
          <input
            value={profileForm.name}
            onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
            required
            className="w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">WhatsApp number</label>
          <div className="flex">
            <span className="h-11 px-3 flex items-center text-sm bg-muted border border-r-0 border-border rounded-l-lg text-muted-foreground">+92</span>
            <input
              value={profileForm.whatsapp}
              onChange={e => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
              required
              className="flex-1 h-11 px-3 rounded-r-lg border border-border bg-card focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">City</label>
          <select
            value={profileForm.city}
            onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
            required
            className="w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:outline-none"
          >
            <option value="">Select city</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Business name</label>
          <input
            value={profileForm.businessName}
            onChange={e => setProfileForm({ ...profileForm, businessName: e.target.value })}
            placeholder="Your shop or business name"
            className="w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={savingProfile}
          className="h-11 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {savingProfile ? "Saving…" : "Save profile"}
        </button>
      </form>

      {/* Saved addresses */}
      <div className="bg-card rounded-card border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
            <MapPin size={18} className="text-primary" />
            Saved addresses
          </h2>
          <button
            type="button"
            onClick={openAddAddress}
            className="h-9 px-3 rounded-lg border border-border text-sm flex items-center gap-1.5 hover:bg-muted transition-colors"
          >
            <Plus size={16} /> Add
          </button>
        </div>

        {showAddressForm && (
          <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium">Label (e.g. Shop, Warehouse)</label>
                <input value={addressForm.label} onChange={e => setAddressForm({ ...addressForm, label: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Contact name</label>
                <input value={addressForm.name} onChange={e => setAddressForm({ ...addressForm, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">WhatsApp</label>
                <input value={addressForm.whatsapp} onChange={e => setAddressForm({ ...addressForm, whatsapp: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm mt-1" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium">Full address</label>
                <textarea value={addressForm.address} onChange={e => setAddressForm({ ...addressForm, address: e.target.value })}
                  rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm mt-1 resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium">City</label>
                <select value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm mt-1">
                  <option value="">Select</option>
                  {cities.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Landmark</label>
                <input value={addressForm.landmark} onChange={e => setAddressForm({ ...addressForm, landmark: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm mt-1" />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={addressForm.isDefault} onChange={e => setAddressForm({ ...addressForm, isDefault: e.target.checked })} className="accent-primary" />
                Set as default address
              </label>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleSaveAddress} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1">
                <Check size={14} /> Save
              </button>
              <button type="button" onClick={() => setShowAddressForm(false)} className="h-9 px-4 rounded-lg border border-border text-sm flex items-center gap-1">
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}

        {addresses.length === 0 && !showAddressForm ? (
          <p className="text-sm text-muted-foreground">No saved addresses. Add one to use at checkout.</p>
        ) : (
          <div className="space-y-3">
            {addresses.map(addr => (
              <div key={addr.id} className={`border rounded-lg p-4 ${addr.isDefault ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2">
                      {addr.label}
                      {addr.isDefault && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-pill">Default</span>}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{addr.name} · +92{addr.whatsapp}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{addr.address}, {addr.city}</p>
                    {addr.landmark && <p className="text-xs text-muted-foreground mt-0.5">Near {addr.landmark}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!addr.isDefault && (
                      <button type="button" onClick={() => setDefaultAddress(addr.id)} className="p-2 text-xs text-primary hover:bg-muted rounded" title="Set default">
                        Default
                      </button>
                    )}
                    <button type="button" onClick={() => openEditAddress(addr)} className="p-2 hover:bg-muted rounded text-muted-foreground">
                      <Pencil size={14} />
                    </button>
                    <button type="button" onClick={() => { removeAddress(addr.id); toast.success("Address removed"); }} className="p-2 hover:bg-muted rounded text-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
