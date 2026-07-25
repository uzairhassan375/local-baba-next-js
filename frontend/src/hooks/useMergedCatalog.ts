import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCatalogProductsFromDb } from "@/lib/supabase/productsApi";

export function useMergedCatalog() {
  const query = useQuery({
    queryKey: ["db-catalog-products"],
    queryFn: fetchCatalogProductsFromDb,
    staleTime: 30_000,
  });

  const merged = useMemo(() => query.data ?? [], [query.data]);

  return {
    merged,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}
