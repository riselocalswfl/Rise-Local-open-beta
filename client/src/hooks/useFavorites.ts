import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "./useAuth";
import { useCallback, useMemo } from "react";

export function useFavorites() {
  const { isAuthenticated } = useAuth();

  const { data: favoriteIds = [], isLoading } = useQuery<string[]>({
    queryKey: ["/api/favorites/ids"],
    enabled: isAuthenticated,
    staleTime: 1000 * 60, // Cache for 1 minute
  });

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const addFavoriteMutation = useMutation({
    mutationFn: async (dealId: string) => {
      await apiRequest("POST", `/api/favorites/${dealId}`);
      return dealId;
    },
    onMutate: async (dealId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/favorites/ids"] });
      const previousIds = queryClient.getQueryData<string[]>(["/api/favorites/ids"]) || [];
      queryClient.setQueryData<string[]>(["/api/favorites/ids"], [...previousIds, dealId]);
      return { previousIds };
    },
    onError: (_error, _dealId, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(["/api/favorites/ids"], context.previousIds);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/ids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (dealId: string) => {
      await apiRequest("DELETE", `/api/favorites/${dealId}`);
      return dealId;
    },
    onMutate: async (dealId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/favorites/ids"] });
      const previousIds = queryClient.getQueryData<string[]>(["/api/favorites/ids"]) || [];
      queryClient.setQueryData<string[]>(
        ["/api/favorites/ids"],
        previousIds.filter((id) => id !== dealId)
      );
      return { previousIds };
    },
    onError: (_error, _dealId, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(["/api/favorites/ids"], context.previousIds);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/ids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
  });

  const isFavorited = useCallback(
    (dealId: string): boolean => {
      return favoriteSet.has(dealId);
    },
    [favoriteSet]
  );

  const toggleFavorite = useCallback(
    (dealId: string) => {
      if (isFavorited(dealId)) {
        removeFavoriteMutation.mutate(dealId);
      } else {
        addFavoriteMutation.mutate(dealId);
      }
    },
    [isFavorited, addFavoriteMutation, removeFavoriteMutation]
  );

  return {
    favoriteIds,
    isFavorited,
    toggleFavorite,
    isLoading,
    isPending: addFavoriteMutation.isPending || removeFavoriteMutation.isPending,
  };
}
