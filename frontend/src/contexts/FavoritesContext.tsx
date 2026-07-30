import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchFavorites, addFavorite as apiAddFavorite, removeFavorite as apiRemoveFavorite } from "@/lib/api/favoritesApi";

interface FavoritesState {
  favoriteIds: string[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
}

const FavoritesContext = createContext<FavoritesState | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { member } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    if (!member?.id) {
      setFavoriteIds([]);
      return;
    }
    let cancelled = false;
    fetchFavorites().then(favorites => {
      if (!cancelled) setFavoriteIds(favorites.map(f => f.productId));
    });
    return () => {
      cancelled = true;
    };
  }, [member?.id]);

  const isFavorite = useCallback((productId: string) => favoriteIds.includes(productId), [favoriteIds]);

  const toggleFavorite = useCallback(
    (productId: string) => {
      setFavoriteIds(prev => {
        const alreadyFavorite = prev.includes(productId);
        if (alreadyFavorite) {
          void apiRemoveFavorite(productId);
          return prev.filter(id => id !== productId);
        }
        void apiAddFavorite(productId);
        return [...prev, productId];
      });
    },
    [],
  );

  const removeFavorite = useCallback((productId: string) => {
    setFavoriteIds(prev => prev.filter(id => id !== productId));
    void apiRemoveFavorite(productId);
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
