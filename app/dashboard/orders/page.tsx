"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrders, Order, DateRange } from "@/hooks/useOrders";
import api from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Package,
  TrendingUp,
  ShoppingBag,
  Timer,
  Volume2,
  VolumeX,
  Search,
  Printer,
  AlertTriangle,
  Flame,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  BellRing,
  ReceiptText,
  List,
  LayoutGrid,
  XCircle,
  RefreshCcw,
  CalendarDays,
  History,
  ArrowLeft,
} from "lucide-react";
import { useWaiterCalls } from "@/hooks/useWaiterCalls";
import { formatDistanceToNow } from "date-fns";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-amber-50/70 border-amber-200/80 hover:bg-amber-50 hover:shadow-amber-100",
    headerColor: "bg-amber-550 bg-amber-500",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Clock,
    button: { label: "Accept Order", className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    warningMinutes: 5,
    warningText: "Urgent",
  },
  accepted: {
    label: "Accepted",
    color: "bg-blue-50/70 border-blue-200/80 hover:bg-blue-50 hover:shadow-blue-100",
    headerColor: "bg-blue-500",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    icon: CheckCircle2,
    button: { label: "Start Preparing", className: "bg-blue-600 hover:bg-blue-700 text-white" },
    warningMinutes: 10,
    warningText: "Delayed",
  },
  preparing: {
    label: "Preparing",
    color: "bg-purple-50/70 border-purple-200/80 hover:bg-purple-50 hover:shadow-purple-100",
    headerColor: "bg-purple-500",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    icon: ChefHat,
    button: { label: "Mark Delivered", className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    warningMinutes: 15,
    warningText: "Slow Cooking",
  },
  delivered: {
    label: "Delivered",
    color: "bg-slate-50/70 border-slate-200/80 hover:bg-slate-50 hover:shadow-slate-100",
    headerColor: "bg-slate-400",
    badge: "bg-slate-100 text-slate-650 border-slate-200",
    icon: Package,
    button: null,
    warningMinutes: 0,
    warningText: "",
  },
};

type Status = keyof typeof STATUS_CONFIG;

function TimeAgo({ date }: { date: Date }) {
  const [timeText, setTimeText] = useState(() => formatDistanceToNow(date, { addSuffix: true }));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeText(formatDistanceToNow(date, { addSuffix: true }));
    }, 30000);

    // keep state in sync when date changes
    setTimeText(formatDistanceToNow(date, { addSuffix: true }));

    return () => clearInterval(interval);
  }, [date]);

  return (
    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
      <Timer size={12} className="text-slate-400" />
      {timeText || "just now"}
    </span>
  );
}


