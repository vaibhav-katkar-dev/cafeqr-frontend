"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: "Food" | "Drinks" | "Desserts" | "Snacks";
  imageUrl?: string;
  available: boolean;
}

export function useMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      // We call the profile to get cafeId, then fetch from protected endpoint
      const profileRes = await api.get("/cafe/profile");
      const cafeId = profileRes.data.id;
      const menuRes = await api.get(`/menu/${cafeId}`);
      setItems(menuRes.data.items || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  return { items, loading, error, refetch: fetchMenu, setItems };
}
