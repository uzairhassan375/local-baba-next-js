import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface FavoritesState {
  favoriteIds: string[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
}

const FavoritesContext = createContext<FavoritesState | null>(null);

function storageKey(memberId: string) {
  return `localbaba_favorites_${memberId}`;
}

function loadFavorites(memberId: string | undefined): string[] {
  if (!memberId) return [];
  try {
    const data = localStorage.getItem(storageKey(memberId));
    return data ? (JSON.parse(data) as string[]) : [];
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { member } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    setFavoriteIds(loadFavorites(member?.id));
  }, [member?.id]);

  useEffect(() => {
    if (!member?.id) return;
    localStorage.setItem(storageKey(member.id), JSON.stringify(favoriteIds));
  }, [favoriteIds, member?.id]);

  const isFavorite = useCallback((productId: string) => favoriteIds.includes(productId), [favoriteIds]);

  const toggleFavorite = useCallback((productId: string) => {
    setFavoriteIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId],
    );
  }, []);

  const removeFavorite = useCallback((productId: string) => {
    setFavoriteIds(prev => prev.filter(id => id !== productId));
  }, []);

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite, removeFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
