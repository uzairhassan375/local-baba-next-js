"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { OrdersProvider } from "@/contexts/OrdersContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FavoritesProvider>
          <ProfileProvider>
            <OrdersProvider>
              <CartProvider>
                <TooltipProvider>
                  <Sonner />
                  {children}
                </TooltipProvider>
              </CartProvider>
            </OrdersProvider>
          </ProfileProvider>
        </FavoritesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