export default function OrdersPage() {
  const { user } = useAuth();

  // --- History mode state ---
  const [historyRange, setHistoryRange] = useState<DateRange | null>(null);
  const [historyLabel, setHistoryLabel] = useState("");
  const [showHistoryPicker, setShowHistoryPicker] = useState(false);
  const [specificDate, setSpecificDate] = useState(""); // YYYY-MM-DD
  const pickerRef = useRef<HTMLDivElement>(null);

  const { orders, loading, isHistoryMode } = useOrders(user?.uid || null, historyRange);
  const [filter, setFilter] = useState("all"); // status filter
  const [timeFilter, setTimeFilter] = useState("all"); // time filter
  const [viewMode, setViewMode] = useState<"kanban" | "compact">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  // cafeId for realtime calls must match Firestore path: cafes/{cafeId}/waiter_calls
  // Current auth UID is NOT necessarily the cafeId.
  const [cafeId, setCafeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadCafeId = async () => {
      try {
        const res = await api.get("/cafe/profile");
        const id = res?.data?.id;
        if (!cancelled) setCafeId(id || null);
      } catch {
        if (!cancelled) setCafeId(null);
      }
    };
    if (user?.uid) loadCafeId();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const { calls } = useWaiterCalls(cafeId);



  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowHistoryPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const applyHistoryRange = (start: Date, end: Date, label: string) => {
    setHistoryRange({ start, end });
    setHistoryLabel(label);
    setShowHistoryPicker(false);
    setTimeFilter("all");
    setFilter("all");
  };

  const goLive = () => {
    setHistoryRange(null);
    setHistoryLabel("");
    setShowHistoryPicker(false);
    setSpecificDate("");
  };

  const handleLast7Days = () => {
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
    applyHistoryRange(start, end, "Last 7 Days");
  };

  const handleLast30Days = () => {
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const start = new Date(); start.setDate(start.getDate() - 29); start.setHours(0, 0, 0, 0);
    applyHistoryRange(start, end, "Last 30 Days");
  };

  const handleSpecificDate = (dateStr: string) => {
    if (!dateStr) return;
    const [y, m, d] = dateStr.split("-").map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end = new Date(y, m - 1, d, 23, 59, 59, 999);
    const label = start.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    applyHistoryRange(start, end, label);
  };
  
  // Sound controls
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("cafe_qr_muted") === "true";
    } catch {
      return false;
    }
  });

  
  // Collapsed columns control
  const [collapsedCols, setCollapsedCols] = useState<Record<Status, boolean>>({
    pending: false,
    accepted: false,
    preparing: false,
    delivered: false,
  });

  // Load configuration from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMuted = localStorage.getItem("cafe_qr_muted") === "true";
      // avoid direct setState in effect body (eslint react-hooks/set-state-in-effect)
      queueMicrotask(() => setMuted(isMuted));
    }
  }, []);


  const toggleMute = () => {
    const newVal = !muted;
    setMuted(newVal);
    localStorage.setItem("cafe_qr_muted", newVal ? "true" : "false");
    toast.info(newVal ? "Audio notifications muted" : "Audio notifications enabled");
  };

  const handleResolveCall = async (callId: string) => {
    try {
      await api.patch(`/sessions/call/${callId}/resolve`);
      toast.success("Call marked as resolved");
    } catch {
      toast.error("Failed to resolve call");
    }
  };

  // Delayed-order reminder loop: first alert at 10 min, then every 5 min
  useEffect(() => {
    if (orders.length === 0 || muted) return;
    const interval = setInterval(() => {
      const delayedOrders = orders.filter(o => {
        if (o.status === 'delivered' || o.status === 'cancelled' as any) return false;
        const elapsedMins = Math.floor((new Date().getTime() - o.createdAt.getTime()) / 60000);
        // First alert at exactly 10 min, then repeat every 5 min (15, 20, 25…)
        return elapsedMins >= 10 && (elapsedMins === 10 || (elapsedMins - 10) % 5 === 0);
      });
      if (delayedOrders.length > 0) {
        const tableNames = Array.from(
          new Set(delayedOrders.map(o => `Table ${o.tableNumber}`))
        ).join(", ");
        toast.error(`⚠️ ACTION REQUIRED: ${tableNames} ${delayedOrders.length === 1 ? 'has a' : 'have'} delayed order${delayedOrders.length > 1 ? 's' : ''}!`, {
          style: { background: '#ef4444', color: 'white', border: 'none', fontWeight: 'bold' },
          duration: 10000
        });
        const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJiVkHRVTVuJgoN9YVFTcXh8d2dYUl5na29pXldZXmlubW1nYVtfZ3B0cW5oYl1hanbk7OXQ2tza0cS8vcC/r6qrpI+Kg4J5c3F3f3l5eHRwb2twdXVzbWptbW9sbmxuam1sbG1ubGpqbG1ubWxsbG1ubGpqa2xua2tqa2xtbGxsbW1tbGxsbGxsbGxsbW1sa2tsbm5tbGxsbm9vbWxtbW5vbm5ubm5ubm9vb25vb29vb29vb3BwcHBwcHBwcHBwcHBwcA==");
        audio.play().catch(()=>{});
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [orders, muted]);

  const toggleColumn = (status: Status) => {
    setCollapsedCols((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  const handleAdvanceStatus = async (orderId: string, currentStatus: string) => {
    if (updatingOrderId) return;
    setUpdatingOrderId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`);
      toast.success(`Order status updated successfully`);
      if (selectedOrder?.id === orderId) {
        // Sync selected order display in modal if open
        const statusOrder = { ...STATUS_CONFIG };
        const statuses = ["pending", "accepted", "preparing", "delivered"];
        const nextIdx = statuses.indexOf(currentStatus) + 1;
        if (nextIdx < statuses.length) {
          setSelectedOrder((prev) => prev ? { ...prev, status: statuses[nextIdx] as any } : null);
        } else {
          setSelectedOrder(null);
        }
      }
    } catch {
      toast.error("Failed to update order status");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrder(true);
    try {
      await api.patch(`/orders/${orderId}/cancel`);
      toast.success("Order cancelled and amount removed from table bill.");
      setConfirmCancelId(null);
      setSelectedOrder(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to cancel order");
    } finally {
      setCancellingOrder(false);
    }
  };

  const handlePrintKOT = (order: Order) => {
    const escapeHtml = (str: any) =>
     String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocker prevented printing. Please allow popups.");
      return;
    }

    const orderTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const itemsHtml = order.items
      .map(
        (item) => `<tr>
        <td style="padding:2px 0;font-size:11px;">${escapeHtml(item.name)}</td>
        <td style="padding:2px 0;text-align:center;font-size:11px;">${escapeHtml(item.quantity)}</td>
        <td style="padding:2px 0;text-align:right;font-size:11px;">${Number(item.price).toFixed(0)}</td>
        <td style="padding:2px 0;text-align:right;font-size:11px;font-weight:bold;">${(Number(item.price) * Number(item.quantity)).toFixed(0)}</td>
      </tr>`
      )
      .join("");

    printWindow.document.write(`<html><head><title>KOT</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',monospace;padding:4px;width:48mm;color:#000;font-size:11px;line-height:1.3}
.hdr{text-align:center;border-bottom:1px dashed #000;padding-bottom:4px;margin-bottom:4px}
.hdr .t{font-size:13px;font-weight:900;letter-spacing:1px}
.hdr .tbl{font-size:22px;font-weight:900;margin:2px 0}
.det{font-size:10px;margin-bottom:4px}
table{width:100%;border-collapse:collapse}
th{font-size:9px;padding-bottom:2px;border-bottom:1px solid #000}
.tot{border-top:1px dashed #000;padding-top:3px;margin-top:3px;display:flex;justify-content:space-between;font-size:13px;font-weight:900}
.nt{background:#eee;padding:3px 4px;font-size:9px;margin-top:4px;border-left:2px solid #000}
.ft{text-align:center;margin-top:6px;font-size:8px;border-top:1px dashed #000;padding-top:4px;color:#555}
@media print{body{width:100%}@page{margin:0}}
</style></head><body>
<div class="hdr">
<div class="t">KOT</div>
<div class="tbl">T-${escapeHtml(order.tableNumber)}</div>
</div>
<div class="det">
#${escapeHtml(order.id.slice(-6).toUpperCase())} | ${order.createdAt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} | ${order.createdAt.toLocaleDateString()}${order.customerName ? `<br><b>${escapeHtml(order.customerName)}</b>` : ''}
</div>
<table>
<thead><tr>
<th style="text-align:left">Item</th>
<th style="text-align:center;width:20px">Qt</th>
<th style="text-align:right;width:30px">Rate</th>
<th style="text-align:right;width:34px">Amt</th>
</tr></thead>
<tbody>${itemsHtml}</tbody>
</table>
<div class="tot"><span>TOTAL</span><span>&#8377;${orderTotal.toFixed(0)}</span></div>
${order.customerNote ? `<div class="nt"><b>NOTE:</b> ${escapeHtml(order.customerNote)}</div>` : ''}
<div class="ft">CafeQR</div>
<script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)};</script>
</body></html>`);
    printWindow.document.close();
  };

  // useOrders already scopes the query to today's orders only (Firebase optimization).
  // No need to re-filter — all orders in the array are from today.
  const todayOrders = orders;

  const revenue = todayOrders.reduce((s: number, o: any) => s + o.totalPrice, 0);
  const pendingCount = orders.filter((o: any) => o.status === "pending").length;

  // Filter orders based on Tab filters, Time, and Search Queries
  const processedOrders = useMemo(() => {
    return orders.filter((order) => {
      // Exclude cancelled entirely from this board
      if (order.status === "cancelled" as any) return false;

      // 1. Tab Status Filter
      if (filter === "pending" && order.status !== "pending") return false;
      if (filter === "active" && !["accepted", "preparing"].includes(order.status)) return false;
      if (filter === "delivered" && order.status !== "delivered") return false;

      // 2. Time Filter (within today's orders from the hook)
      const elapsedMs = new Date().getTime() - order.createdAt.getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60);
      if (timeFilter === "1h" && elapsedHours > 1) return false;
      if (timeFilter === "5h" && elapsedHours > 5) return false;
      // "today" and "all" are effectively the same now — all orders are today's

      // 3. Search Query Filter (Table number or Item Name)
      if (searchQuery.trim() !== "") {
        const queryClean = searchQuery.toLowerCase();
        const matchesTable = `table ${order.tableNumber}`.includes(queryClean) || String(order.tableNumber) === queryClean;
        const matchesItems = order.items.some((item) =>
          item.name.toLowerCase().includes(queryClean)
        );
        return matchesTable || matchesItems;
      }

      return true;
    });
  }, [orders, filter, timeFilter, searchQuery]);

  const getFilteredByStatus = (status: Status) => {
    return processedOrders.filter((o) => o.status === status);
  };

  const selectedOrderBill = useMemo(() => {
    if (!selectedOrder) return null;

    const linkedSessionId = (selectedOrder as any).sessionId;
    const linkedOrders = linkedSessionId
      ? orders.filter((order: any) => order.sessionId === linkedSessionId && order.status !== "cancelled")
      : [selectedOrder];
    const billItems = linkedOrders.flatMap((order: any) =>
      order.items.map((item: any) => ({
        ...item,
        sourceOrderId: order.id,
      }))
    );
    const billTotal = linkedOrders.reduce((sum: number, order: any) => {
      return sum + order.items.reduce((itemSum: number, item: any) => itemSum + (Number(item.price) * Number(item.quantity)), 0);
    }, 0);
    const mostRecentOrder = linkedOrders[0] || selectedOrder;

    return { linkedOrders, billItems, billTotal, mostRecentOrder };
  }, [selectedOrder, orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Order Board</h1>
          <p className="text-slate-500 text-xs font-medium">
            {isHistoryMode ? `Viewing history: ${historyLabel}` : "Manage and track customer table orders in real-time"}
          </p>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap justify-end">
          {/* History Picker Button */}
          <div className="relative" ref={pickerRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistoryPicker((v) => !v)}
              className={`rounded-xl border-slate-200 shadow-sm gap-2 text-xs font-semibold h-9 px-3 ${
                isHistoryMode
                  ? "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100"
                  : "text-slate-600 bg-white hover:bg-slate-50"
              }`}
            >
              <CalendarDays size={15} />
              {isHistoryMode ? historyLabel : "History"}
            </Button>

            {showHistoryPicker && (
              <div className="absolute right-0 top-11 z-50 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Browse History</p>

                <button
                  onClick={handleLast7Days}
                  className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                >
                  <History size={14} className="text-violet-500" /> Last 7 Days
                </button>

                <button
                  onClick={handleLast30Days}
                  className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                >
                  <History size={14} className="text-violet-500" /> Last 30 Days
                </button>

                <div className="border-t border-slate-100 pt-2 mt-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pick a Date</p>
                  <input
                    type="date"
                    value={specificDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => {
                      setSpecificDate(e.target.value);
                      handleSpecificDate(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium py-2 px-3 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            )}
          </div>

          {isHistoryMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={goLive}
              className="rounded-xl border-slate-200 shadow-sm gap-2 text-xs font-semibold h-9 px-3 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
            >
              <ArrowLeft size={15} /> Back to Live
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={toggleMute}
            className="rounded-xl border-slate-200 shadow-sm gap-2 text-xs font-semibold h-9 px-3 text-slate-600 bg-white hover:bg-slate-50"
            aria-label={muted ? "Unmute notifications" : "Mute notifications"}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}

      {/* Waiter/Bill Calls (customers call waiter / request bill) */}
      {calls.length > 0 && (
        <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BellRing size={16} className="text-amber-500" />
              <p className="text-sm font-black text-slate-800">Customer Requests</p>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">{calls.length} active</Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {calls.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                <Badge className="bg-amber-100 text-amber-800 border-amber-200" variant="secondary">
                  Table {c.tableNumber}
                </Badge>
                <p className="text-xs font-bold text-amber-800">
                  {c.type === "bill" ? "Request Bill" : "Call Waiter"}
                </p>
                <p
                  className={`text-[11px] font-semibold ${
                    Math.max(0, Math.floor((Date.now() - (c.createdAt?.getTime?.() || 0)) / 60000)) < 2
                      ? "text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-full"
                      : "text-amber-700/90"
                  }`}
                >
                  {Math.max(0, Math.floor((Date.now() - (c.createdAt?.getTime?.() || 0)) / 60000))}m ago
                </p>



                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-lg text-xs font-bold border-amber-200 text-amber-700 bg-white hover:bg-amber-100"
                  onClick={() => handleResolveCall(c.id)}
                >
                  Resolve
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
            <ShoppingBag size={18} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Orders</p>
            <p className="text-lg font-black text-slate-800 leading-none mt-1">{todayOrders.length}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shadow-inner">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Revenue</p>
            <p className="text-lg font-black text-slate-800 leading-none mt-1">₹{revenue.toFixed(0)}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-inner">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending Orders</p>
            <p className="text-lg font-black text-slate-800 leading-none mt-1">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex-wrap">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Table # or Item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-400 font-medium"
          />
        </div>

        {/* Time Filters — only shown in live mode */}
        {!isHistoryMode && (
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold py-1.5 px-3 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Today</option>
            <option value="5h">Last 5 Hours</option>
            <option value="1h">Last 1 Hour</option>
          </select>
        )}

        {/* Tab Filters */}
        <div className="w-full sm:w-auto">
          <Tabs value={filter} onValueChange={setFilter} className="w-full">
            <TabsList className="bg-slate-100 rounded-xl p-1 gap-1 w-full justify-between sm:justify-start">
              <TabsTrigger value="all" className="rounded-lg text-xs font-semibold py-1.5 px-3">All Status</TabsTrigger>
              <TabsTrigger value="pending" className="rounded-lg text-xs font-semibold py-1.5 px-3">Pending</TabsTrigger>
              <TabsTrigger value="active" className="rounded-lg text-xs font-semibold py-1.5 px-3">Active</TabsTrigger>
              <TabsTrigger value="delivered" className="rounded-lg text-xs font-semibold py-1.5 px-3">Delivered</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* View Mode Toggle */}
        <div className="ml-auto flex items-center bg-slate-100 p-1 rounded-xl gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-7 px-2 rounded-lg ${viewMode === 'kanban' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid size={14} className="mr-1" /> Kanban
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-7 px-2 rounded-lg ${viewMode === 'compact' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setViewMode('compact')}
          >
            <List size={14} className="mr-1" /> Compact
          </Button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-stretch select-none">
        {(["pending", "accepted", "preparing", "delivered"] as Status[]).map((status) => {
          const config = STATUS_CONFIG[status];
          const isCollapsed = collapsedCols[status];
          const list = getFilteredByStatus(status);
          const Icon = config.icon;

          if (isCollapsed) {
            return (
              <div
                key={status}
                onClick={() => toggleColumn(status)}
                className="w-12 bg-slate-100 border border-slate-200/80 hover:bg-slate-200/50 rounded-2xl flex flex-col items-center py-4 cursor-pointer transition-all duration-200 group flex-shrink-0"
              >
                <button className="text-slate-450 hover:text-slate-700 mb-4" aria-label={`Expand ${config.label} column`}>
                  <ChevronRight size={16} />
                </button>
                <div className={`${config.headerColor} text-white w-6 h-6 rounded-full flex items-center justify-center shadow mb-6`}>
                  <Icon size={12} />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <span className="writing-mode-vertical text-slate-500 font-bold text-xs uppercase tracking-widest origin-center rotate-180">
                    {config.label}
                  </span>
                </div>
                <Badge className="mt-4 bg-slate-300 text-slate-700 text-[10px] w-6 h-6 p-0 flex items-center justify-center rounded-full font-black border-2 border-slate-100 group-hover:bg-slate-400 group-hover:text-white transition-colors">
                  {list.length}
                </Badge>
              </div>
            );
          }

          return (
            <div key={status} className="flex-1 min-w-[280px] max-w-sm flex flex-col flex-shrink-0 bg-slate-100/50 rounded-2xl border border-slate-200/50">
              {/* Column Header */}
              <div className={`${config.headerColor} text-white rounded-t-2xl px-4 py-3 flex items-center gap-2 shadow-sm`}>
                <Icon size={16} />
                <span className="font-bold text-sm tracking-tight">{config.label}</span>
                <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white/10">
                  {list.length}
                </span>

                <button
                  onClick={() => toggleColumn(status)}
                  className="ml-auto hover:bg-white/15 text-white/80 hover:text-white p-1 rounded transition-colors"
                  aria-label={`Collapse ${config.label} column`}
                >
                  <ChevronLeft size={16} />
                </button>
              </div>

              {/* Column Cards List */}
              <div className="flex-1 min-h-[350px] p-3 overflow-y-auto max-h-[calc(100vh-290px)] space-y-3 scrollbar-thin">
                {list.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <p className="text-slate-400 text-xs font-semibold">No orders</p>
                  </div>
                ) : (
                  list.map((order) => {
                    const elapsedMs = new Date().getTime() - order.createdAt.getTime();
                    const elapsedMins = Math.floor(elapsedMs / 60000);
                    const isLate = config.warningMinutes > 0 && elapsedMins >= config.warningMinutes;

                    if (viewMode === "compact") {
                      return (
                        <div
                          key={order.id}
                          className={`border bg-white rounded-xl p-2.5 shadow-sm hover:shadow-md transition-all duration-200 border-slate-100 flex items-center justify-between gap-3 group cursor-pointer ${
                            isLate ? "border-l-4 border-l-red-500 bg-red-50/20" : ""
                          }`}
                          onClick={() => setSelectedOrder(order)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-black text-sm text-slate-800 whitespace-nowrap">T-{order.tableNumber}</span>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-500 font-bold truncate max-w-[100px]">
                                {order.items.length} items • ₹{order.totalPrice}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {elapsedMins}m ago
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {config.button && (
                              <Button
                                size="sm"
                                disabled={updatingOrderId === order.id}
                                className={`h-6 text-[9px] px-2 font-bold rounded-lg ${config.button.className}`}
                                onClick={(e) => { e.stopPropagation(); handleAdvanceStatus(order.id, order.status); }}
                              >
                                {updatingOrderId === order.id ? <RefreshCcw className="w-3 h-3 animate-spin" /> : (status === 'pending' ? 'Accept' : status === 'accepted' ? 'Cook' : 'Deliver')}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={order.id}
                        className={`border bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border-slate-100 relative group cursor-pointer ${
                          isLate ? "border-l-4 border-l-red-500 animate-pulse border-red-100 bg-red-50/20" : ""
                        }`}
                      >
                        {/* Upper Bar */}
                        <div className="flex items-start justify-between mb-2">
                          <div onClick={() => setSelectedOrder(order)}>
                            <div className="text-lg font-black text-slate-850 leading-tight">
                              Table {order.tableNumber}
                            </div>
                            <TimeAgo date={order.createdAt} />
                          </div>
                          
                          <div className="text-right">
                            <div className="font-extrabold text-sm text-slate-800">
                              ₹{order.totalPrice.toFixed(0)}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">
                              #{order.id.slice(-4).toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Order Items List Preview */}
                        <div className="space-y-1 my-3 border-t border-b border-slate-100/60 py-2" onClick={() => setSelectedOrder(order)}>
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-xs font-medium">
                              <span className="text-slate-700 truncate max-w-[150px]">{item.name}</span>
                              <span className="text-slate-400 font-bold">×{item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        {/* Customer note preview */}
                        {order.customerName && (
                          <div
                            onClick={() => setSelectedOrder(order)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 rounded-lg px-2 py-1 mb-2"
                          >
                            <span className="text-slate-400">👤</span> {order.customerName}
                          </div>
                        )}
                        {order.customerNote && (
                          <div
                            onClick={() => setSelectedOrder(order)}
                            className="bg-amber-50/70 border border-amber-100/60 rounded-xl p-2 mb-3 text-[10px] text-amber-800 font-semibold italic truncate"
                          >
                            📝 {order.customerNote}
                          </div>
                        )}

                        {/* Order Ageing Alert Indicator */}
                        {isLate && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1 mb-3">
                            <AlertTriangle size={12} className="animate-bounce" />
                            <span>{config.warningText} ({elapsedMins}m waiting)</span>
                          </div>
                        )}

                        {/* Bottom Actions Row */}
                        <div className="flex items-center gap-1">
                          {config.button && (
                            <Button
                              size="sm"
                              disabled={updatingOrderId === order.id}
                              className={`flex-1 text-[11px] font-bold h-8 rounded-xl shadow-sm ${config.button.className}`}
                              onClick={(e) => { e.stopPropagation(); handleAdvanceStatus(order.id, order.status); }}
                            >
                              {updatingOrderId === order.id ? <><RefreshCcw className="w-3 h-3 mr-1 animate-spin" /> Updating...</> : config.button.label}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
                            onClick={() => setSelectedOrder(order)}
                            aria-label="View order details"
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
                            onClick={() => handlePrintKOT(order)}
                            aria-label="Print KOT receipt"
                          >
                            <Printer size={14} />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!confirmCancelId} onOpenChange={(open) => !open && setConfirmCancelId(null)}>
        <DialogContent showCloseButton={false} className="w-[95vw] max-w-sm p-0 overflow-hidden gap-0 rounded-2xl">
          <div className="p-6">
            {/* Icon + title */}
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900">Cancel This Order?</DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  This will permanently cancel the order and{" "}
                  <span className="font-bold text-red-600">deduct the amount from the table's bill</span>.
                  This cannot be undone.
                </DialogDescription>
              </div>
            </div>
            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmCancelId(null)}
                className="flex-1 h-11 rounded-xl font-bold border-slate-200 text-sm"
              >
                Keep Order
              </Button>
              <Button
                disabled={cancellingOrder}
                onClick={() => confirmCancelId && handleCancelOrder(confirmCancelId)}
                className="flex-1 h-11 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 text-sm active:scale-[0.98] transition-all"
              >
                {cancellingOrder ? (
                  <><RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> Cancelling...</>
                ) : (
                  <><XCircle className="w-4 h-4 mr-2" /> Yes, Cancel</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent showCloseButton={false} className="w-[95vw] max-w-xl p-0 overflow-hidden gap-0 rounded-2xl">
          {selectedOrder && selectedOrderBill ? (
            <div className="flex flex-col max-h-[85vh]">
              <div className="relative px-6 pt-10 pb-4 border-b border-slate-100 flex-shrink-0">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <XCircle size={14} className="text-slate-500" />
                </button>
                <div className="flex items-start justify-between pr-8">
                  <div className="min-w-0">
                    <DialogTitle className="text-xl font-black text-slate-900">Order Details</DialogTitle>
                    <DialogDescription className="text-sm text-slate-400 font-medium mt-0.5">
                      {selectedOrderBill.linkedOrders.length > 1
                        ? `Linked bill for Table ${selectedOrder.tableNumber}`
                        : `Order #${selectedOrder.id.slice(-6).toUpperCase()}`}
                    </DialogDescription>
                  </div>
                  <Badge className={`border-none px-3 py-1 text-xs font-bold ${STATUS_CONFIG[selectedOrder.status as Status].badge}`}>
                    Table {selectedOrder.tableNumber}
                  </Badge>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 bg-slate-50/60 space-y-5">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bill Total</p>
                    <p className="font-black text-emerald-600 text-base">₹{selectedOrderBill.billTotal.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</p>
                    <p className="font-bold text-slate-800 text-sm">{selectedOrderBill.mostRecentOrder.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Waiting</p>
                    <p className="font-bold text-slate-800 text-sm">{Math.floor((new Date().getTime() - selectedOrderBill.mostRecentOrder.createdAt.getTime()) / 60000)} mins</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                    <p className="font-bold text-slate-800 text-sm truncate">{selectedOrderBill.mostRecentOrder.customerName ? `👤 ${selectedOrderBill.mostRecentOrder.customerName}` : "Walk-in"}</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Items Ordered</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-400 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Item</th>
                          <th className="px-5 py-3 font-semibold text-center w-24">Qty</th>
                          <th className="px-5 py-3 font-semibold text-center w-24">Rate</th>
                          <th className="px-5 py-3 font-semibold text-right w-28">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedOrderBill.billItems.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3.5 font-semibold text-slate-700">{item.name}</td>
                            <td className="px-5 py-3.5 font-bold text-slate-500 text-center">×{item.quantity}</td>
                            <td className="px-5 py-3.5 text-slate-400 text-xs text-center">₹{item.price}</td>
                            <td className="px-5 py-3.5 font-bold text-slate-800 text-right">₹{(item.price * item.quantity).toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-slate-200 px-5 py-4 bg-slate-50 flex justify-between items-center">
                    <span className="text-sm font-black text-slate-900 uppercase tracking-wide">Total Amount</span>
                    <span className="text-2xl font-black text-emerald-600">₹{selectedOrderBill.billTotal.toFixed(0)}</span>
                  </div>
                </div>

                {selectedOrderBill.mostRecentOrder.customerNote && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
                    <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1.5">Customer Note</p>
                    <p className="text-sm text-amber-900 italic">"{selectedOrderBill.mostRecentOrder.customerNote}"</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-5 border-t border-slate-100 bg-white flex-shrink-0 flex flex-col gap-3">
                {STATUS_CONFIG[selectedOrder.status as Status]?.button && (
                  <Button
                    onClick={() => handleAdvanceStatus(selectedOrder.id, selectedOrder.status)}
                    className={`w-full h-12 rounded-xl text-sm font-bold shadow-sm ${
                      STATUS_CONFIG[selectedOrder.status as Status].button?.className
                    }`}
                  >
                    {STATUS_CONFIG[selectedOrder.status as Status].button?.label}
                  </Button>
                )}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handlePrintKOT(selectedOrder)}
                    className="flex-1 h-12 rounded-xl text-sm font-semibold gap-2 border-slate-200 hover:bg-slate-50 bg-white"
                  >
                    <Printer size={16} /> Print KOT
                  </Button>
                  {selectedOrder.status !== "delivered" && (
                    <Button
                      variant="outline"
                      onClick={() => { setConfirmCancelId(selectedOrder.id); }}
                      className="flex-1 h-12 rounded-xl text-sm font-bold gap-2 border-red-200 text-red-600 hover:bg-red-50 bg-white"
                    >
                      <XCircle size={16} /> Cancel Order
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
