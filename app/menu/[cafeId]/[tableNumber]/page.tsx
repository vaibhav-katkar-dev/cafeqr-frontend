"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Coffee,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Info,
  BellRing,
  ReceiptText,
  X,
} from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: "Food" | "Drinks" | "Desserts" | "Snacks";
  imageUrl?: string;
  available: boolean;
}

interface Cafe {
  id: string;
  name: string;
}

export default function CustomerMenuPage() {
  const params = useParams();
  const cafeId = params?.cafeId as string;
  const tableNumber = Number(params?.tableNumber);

  const {
    cart,
    note,
    setNote,
    addItem,
    removeItem,
    deleteItem,
    clearCart,
    totalItems,
    totalPrice,
  } = useCart();

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and search state
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Checkout & Success state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{ id: string; items: any[]; total: number; customerName: string } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [callingWaiter, setCallingWaiter] = useState(false);
  const [requestingBill, setRequestingBill] = useState(false);
  const [customerName, setCustomerName] = useState("");

  const handleCallWaiter = async () => {
    setCallingWaiter(true);
    try {
      await api.post("/sessions/call", { cafeId, tableNumber, type: "waiter" });
      toast.success("Waiter called! Someone will be right with you.");
    } catch (err) {
      toast.error("Failed to call waiter.");
    } finally {
      setCallingWaiter(false);
    }
  };

  const handleRequestBill = async () => {
    setRequestingBill(true);
    try {
      await api.post("/sessions/call", { cafeId, tableNumber, type: "bill" });
      toast.success("Bill requested! Your waiter will bring it shortly.");
    } catch (err) {
      toast.error("Failed to request bill.");
    } finally {
      setRequestingBill(false);
    }
  };

  useEffect(() => {
    if (!cafeId) return;

    const fetchMenu = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/menu/${cafeId}`);
        setCafe(res.data.cafe);
        setMenuItems(res.data.items || []);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching menu:", err);
        setError(err.message || "Failed to load cafe menu. Please check the link.");
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [cafeId]);

  // Filtered menu list
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Categories list
  const categories = ["All", "Food", "Drinks", "Desserts", "Snacks"];

  const handleAddToCart = (item: MenuItem) => {
    addItem({
      itemId: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
    });
    toast.success(`${item.name} added to cart`, { duration: 1000 });
  };

  const handleRemoveFromCart = (itemId: string) => {
    removeItem(itemId);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    if (!customerName.trim()) {
      toast.error("Please enter your name before placing the order.");
      return;
    }
    setCheckoutLoading(true);

    try {
      const orderPayload = {
        cafeId,
        tableNumber,
        items: cart.map((item: any) => ({
          itemId: item.itemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        customerName: customerName.trim(),
        customerNote: note,
      };

      const res = await api.post("/orders", orderPayload);
      setPlacedOrder({
        id: res.data.orderId,
        items: [...cart],
        total: totalPrice,
        customerName: customerName.trim(),
      });
      clearCart();
      setCustomerName("");
      setDrawerOpen(false);
      toast.success("Order placed successfully!");
    } catch (err: any) {
      console.error("Order error:", err);
      toast.error(err.message || "Failed to place order. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-pulse" />
            <Loader2 className="w-16 h-16 text-emerald-500 animate-spin absolute inset-0" />
          </div>
          <p className="text-slate-600 font-medium text-sm">Brewing your menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Oops! Something went wrong</h2>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Placed Order Success Screen
  if (placedOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-6 text-center space-y-6 animate-in fade-in-50 zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900">Order Placed!</h1>
            <p className="text-slate-500 text-sm">
              Thank you, <span className="font-bold text-slate-700">{placedOrder.customerName}</span>! Your order is heading to the kitchen of <span className="font-bold text-slate-700">{cafe?.name}</span>.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 space-y-3">
            <div className="flex justify-between items-center text-sm font-semibold text-slate-800 border-b border-slate-200/60 pb-2">
              <span>Order Details</span>
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs">Table {tableNumber}</span>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {placedOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs text-slate-600">
                  <span>{item.name} <span className="text-slate-400 font-medium">×{item.quantity}</span></span>
                  <span className="font-medium text-slate-800">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-sm font-bold text-slate-900">
              <span>Total Price</span>
              <span className="text-emerald-600 font-extrabold text-base">₹{placedOrder.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-center text-xs text-amber-600 bg-amber-50 rounded-xl py-2 px-3">
            <Clock className="w-4 h-4 animate-pulse flex-shrink-0" />
            <span>Sit tight! Your order status will appear on the cafe dashboard in real-time.</span>
          </div>

          <Button
            onClick={() => setPlacedOrder(null)}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-all"
          >
            Order More Items
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-28">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-800 text-base leading-tight">
                {cafe?.name || "Modern Cafe"}
              </h1>
              <p className="text-slate-400 text-xs flex items-center gap-1">
                <span>QR Table Ordering</span>
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-xs px-3 py-1 font-bold rounded-full">
            Table {tableNumber}
          </Badge>
        </div>
        
        {/* Service Action Buttons */}
        <div className="max-w-2xl mx-auto px-4 pb-4 flex gap-3">
          <Button
            onClick={handleCallWaiter}
            disabled={callingWaiter}
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl text-xs font-bold border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 shadow-sm"
          >
            <BellRing className="w-4 h-4 mr-1.5" />
            {callingWaiter ? "Calling..." : "Call Waiter"}
          </Button>
          <Button
            onClick={handleRequestBill}
            disabled={requestingBill}
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl text-xs font-bold border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 shadow-sm"
          >
            <ReceiptText className="w-4 h-4 mr-1.5" />
            {requestingBill ? "Requesting..." : "Request Bill"}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search delicious dishes, drinks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-slate-200/80 focus:border-emerald-500 rounded-xl py-5 text-sm"
          />
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="overflow-x-auto scrollbar-none -mx-4 px-4 py-1 flex items-center gap-2">
          {categories.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-105"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Menu Items List */}
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200/60 rounded-2xl p-6">
              <p className="text-slate-400 text-sm">No items found matching your filters.</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const cartItem = cart.find((i: any) => i.itemId === item.id);
              const quantity = cartItem ? cartItem.quantity : 0;

              return (
                <Card
                  key={item.id}
                  className={`overflow-hidden border border-slate-100/80 shadow-sm transition-all duration-200 hover:shadow ${
                    !item.available ? "opacity-60 pointer-events-none" : ""
                  }`}
                >
                  <CardContent className="p-4 flex gap-4">
                    {/* Item Details */}
                    <div className="flex-1 flex flex-col justify-between space-y-1.5 min-w-0">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              item.category === "Food"
                                ? "bg-orange-50 text-orange-600 border border-orange-100"
                                : item.category === "Drinks"
                                ? "bg-blue-50 text-blue-600 border border-blue-100"
                                : item.category === "Desserts"
                                ? "bg-pink-50 text-pink-600 border border-pink-100"
                                : "bg-yellow-50 text-yellow-600 border border-yellow-100"
                            }`}
                          >
                            {item.category}
                          </span>
                          {!item.available && (
                            <span className="text-[10px] font-bold text-red-500 uppercase">
                              Sold Out
                            </span>
                          )}
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-sm truncate">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="font-black text-emerald-600 text-sm">
                        ₹{item.price.toFixed(2)}
                      </div>
                    </div>

                    {/* Image / Actions Box */}
                    <div className="flex flex-col items-center justify-center relative w-24 h-24 flex-shrink-0 bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Coffee className="w-8 h-8 text-slate-300" />
                      )}

                      {/* Add Button Overlay */}
                      {item.available && (
                        <div className="absolute -bottom-2 w-full px-2">
                          {quantity > 0 ? (
                            <div className="flex items-center justify-between bg-emerald-500 text-white rounded-lg px-1.5 py-1 text-xs shadow-md shadow-emerald-500/10">
                              <button
                                onClick={() => handleRemoveFromCart(item.id)}
                                className="p-0.5 hover:bg-emerald-600 rounded transition"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-black text-xs min-w-4 text-center">
                                {quantity}
                              </span>
                              <button
                                onClick={() => handleAddToCart(item)}
                                className="p-0.5 hover:bg-emerald-600 rounded transition"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleAddToCart(item)}
                              size="sm"
                              className="w-full bg-white text-emerald-600 border border-emerald-500/30 hover:bg-emerald-50 text-[11px] font-extrabold h-7 py-0 shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5 mr-0.5" /> ADD
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Bottom Cart Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-transparent pointer-events-none z-30">
          <div className="max-w-xl mx-auto w-full pointer-events-auto bg-slate-900/95 backdrop-blur text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between border border-slate-800 animate-in slide-in-from-bottom-6 duration-300">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <ShoppingBag className="w-5 h-5 text-white" />
                <Badge className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full p-0 font-extrabold border-2 border-slate-900">
                  {totalItems}
                </Badge>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Total Order
                </div>
                <div className="text-base font-black text-emerald-400">
                  ₹{totalPrice.toFixed(2)}
                </div>
              </div>
            </div>

            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger render={
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-5 py-5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/10">
                  View Order <ChevronRight className="w-4 h-4" />
                </Button>
              } />
              <SheetContent side="bottom" className="rounded-t-[30px] p-6 max-h-[85vh] overflow-y-auto max-w-xl mx-auto border-t border-slate-100">
                <SheetHeader className="text-left space-y-1 mb-4">
                  <SheetTitle className="text-xl font-black text-slate-900 flex justify-between items-center">
                    <span>Review Your Order</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold">
                      Table {tableNumber}
                    </Badge>
                  </SheetTitle>
                  <SheetDescription className="text-slate-400 text-xs">
                    Confirm your selection before sending it to the kitchen
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-4">
                  {/* Cart Items List */}
                  <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                    {cart.map((item: any) => (
                      <div
                        key={item.itemId}
                        className="flex items-center justify-between py-2 border-b border-slate-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200/60">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Coffee className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800 leading-tight">
                              {item.name}
                            </h4>
                            <span className="text-xs text-slate-400">
                              ₹{item.price.toFixed(2)} each
                            </span>
                          </div>
                        </div>

                        {/* Adjust quantities */}
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => handleRemoveFromCart(item.itemId)}
                            className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-bold text-slate-800 w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              addItem({
                                itemId: item.itemId,
                                name: item.name,
                                price: item.price,
                                imageUrl: item.imageUrl,
                              })
                            }
                            className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteItem(item.itemId)}
                            className="w-7 h-7 ml-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-full flex items-center justify-center transition"
                            aria-label="Remove item completely"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Customer Name (Required) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-name" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      Your Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="customer-name"
                      type="text"
                      placeholder="E.g., Rahul, Priya..."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={`text-sm bg-slate-50 border-slate-200 rounded-xl ${
                        !customerName.trim() ? "border-amber-300 focus:border-amber-500" : "focus:border-emerald-500"
                      }`}
                    />
                    {!customerName.trim() && (
                      <p className="text-[11px] text-amber-600 font-medium">Required so the kitchen knows who the order is for.</p>
                    )}
                  </div>

                  {/* Special Instructions Note */}
                  <div className="space-y-1.5">
                    <Label htmlFor="kitchen-note" className="text-xs font-bold text-slate-700">
                      Kitchen Instructions (Optional)
                    </Label>
                    <Textarea
                      id="kitchen-note"
                      placeholder="E.g., Less sugar, extra spicy, no ice..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="text-xs bg-slate-50 border-slate-200 rounded-xl"
                      rows={2}
                    />
                  </div>

                  {/* Receipt Summary */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Subtotal</span>
                      <span>₹{totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>GST & Service Charge</span>
                      <span>₹0.00</span>
                    </div>
                    <Separator className="bg-slate-200/60 my-2" />
                    <div className="flex justify-between items-center text-sm font-black text-slate-900">
                      <span>Amount Payable</span>
                      <span className="text-emerald-600 text-base font-extrabold">
                        ₹{totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={checkoutLoading}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm py-6 rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center"
                  >
                    {checkoutLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Placing Order...
                      </>
                    ) : (
                      "Place Order & Send to Kitchen"
                    )}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      )}
    </div>
  );
}
