"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";

export interface TableSession {
  id: string;
  tableNumber: number;
  status: "active" | "completed";
  createdAt: Date;
  completedAt?: Date;
  totalAmount: number;
}

export function useSessions(cafeId: string | null) {
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cafeId) return;

    const q = query(
      collection(db, "cafes", cafeId, "table_sessions"),
      where("status", "==", "active")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeSessions = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate(),
        } as TableSession;
      });

      setSessions(activeSessions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [cafeId]);

  return { sessions, loading };
}
