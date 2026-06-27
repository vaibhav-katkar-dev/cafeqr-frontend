"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSessions, TableSession } from "@/hooks/useSessions";
import { useOrders } from "@/hooks/useOrders";
import { useMenu, MenuItem } from "@/hooks/useMenu";
import api from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Receipt,
  RefreshCcw,
  Plus,
  QrCode,
  Download,
  X,
  Smartphone,
  Merge,
  ArrowRight,
  Clock,
  Users,
  TrendingUp,
  IndianRupee,
  ChefHat,
  Package,
  AlertTriangle,
  CheckCircle2,
  Table2,
  BarChart3,
  Timer,
  ShoppingBag,
  Trash2,
  PlusCircle,
  MinusCircle,
  Printer,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QRData {
  table: number;
  url: string;
  dataUrl: string;
}

function formatDuration(startDate: Date): string {
  const ms = new Date().getTime() - startDate.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function LiveTimer({ startDate }: { startDate: Date }) {
  const [label, setLabel] = useState(formatDuration(startDate));
  useEffect(() => {
    const id = setInterval(() => setLabel(formatDuration(startDate)), 30000);
    return () => clearInterval(id);
  }, [startDate]);
  return <span>{label}</span>;
}

export default function TablesPage() {
  const { user } = useAuth();
  const { sessions, loading: sessionsLoading } = useSessions(user?.uid || null);
  const { orders } = useOrders(user?.uid || null);
  const [tableCount, setTableCount] = useState(0);
  const [qrCodes, setQrCodes] = useState<QRData[]>([]);
  const [cafeName, setCafeName] = useState("My Cafe");
  const [loadingTables, setLoadingTables] = useState(true);

  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  
  // Safety Rules states
  const [settlingIds, setSettlingIds] = useState<Set<string>>(new Set());
  const [isSettlingAll, setIsSettlingAll] = useState(false);
  const [personPickerOpen, setPersonPickerOpen] = useState(false);
  const [selectedSessionIdForAdd, setSelectedSessionIdForAdd] = useState<string>("");

  const [qrModal, setQrModal] = useState<QRData | null>(null);

  // Add Item to Bill state
  const { items: menuItems } = useMenu();
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [itemsToAdd, setItemsToAdd] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [addingItems, setAddingItems] = useState(false);

  // Merge bills state
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [merging, setMerging] = useState(false);

  const [addingTable, setAddingTable] = useState(false);

  // Live clock tick for duration display
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (user) {
      api.get("/tables/qr")
        .then((res) => {
          setTableCount(res.data.tableCount || 0);
          setQrCodes(res.data.qrCodes || []);
          if (res.data.cafeName) setCafeName(res.data.cafeName);
          setLoadingTables(false);
        })
        .catch(() => setLoadingTables(false));
    }
  }, [user]);

  const getSessionOrders = useCallback((sessionId: string) => {
    return orders.filter((o: any) => o.sessionId === sessionId && o.status !== "cancelled");
  }, [orders]);

  const getSessionTotal = useCallback((sessionId: string) => {
    return getSessionOrders(sessionId).reduce((sum, order) => {
      return sum + order.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
    }, 0);
  }, [getSessionOrders]);

  const handleCheckoutSingle = async (sessionId: string, personLabel: string) => {
    if (settlingIds.has(sessionId) || isSettlingAll) return;

    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.status !== "active") {
      toast.error("Session already checked out or invalid.");
      return;
    }

    const sessOrders = getSessionOrders(sessionId);
    const pending = sessOrders.filter((o: any) => ["pending", "accepted", "preparing"].includes(o.status));
    
    if (pending.length > 0) {
      if (!window.confirm(`${personLabel} has ${pending.length} orders still being prepared. Settle anyway?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to settle ${personLabel}?`)) return;
    }

    try {
      setSettlingIds(prev => new Set(prev).add(sessionId));
      await api.patch(`/sessions/${sessionId}/checkout`);
      toast.success(`${personLabel} settled!`);
    } catch (err: any) {
      toast.error(`Failed to settle ${personLabel}`);
    } finally {
      setSettlingIds(prev => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  };

  const handleCheckoutAll = async (tableSessions: TableSession[]) => {
    if (isSettlingAll || settlingIds.size > 0) return;

    let totalPending = 0;
    for (const session of tableSessions) {
      const sessOrders = getSessionOrders(session.id);
      const pending = sessOrders.filter((o: any) => ["pending", "accepted", "preparing"].includes(o.status));
      totalPending += pending.length;
    }

    if (totalPending > 0) {
      if (!window.confirm(`This table has ${totalPending} orders still being prepared. Settle everyone anyway?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to settle ALL persons at Table ${selectedTable}?`)) return;
    }

    setIsSettlingAll(true);
    let hasError = false;

    for (let i = 0; i < tableSessions.length; i++) {
      const session = tableSessions[i];
      const personLabel = `Person ${i + 1}`;
      try {
        setSettlingIds(prev => new Set(prev).add(session.id));
        await api.patch(`/sessions/${session.id}/checkout`);
        toast.success(`${personLabel} settled!`);
      } catch (err: any) {
        toast.error(`Failed to settle ${personLabel}. Stopping.`);
        hasError = true;
        break;
      } finally {
        setSettlingIds(prev => {
          const next = new Set(prev);
          next.delete(session.id);
          return next;
        });
      }
    }

    setIsSettlingAll(false);
    if (!hasError) {
      setSelectedTable(null);
    }
  };

  const handlePrintBill = (tableNumber: number) => {
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

    const tableOrders = orders.filter((order: any) => order.tableNumber === tableNumber && order.status !== "cancelled");
    const activeSessions = sessions.filter(s => s.tableNumber === tableNumber && s.status === "active");
    const activeSessionIds = activeSessions.map(s => s.id);

    const currentSessionOrders = tableOrders.filter((order: any) => activeSessionIds.includes(order.sessionId));

    const renderOrderRows = (sessionGroup: any[]) =>
      sessionGroup.flatMap((order) =>
        order.items.map((item: any) => `<tr>
          <td style="padding:2px 0;font-size:11px;">${escapeHtml(item.name)}</td>
          <td style="padding:2px 0;text-align:center;font-size:11px;">${escapeHtml(item.quantity)}</td>
          <td style="padding:2px 0;text-align:right;font-size:11px;">${Number(item.price).toFixed(0)}</td>
          <td style="padding:2px 0;text-align:right;font-size:11px;font-weight:bold;">${(Number(item.price) * Number(item.quantity)).toFixed(0)}</td>
        </tr>`)
      ).join("");

    const billTotal = currentSessionOrders.reduce((sum: number, order: any) => {
      return sum + order.items.reduce((itemSum: number, item: any) => itemSum + (Number(item.price) * Number(item.quantity)), 0);
    }, 0);

    const pendingCount = currentSessionOrders.filter((order) => ["pending", "accepted", "preparing"].includes(order.status)).length;

    printWindow.document.write(`<html><head><title>Bill</title>
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
<div class="t">BILL</div>
<div class="tbl">T-${escapeHtml(tableNumber)}</div>
</div>
<div class="det">
${new Date().toLocaleDateString()} | ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
</div>
<table>
<thead><tr>
<th style="text-align:left">Item</th>
<th style="text-align:center;width:20px">Qt</th>
<th style="text-align:right;width:30px">Rate</th>
<th style="text-align:right;width:34px">Amt</th>
</tr></thead>
<tbody>${renderOrderRows(currentSessionOrders)}</tbody>
</table>
<div class="tot"><span>TOTAL</span><span>&#8377;${billTotal.toFixed(0)}</span></div>
${pendingCount > 0 ? `<div class="nt"><b>NOTE:</b> ${escapeHtml(pendingCount)} order${pendingCount > 1 ? "s" : ""} still in progress</div>` : ""}
<div class="ft">CafeQR</div>
<script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)};</script>
</body></html>`);
    printWindow.document.close();
  };

  const handleMergeSessions = async () => {
    if (!mergeSourceId || !mergeTargetId) {
      toast.error("Please select both source and target tables.");
      return;
    }
    if (mergeSourceId === mergeTargetId) {
      toast.error("Source and target tables must be different.");
      return;
    }
    setMerging(true);
    try {
      await api.post("/sessions/merge", {
        sourceSessionId: mergeSourceId,
        targetSessionId: mergeTargetId,
      });
      const sourceTable = sessions.find((s) => s.id === mergeSourceId);
      const targetTable = sessions.find((s) => s.id === mergeTargetId);
      toast.success(`Table ${sourceTable?.tableNumber} merged into Table ${targetTable?.tableNumber}!`);
      setMergeModalOpen(false);
      setMergeSourceId("");
      setMergeTargetId("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to merge tables.");
    } finally {
      setMerging(false);
    }
  };

  const handleRemoveItem = async (orderId: string, currentItems: any[], itemIndexToRemove: number) => {
    if (!window.confirm("Remove this item from the bill?")) return;
    try {
      const newItems = currentItems
        .filter((_: any, i: number) => i !== itemIndexToRemove)
        .map((it: any) => ({
          itemId: it.itemId,
          name: it.name,
          price: Number(it.price),
          quantity: Number(it.quantity),
        }));

      await api.patch(`/orders/${orderId}/items`, { items: newItems });
      toast.success("Item removed from bill");
    } catch (err: any) {
      console.error("Remove item error:", err);
      toast.error(err?.message || "Failed to remove item");
    }
  };

  const handleAddItemsSubmit = async () => {
    if (!selectedSessionIdForAdd || itemsToAdd.length === 0) return;
    
    const stillActive = sessions.find(s => s.id === selectedSessionIdForAdd && s.status === 'active');
    if (!stillActive) {
      toast.error("This person already checked out. Please refresh.");
      return;
    }

    setAddingItems(true);
    try {
      const formattedItems = itemsToAdd.map(i => ({
        itemId: i.item.id,
        name: i.item.name,
        price: Number(i.item.price),
        quantity: Number(i.quantity),
      }));

      await api.post("/orders/manager", {
        sessionId: selectedSessionIdForAdd,
        tableNumber: selectedTable,
        items: formattedItems
      });

      toast.success(`${itemsToAdd.reduce((s, i) => s + i.quantity, 0)} item(s) added to bill!`);
      setAddItemModalOpen(false);
      setItemsToAdd([]);
    } catch (err: any) {
      console.error("Add items error:", err);
      toast.error(err?.message || "Failed to add items to bill");
    } finally {
      setAddingItems(false);
    }
  };

  const handleAddTable = async () => {
    if (!window.confirm(`Are you sure you want to add Table ${tableCount + 1}?`)) return;
    try {
      setAddingTable(true);
      const newCount = tableCount + 1;
      const res = await api.post("/tables/setup", { tableCount: newCount });
      setTableCount(newCount);
      setQrCodes(res.data.qrCodes || []);
      toast.success(`Table ${newCount} added! QR code generated.`);
    } catch {
      toast.error("Failed to add table");
    } finally {
      setAddingTable(false);
    }
  };

  const handleDownloadQR = (qr: QRData) => {
    const canvas = document.createElement("canvas");
    const W = 520, H = 680;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e3a5f");
    ctx.fillStyle = grad;
    ctx.roundRect(0, 0, W, H, 32);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-30, -30, 140, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(W + 30, H + 30, 160, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(16, 185, 129, 0.06)";
    ctx.fill();
    const barGrad = ctx.createLinearGradient(0, 0, W, 0);
    barGrad.addColorStop(0, "#10b981");
    barGrad.addColorStop(1, "#059669");
    ctx.fillStyle = barGrad;
    ctx.roundRect(40, 36, W - 80, 6, 4);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(cafeName.toUpperCase(), W / 2, 96);
    ctx.fillStyle = "#10b981";
    ctx.font = "600 16px system-ui, -apple-system, sans-serif";
    ctx.fillText(`TABLE ${qr.table}`, W / 2, 126);
    const qrSize = 300;
    const qrX = (W - qrSize) / 2;
    const qrY = 152;
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 24;
    ctx.roundRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 20);
    ctx.fill();
    ctx.shadowBlur = 0;
    const img = new Image();
    img.src = qr.dataUrl;
    img.onload = () => {
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, qrY + qrSize + 48);
      ctx.lineTo(W - 60, qrY + qrSize + 48);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Scan & Order", W / 2, qrY + qrSize + 86);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "400 14px system-ui, -apple-system, sans-serif";
      ctx.fillText("No app needed • Instant digital menu", W / 2, qrY + qrSize + 112);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "400 11px system-ui, -apple-system, sans-serif";
      ctx.fillText("Powered by CafeQR", W / 2, H - 24);
      const link = document.createElement("a");
      link.download = `QR_Table_${qr.table}_${cafeName.replace(/\s+/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success(`QR for Table ${qr.table} downloaded!`);
    };
  };

  const tables = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= tableCount; i++) {
      const activeTableSessions = sessions.filter(s => s.tableNumber === i && s.status === 'active');
      const activeSessionIds = activeTableSessions.map(s => s.id);
      const allTableOrders = orders.filter((o: any) => o.tableNumber === i && o.status !== "cancelled");
      
      // Only include orders that belong to an active session, OR have absolutely no session (true orphans)
      const tableOrders = allTableOrders.filter((o: any) => 
        activeSessionIds.includes(o.sessionId) || !o.sessionId
      );
      
      const pendingCount = tableOrders.filter((o: any) => ["pending", "accepted", "preparing"].includes(o.status)).length;
      const deliveredCount = tableOrders.filter((o: any) => o.status === "delivered").length;
      const totalItems = tableOrders.reduce((s: number, o: any) => s + o.items.reduce((n: number, it: any) => n + it.quantity, 0), 0);
      
      const earliestSession = activeTableSessions.sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime())[0] || null;
      const totalTableAmount = activeTableSessions.reduce((sum, s) => sum + (s.totalAmount || 0), 0) + 
        tableOrders.filter(o => !o.sessionId).reduce((sum, o) => sum + o.items.reduce((s: number, it: any) => s + it.price * it.quantity, 0), 0);
        
      const isOccupied = activeTableSessions.length > 0 || tableOrders.filter(o => !o.sessionId).length > 0;
      const qr = qrCodes.find((q) => q.table === i) || null;
      
      arr.push({ 
        number: i, 
        session: earliestSession, 
        isOccupied,
        totalTableAmount,
        activeSessions: activeTableSessions,
        qr, 
        tableOrders, 
        pendingCount, 
        deliveredCount, 
        totalItems 
      });
    }
    return arr;
  }, [tableCount, sessions, qrCodes, orders]);

  // Overall metrics
  const occupiedTables = tables.filter((t) => t.isOccupied).length;
  const freeTables = tables.filter((t) => !t.isOccupied).length;
  const occupancyRate = tableCount > 0 ? Math.round((occupiedTables / tableCount) * 100) : 0;
  const totalLiveRevenue = sessions.reduce((s, sess) => s + (sess.totalAmount || 0), 0);
  const avgBill = occupiedTables > 0 ? totalLiveRevenue / occupiedTables : 0;

  // Today's settled revenue (completed sessions) - from orders
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter((o: any) => o.createdAt >= today);
  const todayRevenue = todayOrders.reduce((s: number, o: any) => s + o.totalPrice, 0);

  if (loadingTables || sessionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Tables & Billing</h1>
          <p className="text-slate-500 text-[11px] sm:text-xs font-medium mt-0.5">
            Live floor view · real-time bills · instant checkout
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setMergeModalOpen(true)}
            disabled={sessions.length < 2}
            size="sm"
            variant="outline"
            className="rounded-xl text-xs font-bold h-8 px-3 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 shadow-sm"
          >
            <Merge className="w-3.5 h-3.5 mr-1" /> Merge Bills
          </Button>
          <Button
            onClick={handleAddTable}
            disabled={addingTable}
            size="sm"
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold h-8 px-3 shadow-sm"
          >
            {addingTable ? <RefreshCcw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            Add Table
          </Button>
        </div>
      </div>

      {/* ── Owner Metrics Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <div className="bg-white border border-slate-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-100 text-slate-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
            <Table2 size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-tight">Total Tables</p>
            <p className="text-lg sm:text-xl font-black text-slate-800 leading-none mt-0.5 sm:mt-1">{tableCount}</p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-100 text-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] text-emerald-600 font-bold uppercase tracking-wider leading-tight">Free Now</p>
            <p className="text-lg sm:text-xl font-black text-emerald-700 leading-none mt-0.5 sm:mt-1">{freeTables}</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-amber-100 text-amber-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
            <Users size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] text-amber-600 font-bold uppercase tracking-wider leading-tight">Occupied</p>
            <p className="text-lg sm:text-xl font-black text-amber-700 leading-none mt-0.5 sm:mt-1">
              {occupiedTables}
              <span className="text-[11px] sm:text-xs font-semibold text-amber-500 ml-1">/ {occupancyRate}%</span>
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-100 text-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
            <IndianRupee size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] text-blue-600 font-bold uppercase tracking-wider leading-tight">Live Bill Total</p>
            <p className="text-lg sm:text-xl font-black text-blue-700 leading-none mt-0.5 sm:mt-1">₹{totalLiveRevenue.toFixed(0)}</p>
            <p className="text-[9px] text-blue-400 font-semibold mt-0.5 hidden sm:block">across {occupiedTables} tables</p>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm flex items-center gap-2 sm:gap-3 col-span-2 sm:col-span-1">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-purple-100 text-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] text-purple-600 font-bold uppercase tracking-wider leading-tight">Today's Revenue</p>
            <p className="text-lg sm:text-xl font-black text-purple-700 leading-none mt-0.5 sm:mt-1">₹{todayRevenue.toFixed(0)}</p>
            <p className="text-[9px] text-purple-400 font-semibold mt-0.5 hidden sm:block">{todayOrders.length} orders today</p>
          </div>
        </div>
      </div>

      {/* ── Secondary insight bar ── */}
      {occupiedTables > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-xl px-3 py-1.5 shadow-sm text-xs text-slate-600 font-semibold">
            <BarChart3 size={13} className="text-slate-400" />
            Avg bill per table: <span className="font-black text-slate-800 ml-1">₹{avgBill.toFixed(0)}</span>
          </div>
          {tables.some((t) => t.pendingCount > 0) && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 text-xs text-amber-700 font-semibold">
              <AlertTriangle size={13} className="text-amber-500" />
              {tables.reduce((s, t) => s + t.pendingCount, 0)} order(s) still being prepared
            </div>
          )}
        </div>
      )}

      {/* ── Floor Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Floor View</h2>
          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Free</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Occupied</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {tables.map((table) => {
            const isOccupied = table.isOccupied;
            const seatedMins = table.session
              ? Math.floor((new Date().getTime() - table.session.createdAt.getTime()) / 60000)
              : 0;
            const isLongStay = seatedMins >= 90;

            return (
              <Card
                key={table.number}
                className={`border-2 transition-all duration-200 cursor-pointer group relative overflow-hidden flex flex-col ${
                  isOccupied
                    ? isLongStay
                      ? "border-red-300 bg-gradient-to-b from-red-50 to-red-50/60 hover:border-red-400 hover:shadow-lg hover:shadow-red-100"
                      : "border-amber-300 bg-gradient-to-b from-amber-50 to-orange-50/40 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-100"
                    : "border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-50"
                }`}
                onClick={() => setSelectedTable(table.number)}
              >
                <div className={`absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full shadow-sm ${
                  isOccupied ? (isLongStay ? "bg-red-500 shadow-red-300" : "bg-amber-500 shadow-amber-300") : "bg-emerald-500 shadow-emerald-300"
                } ${isOccupied ? "animate-pulse" : ""}`} />

                <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-start text-center space-y-2 sm:space-y-2.5 flex-1">
                  <div className={`w-13 h-13 w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-md border-2 transition-all ${
                    isOccupied
                      ? isLongStay
                        ? "border-red-200 bg-red-500 text-white shadow-red-200"
                        : "border-amber-200 bg-amber-500 text-white shadow-amber-200"
                      : "border-emerald-100 bg-emerald-500 text-white shadow-emerald-200"
                  }`}>
                    {table.number}
                  </div>

                  <Badge className={`text-[10px] font-bold w-full justify-center py-1 border-none ${
                    isOccupied
                      ? isLongStay
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {isOccupied ? (isLongStay ? "⏰ Long Stay" : "● Occupied") : "✓ Free"}
                  </Badge>

                  {isOccupied && table.session ? (
                    <div className="w-full space-y-1.5">
                      <div className="text-xl font-black text-slate-900 leading-tight">
                        ₹{table.totalTableAmount.toFixed(0)}
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-semibold">
                        <Timer size={9} className="text-slate-400" />
                        <LiveTimer startDate={table.session.createdAt} />
                      </div>
                      <div className="flex items-center justify-center gap-1 flex-wrap pt-0.5">
                        {table.pendingCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-100 text-amber-700 font-bold rounded-full px-1.5 py-0.5">
                            <ChefHat size={8} />{table.pendingCount} cooking
                          </span>
                        )}
                        {table.deliveredCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-100 text-emerald-700 font-bold rounded-full px-1.5 py-0.5">
                            <Package size={8} />{table.deliveredCount} done
                          </span>
                        )}
                        {table.totalItems > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-blue-100 text-blue-700 font-bold rounded-full px-1.5 py-0.5">
                            <ShoppingBag size={8} />{table.totalItems} items
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] font-semibold text-slate-400">Ready to seat</div>
                  )}

                  <div className="flex-1 w-full" />

                  {table.qr && (
                    <div className="flex gap-1.5 w-full pt-4 mt-auto border-t border-slate-200/60">
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setQrModal(table.qr); }}
                        className="flex-1 h-7 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg gap-0.5 px-1 shadow-sm shadow-emerald-200"
                      >
                        <QrCode size={11} /> QR
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleDownloadQR(table.qr!); }}
                        className="flex-1 h-7 text-[10px] font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-lg gap-0.5 px-1 shadow-sm shadow-blue-200"
                      >
                        <Download size={11} /> Save
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {tableCount === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Table2 className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-bold text-sm">No tables added yet</p>
              <p className="text-xs mt-1">Click "Add Table" to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Merge Bills Dialog ── */}
      <Dialog open={mergeModalOpen} onOpenChange={(open) => {
        if (!open) { setMergeSourceId(""); setMergeTargetId(""); }
        setMergeModalOpen(open);
      }}>
        <DialogContent showCloseButton={false} className="w-[95vw] max-w-md p-0 overflow-hidden gap-0 rounded-2xl">
          <div className="flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Merge className="w-4 h-4 text-purple-600" />
                  </div>
                  Merge Table Bills
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-medium mt-1">
                  Source table is freed after merge
                </DialogDescription>
              </div>
              <button
                onClick={() => { setMergeModalOpen(false); setMergeSourceId(""); setMergeTargetId(""); }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X size={14} className="text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {sessions.length < 2 ? (
                <div className="text-center py-10 text-slate-400">
                  <Merge className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-semibold text-sm">At least 2 occupied tables needed</p>
                  <p className="text-xs mt-1">Come back when more tables are occupied.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">From (Source)</label>
                    <Select value={mergeSourceId} onValueChange={(v) => v !== null && setMergeSourceId(v)}>
                      <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-sm w-full h-11"><SelectValue placeholder="Select source table..." /></SelectTrigger>
                      <SelectContent>
                        {sessions.filter((s) => s.id !== mergeTargetId).map((s) => (
                          <SelectItem key={s.id} value={s.id}>Table {s.tableNumber} — ₹{(s.totalAmount || 0).toFixed(0)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-full px-4 py-2 text-purple-600 text-xs font-bold">
                      <ArrowRight className="w-4 h-4" /> merge into
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">To (Target)</label>
                    <Select value={mergeTargetId} onValueChange={(v) => v !== null && setMergeTargetId(v)}>
                      <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-sm w-full h-11"><SelectValue placeholder="Select target table..." /></SelectTrigger>
                      <SelectContent>
                        {sessions.filter((s) => s.id !== mergeSourceId).map((s) => (
                          <SelectItem key={s.id} value={s.id}>Table {s.tableNumber} — ₹{(s.totalAmount || 0).toFixed(0)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {mergeSourceId && mergeTargetId && (() => {
                    const src = sessions.find((s) => s.id === mergeSourceId);
                    const tgt = sessions.find((s) => s.id === mergeTargetId);
                    if (!src || !tgt) return null;
                    const combined = (src.totalAmount || 0) + (tgt.totalAmount || 0);
                    return (
                      <div className="rounded-2xl overflow-hidden border border-purple-200 bg-purple-50">
                        <div className="px-4 pt-3 pb-1"><p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Combined Bill Preview</p></div>
                        <div className="px-4 pb-4 space-y-2">
                          <div className="flex justify-between text-sm text-slate-700"><span className="font-medium">Table {src.tableNumber}</span><span className="font-bold">₹{(src.totalAmount || 0).toFixed(2)}</span></div>
                          <div className="flex justify-between text-sm text-slate-700"><span className="font-medium">Table {tgt.tableNumber}</span><span className="font-bold">₹{(tgt.totalAmount || 0).toFixed(2)}</span></div>
                          <div className="h-px bg-purple-200" />
                          <div className="flex justify-between items-center"><span className="font-black text-slate-900 text-sm">Combined Total</span><span className="text-purple-700 text-2xl font-black">₹{combined.toFixed(2)}</span></div>
                        </div>
                        <div className="bg-purple-100 px-4 py-2.5 text-[11px] text-purple-700 font-semibold">⚠ Table {src.tableNumber} will be cleared after merge</div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
            {sessions.length >= 2 && (
              <div className="px-6 pb-6 pt-4 border-t border-slate-100 flex-shrink-0 bg-white flex gap-3">
                <button onClick={() => { setMergeModalOpen(false); setMergeSourceId(""); setMergeTargetId(""); }} className="flex-1 h-11 rounded-xl font-bold border-2 border-slate-200 bg-white text-slate-700 text-sm hover:bg-slate-50 transition-all flex items-center justify-center">Cancel</button>
                <button onClick={handleMergeSessions} disabled={merging || !mergeSourceId || !mergeTargetId} className="flex-1 h-11 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white shadow-lg shadow-purple-500/25 text-sm active:scale-[0.98] transition-all flex items-center justify-center" style={{ background: "linear-gradient(135deg, #9333ea, #7c3aed)", color: "#ffffff" }}>
                  {merging ? <><RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> Merging...</> : <><Merge className="w-4 h-4 mr-2" /> Confirm Merge</>}
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── QR Preview Modal ── */}
      <Dialog open={!!qrModal} onOpenChange={(open) => !open && setQrModal(null)}>
        <DialogContent showCloseButton={false} className="w-[95vw] max-w-sm p-0 overflow-hidden gap-0 border-0 bg-transparent shadow-none">
          {qrModal && (
            <div className="relative flex flex-col text-white rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)" }}>
              <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-emerald-400/8 blur-2xl pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-0"><div className="w-8 h-1 rounded-full bg-emerald-400" /><button onClick={() => setQrModal(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><X size={14} /></button></div>
              <div className="relative z-10 flex flex-col items-center px-6 pt-5 pb-5 gap-5">
                <div className="text-center"><h2 className="font-black text-2xl tracking-wide uppercase">{cafeName}</h2><p className="text-emerald-400 text-[11px] font-bold tracking-widest mt-1">TABLE {qrModal.table}</p></div>
                <div className="bg-white rounded-2xl p-4 shadow-2xl shadow-black/50"><img src={qrModal.dataUrl} alt={`QR Code`} className="w-52 h-52 object-contain" /></div>
                <div className="text-center"><p className="text-lg font-black flex items-center justify-center gap-2"><Smartphone className="w-5 h-5 text-emerald-400" /> Scan &amp; Order</p><p className="text-white/50 text-xs mt-1">No app needed • Instant digital menu</p></div>
                <div className="w-full h-px bg-white/10" />
                <button onClick={() => handleDownloadQR(qrModal)} className="w-full h-11 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 gap-2 text-sm active:scale-[0.98] transition-all flex items-center justify-center"><Download size={16} /> Download QR Card</button>
                <p className="text-white/25 text-[10px] font-medium -mt-3">Powered by CafeQR</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Unified Table Bill Modal ── */}
      <Dialog open={!!selectedTable} onOpenChange={(open) => !open && !isSettlingAll && setSelectedTable(null)}>
        <DialogContent showCloseButton={false} className="w-[95vw] max-w-xl p-0 overflow-hidden gap-0 rounded-2xl">
          {selectedTable && (() => {
            const tableSessions = sessions.filter(s => 
              s.tableNumber === selectedTable && s.status === "active"
            ).sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime());

            const orphanOrders = orders.filter((o: any) =>
              o.tableNumber === selectedTable &&
              o.status !== "cancelled" &&
              !o.sessionId
            );

            const tableTotal = tableSessions.reduce((sum, s) => sum + getSessionTotal(s.id), 0) + 
              orphanOrders.reduce((sum: number, o: any) => sum + o.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0), 0);

            return (
              <div className="flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0 flex items-center justify-between bg-white">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-emerald-100 text-emerald-700 border-none px-2 py-0.5 text-[10px] font-bold">● Active</Badge>
                      <span className="text-xs text-slate-500 font-bold">{tableSessions.length} People Active</span>
                    </div>
                    <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                      TABLE {selectedTable}
                    </DialogTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline"
                      onClick={() => setPersonPickerOpen(true)}
                      className="rounded-xl border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 font-bold text-xs h-9 px-3"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add to Bill
                    </Button>
                    <button
                      onClick={() => setSelectedTable(null)}
                      disabled={isSettlingAll}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-50"
                    >
                      <X size={14} className="text-slate-500" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-slate-50/80">
                  {tableSessions.length === 0 && orphanOrders.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-semibold text-sm">Table is empty</p>
                    </div>
                  )}

                  {tableSessions.map((session, index) => {
                    const personLabel = `Person ${index + 1}`;
                    const sessOrders = getSessionOrders(session.id);
                    const total = getSessionTotal(session.id);
                    const isSettling = settlingIds.has(session.id);
                    
                    return (
                      <div key={session.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-4">
                        <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-slate-50">
                          <div className="font-black text-slate-800 flex items-center gap-2">
                            <Users size={14} className="text-slate-400" /> {personLabel}
                          </div>
                          <div className="font-black text-slate-900">₹{total.toFixed(2)}</div>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm text-slate-600 min-w-[320px]">
                            <tbody className="divide-y divide-slate-100">
                              {sessOrders.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-4 text-center text-xs text-slate-400 font-medium">No items</td></tr>
                              ) : (
                                sessOrders.map((order: any) => order.items.map((item: any, idx: number) => {
                                  const isPending = ["pending", "accepted", "preparing"].includes(order.status);
                                  return (
                                    <tr key={`${order.id}-${idx}`} className="group hover:bg-slate-50/50">
                                      <td className="px-4 py-2 font-semibold text-slate-700 text-xs sm:text-sm">
                                        {item.name}
                                        {isPending && <span className="block text-[10px] text-amber-500 font-semibold italic mt-0.5">⏳ Preparing…</span>}
                                      </td>
                                      <td className="px-2 py-2 font-bold text-slate-500 text-center text-xs sm:text-sm">×{item.quantity}</td>
                                      <td className="px-2 py-2 text-slate-400 text-[10px] sm:text-xs text-center">₹{item.price}</td>
                                      <td className="px-2 py-2 font-bold text-slate-800 text-right text-xs sm:text-sm">₹{(item.price * item.quantity).toFixed(0)}</td>
                                      <td className="px-2 py-2 text-center w-10">
                                        <button onClick={(e) => { e.stopPropagation(); handleRemoveItem(order.id, order.items, idx); }} className="w-6 h-6 flex items-center justify-center rounded-md bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100">
                                          <Trash2 size={12} />
                                        </button>
                                      </td>
                                    </tr>
                                  )
                                }))
                              )}
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="p-3 border-t border-slate-100 bg-slate-50">
                          <Button 
                            disabled={isSettlingAll || isSettling} 
                            onClick={() => handleCheckoutSingle(session.id, personLabel)}
                            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold h-10 shadow-md"
                          >
                            {isSettling ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Receipt className="w-4 h-4 mr-2" />}
                            {isSettling ? `Settling ${personLabel}...` : `Settle ${personLabel} — ₹${total.toFixed(2)}`}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  
                  {orphanOrders.length > 0 && (
                    <div className="bg-red-50 rounded-xl border border-red-200 overflow-hidden shadow-sm mb-4">
                      <div className="flex items-center justify-between py-3 px-4 border-b border-red-200 bg-red-100">
                        <div className="font-black text-red-800 flex items-center gap-2 text-sm">
                          <AlertTriangle size={14} /> Unassigned Orders
                        </div>
                        <div className="font-black text-red-900">
                          ₹{orphanOrders.reduce((sum: number, o: any) => sum + o.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0), 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="p-3 bg-red-50/50 text-[11px] text-red-700 font-medium border-b border-red-200/50">
                        These orders belong to sessions that are no longer active, but weren't cancelled.
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-red-700 min-w-[320px]">
                          <tbody className="divide-y divide-red-200/50">
                            {orphanOrders.map((order: any) => order.items.map((item: any, idx: number) => (
                               <tr key={`${order.id}-${idx}`} className="group hover:bg-red-100/50">
                                  <td className="px-4 py-2 font-semibold text-xs sm:text-sm">{item.name}</td>
                                  <td className="px-2 py-2 font-bold opacity-70 text-center text-xs sm:text-sm">×{item.quantity}</td>
                                  <td className="px-2 py-2 opacity-60 text-[10px] sm:text-xs text-center">₹{item.price}</td>
                                  <td className="px-2 py-2 font-bold text-right text-xs sm:text-sm">₹{(item.price * item.quantity).toFixed(0)}</td>
                                  <td className="px-2 py-2 text-center w-10">
                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveItem(order.id, order.items, idx); }} className="w-6 h-6 flex items-center justify-center rounded-md bg-red-200 text-red-700 hover:bg-red-600 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100">
                                      <Trash2 size={12} />
                                    </button>
                                  </td>
                               </tr>
                            )))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 py-4 border-t border-slate-100 bg-white">
                  <div className="flex justify-between items-center mb-4 px-2">
                    <span className="font-black text-lg text-slate-800">TABLE TOTAL</span>
                    <span className="font-black text-2xl text-emerald-600">₹{tableTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handlePrintBill(selectedTable)}
                      className="flex-1 h-12 rounded-xl text-sm font-bold gap-2 border-slate-200 hover:bg-slate-50 bg-white"
                    >
                      <Printer size={16} /> Print Full Bill
                    </Button>
                    <button
                      onClick={() => handleCheckoutAll(tableSessions)}
                      disabled={isSettlingAll || settlingIds.size > 0 || tableSessions.length === 0}
                      className="flex-1 h-12 rounded-xl text-sm font-black text-white shadow-lg active:scale-[0.98] transition-all gap-2 flex items-center justify-center disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #059669, #047857)", color: "#ffffff", boxShadow: "0 4px 20px rgba(5,150,105,0.35)" }}
                    >
                      {isSettlingAll
                        ? <><RefreshCcw className="animate-spin w-4 h-4 flex-shrink-0" /><span className="ml-2">Settling All...</span></>
                        : <><Receipt className="w-4 h-4 flex-shrink-0" /><span className="ml-2">Settle All — ₹{tableTotal.toFixed(2)}</span></>}
                    </button>
                  </div>
                </div>

              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Person Picker for Add to Bill ── */}
      <Dialog open={personPickerOpen} onOpenChange={setPersonPickerOpen}>
        <DialogContent showCloseButton={false} className="w-[95vw] max-w-xs p-0 overflow-hidden gap-0 rounded-2xl shadow-xl">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
            <DialogTitle className="text-lg font-black text-slate-900">Add Items to Bill</DialogTitle>
            <button onClick={() => setPersonPickerOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <X size={14} className="text-slate-500" />
            </button>
          </div>
          <div className="p-5">
            <label className="text-xs font-bold text-slate-600 mb-3 block uppercase tracking-wider">Select Person to Bill</label>
            <div className="flex flex-col gap-2">
              {sessions.filter(s => s.tableNumber === selectedTable && s.status === 'active').sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime()).map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => {
                    const stillActive = sessions.find(activeS => activeS.id === s.id && activeS.status === 'active');
                    if (!stillActive) {
                      toast.error("This person already checked out. Please refresh.");
                      return;
                    }
                    setSelectedSessionIdForAdd(s.id);
                    setPersonPickerOpen(false);
                    setItemsToAdd([]);
                    setAddItemModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-200 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-purple-100 flex items-center justify-center text-slate-500 group-hover:text-purple-600 font-bold text-sm">
                      P{idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 group-hover:text-purple-900">Person {idx + 1}</div>
                      <div className="text-xs text-slate-500 font-medium">Current Bill: ₹{getSessionTotal(s.id).toFixed(0)}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500" />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add to Bill Modal ── */}
      <Dialog open={addItemModalOpen} onOpenChange={(open) => { if (!open) { setAddItemModalOpen(false); setItemsToAdd([]); } }}>
        <DialogContent showCloseButton={false} className="w-[95vw] max-w-xl p-0 overflow-hidden gap-0 rounded-2xl shadow-2xl max-h-[85vh]">
          <div className="flex flex-col h-full max-h-[85vh] bg-white">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-slate-900 leading-tight">
                    Add Items to Bill
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-semibold mt-0.5">
                    Table {selectedTable} · tap + to add items
                  </DialogDescription>
                </div>
              </div>
              <button
                onClick={() => { setAddItemModalOpen(false); setItemsToAdd([]); }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X size={14} className="text-slate-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 px-4 sm:px-5 py-3 sm:py-4 space-y-2.5 sm:space-y-3">
              {menuItems.filter(i => i.available).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="font-bold text-sm text-slate-500">No available menu items</p>
                  <p className="text-xs text-slate-400 mt-1">Add items to your menu first</p>
                </div>
              ) : (
                menuItems.filter(i => i.available).map((menuItem) => {
                  const selected = itemsToAdd.find(i => i.item.id === menuItem.id);
                  const qty = selected?.quantity || 0;
                  return (
                    <div
                      key={menuItem.id}
                      className={`flex items-center gap-3 sm:gap-4 px-4 py-3 sm:py-3.5 rounded-2xl border-2 bg-white transition-all ${
                        qty > 0 ? "border-purple-300 shadow-sm shadow-purple-100" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900 leading-snug">{menuItem.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-emerald-600">₹{menuItem.price}</span>
                          {qty > 0 && (
                            <span className="text-xs font-semibold text-purple-600">
                              = ₹{(menuItem.price * qty).toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          disabled={qty === 0}
                          onClick={() => setItemsToAdd(prev => {
                            const ex = prev.find(i => i.item.id === menuItem.id);
                            if (ex && ex.quantity > 1) return prev.map(i => i.item.id === menuItem.id ? { ...i, quantity: i.quantity - 1 } : i);
                            return prev.filter(i => i.item.id !== menuItem.id);
                          })}
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-base font-black transition-all select-none ${
                            qty === 0 ? "border-slate-200 text-slate-300 cursor-not-allowed" : "border-red-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 active:scale-90"
                          }`}
                        >
                          −
                        </button>
                        <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs font-black transition-all ${
                          qty > 0 ? "bg-purple-600 border-purple-600 text-white" : "bg-slate-100 border-slate-200 text-slate-400"
                        }`}>
                          {qty}
                        </div>
                        <button
                          onClick={() => setItemsToAdd(prev => {
                            const ex = prev.find(i => i.item.id === menuItem.id);
                            if (ex) return prev.map(i => i.item.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i);
                            return [...prev, { item: menuItem, quantity: 1 }];
                          })}
                          className="w-7 h-7 rounded-full border-2 border-purple-300 text-purple-600 flex items-center justify-center text-base font-black hover:bg-purple-600 hover:text-white hover:border-purple-600 active:scale-90 transition-all select-none"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-3 border-t border-slate-100 flex-shrink-0 bg-white">
              <div className="flex gap-2">
                <button
                  onClick={() => { setAddItemModalOpen(false); setItemsToAdd([]); }}
                  className="flex-1 h-11 sm:h-12 rounded-xl font-bold border-2 border-slate-200 bg-white text-slate-700 text-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItemsSubmit}
                  disabled={addingItems || itemsToAdd.length === 0}
                  className="flex-1 h-12 rounded-xl font-black text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  style={
                    itemsToAdd.length === 0 && !addingItems
                      ? { background: "#e2e8f0", color: "#94a3b8", cursor: "not-allowed", boxShadow: "none" }
                      : { background: "linear-gradient(135deg, #9333ea, #7c3aed)", color: "#ffffff", boxShadow: "0 4px 20px rgba(147,51,234,0.35)" }
                  }
                >
                  {addingItems ? (
                    <><RefreshCcw className="w-4 h-4 flex-shrink-0 animate-spin" /><span>Adding...</span></>
                  ) : itemsToAdd.length === 0 ? (
                    <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: "0.875rem" }}>Select Items First</span>
                  ) : (
                    <><Receipt className="w-4 h-4 flex-shrink-0" /><span>Add {itemsToAdd.reduce((s, i) => s + i.quantity, 0)} Item{itemsToAdd.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""} &nbsp;·&nbsp; ₹{itemsToAdd.reduce((s, i) => s + i.item.price * i.quantity, 0).toFixed(0)}</span></>
                  )}
                </button>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
