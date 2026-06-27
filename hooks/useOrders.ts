"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  Timestamp,
} from "firebase/firestore";

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  tableNumber: number;
  items: OrderItem[];
  totalPrice: number;
  status: "pending" | "accepted" | "preparing" | "delivered";
  customerName: string;
  customerNote: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * useOrders — real-time order stream with two modes:
 *
 * LIVE mode (dateRange = null/undefined):
 *   • Fetches only today's orders (midnight → now)
 *   • Scoped to limit(200) to protect Firebase free tier
 *   • Plays notification sounds for new incoming orders
 *
 * HISTORY mode (dateRange provided):
 *   • Fetches orders within the given date range
 *   • Higher limit(500) for multi-day ranges
 *   • Sound notifications are suppressed (past data)
 */
export function useOrders(cafeId: string | null, dateRange?: DateRange | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const prevOrderIds = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isHistoryMode = !!dateRange;

  useEffect(() => {
    if (!cafeId) return;

    setLoading(true);
    setOrders([]);
    prevOrderIds.current = new Set();

    // Create audio element for notification (live mode only)
    if (!isHistoryMode && typeof window !== "undefined") {
      audioRef.current = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJiVkHRVTVuJgoN9YVFTcXh8d2dYUl5na29pXldZXmlubW1nYVtfZ3B0cW5oYl1hanbk7OXQ2tza0cS8vcC/r6qrpI+Kg4J5c3F3f3l5eHRwb2twdXVzbWptbW9sbmxuam1sbG1ubGpqbG1ubWxsbG1ubGpqa2xua2tqa2xtbGxsbW1tbGxsbGxsbGxsbW1sa2tsbm5tbGxsbm9vbWxtbW5vbm5ubm5ubm9vb25vb29vb29vb3BwcHBwcHBwcHBwcHBwcA=="
      );
    }

    let q;

    if (isHistoryMode && dateRange) {
      // --- HISTORY MODE: fetch a specific date range ---
      // No notification logic; limit is higher for multi-day spans.
      const startTs = Timestamp.fromDate(dateRange.start);
      const endTs = Timestamp.fromDate(dateRange.end);
      q = query(
        collection(db, "cafes", cafeId, "orders"),
        where("createdAt", ">=", startTs),
        where("createdAt", "<=", endTs),
        orderBy("createdAt", "desc"),
        limit(500)
      );
    } else {
      // --- LIVE MODE: today's orders only (midnight → now) ---
      // Optimized to protect Firebase Spark free tier (50k reads/day).
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startTimestamp = Timestamp.fromDate(startOfToday);
      q = query(
        collection(db, "cafes", cafeId, "orders"),
        where("createdAt", ">=", startTimestamp),
        orderBy("createdAt", "desc"),
        limit(200)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newOrders = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Order;
      });

      // Sound notifications — live mode only
      if (!isHistoryMode) {
        const currentIds = new Set(newOrders.map((o) => o.id));
        const hasNewOrder = newOrders.some((o) => !prevOrderIds.current.has(o.id));
        const isMuted =
          typeof window !== "undefined" &&
          localStorage.getItem("cafe_qr_muted") === "true";
        if (hasNewOrder && prevOrderIds.current.size > 0 && !isMuted) {
          audioRef.current?.play().catch(() => {});
        }
        prevOrderIds.current = currentIds;
      }

      setOrders(newOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [cafeId, dateRange?.start?.getTime(), dateRange?.end?.getTime()]);

  return { orders, loading, isHistoryMode };
}
