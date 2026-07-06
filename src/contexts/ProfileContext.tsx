import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface SavedAddress {
  id: string;
  label: string;
  name: string;
  whatsapp: string;
  address: string;
  city: string;
  landmark: string;
  isDefault: boolean;
}

interface ProfileState {
  addresses: SavedAddress[];
  addAddress: (address: Omit<SavedAddress, "id">) => void;
  updateAddress: (id: string, address: Omit<SavedAddress, "id">) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  defaultAddress: SavedAddress | null;
}

const ProfileContext = createContext<ProfileState | null>(null);

function storageKey(memberId: string) {
  return `localbaba_addresses_${memberId}`;
}

function loadAddresses(memberId: string | undefined): SavedAddress[] {
  if (!memberId) return [];
  try {
    const data = localStorage.getItem(storageKey(memberId));
    return data ? (JSON.parse(data) as SavedAddress[]) : [];
  } catch {
    return [];
  }
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { member } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);

  useEffect(() => {
    setAddresses(loadAddresses(member?.id));
  }, [member?.id]);

  useEffect(() => {
    if (!member?.id) return;
    localStorage.setItem(storageKey(member.id), JSON.stringify(addresses));
  }, [addresses, member?.id]);

  const addAddress = useCallback((address: Omit<SavedAddress, "id">) => {
    const id = crypto.randomUUID();
    setAddresses(prev => {
      const next = address.isDefault
        ? prev.map(a => ({ ...a, isDefault: false }))
        : [...prev];
      return [...next, { ...address, id }];
    });
  }, []);

  const updateAddress = useCallback((id: string, address: Omit<SavedAddress, "id">) => {
    setAddresses(prev => {
      let next = prev.map(a => (a.id === id ? { ...address, id } : a));
      if (address.isDefault) {
        next = next.map(a => ({ ...a, isDefault: a.id === id }));
      }
      return next;
    });
  }, []);

  const removeAddress = useCallback((id: string) => {
    setAddresses(prev => prev.filter(a => a.id !== id));
  }, []);

  const setDefaultAddress = useCallback((id: string) => {
    setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
  }, []);

  const defaultAddress = addresses.find(a => a.isDefault) ?? addresses[0] ?? null;

  return (
    <ProfileContext.Provider
      value={{ addresses, addAddress, updateAddress, removeAddress, setDefaultAddress, defaultAddress }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
