"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";

export interface WaiterCall {
  id: string;
  tableNumber: number;
  type: "waiter" | "bill";
  status: "active" | "resolved";
  createdAt: Date;
}

export function useWaiterCalls(cafeId: string | null) {
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const prevCallIds = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!cafeId) return;

    if (typeof window !== "undefined") {
      // Different sound for waiter calls
      audioRef.current = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJiVkHRVTVuJgoN9YVFTcXh8d2dYUl5na29pXldZXmlubW1nYVtfZ3B0cW5oYl1hanbk7OXQ2tza0cS8vcC/r6qrpI+Kg4J5c3F3f3l5eHRwb2twdXVzbWptbW9sbmxuam1sbG1ubGpqbG1ubWxsbG1ubGpqa2xua2tqa2xtbGxsbW1tbGxsbGxsbGxsbW1sa2tsbm5tbGxsbm9vbWxtbW5vbm5ubm5ubm9vb25vb29vb29vb3BwcHBwcHBwcHBwcHBwcA=="
      );
    }

    const q = query(
      collection(db, "cafes", cafeId, "waiter_calls"),
      where("status", "==", "active")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeCalls = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as WaiterCall;
      });

      // Sort in memory to avoid needing a composite index
      activeCalls.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const currentIds = new Set(activeCalls.map((c) => c.id));
      const hasNewCall = activeCalls.some((c) => !prevCallIds.current.has(c.id));
      const isMuted = typeof window !== "undefined" && localStorage.getItem("cafe_qr_muted") === "true";
      
      if (hasNewCall && !isMuted) {
        audioRef.current?.play().catch(() => {});
      }
      prevCallIds.current = currentIds;

      setCalls(activeCalls);
    });

    return () => unsubscribe();
  }, [cafeId]);

  return { calls };
}
