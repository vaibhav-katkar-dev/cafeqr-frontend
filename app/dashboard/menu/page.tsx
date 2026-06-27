"use client";
import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { useMenu } from "@/hooks/useMenu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, UtensilsCrossed } from "lucide-react";

const CATEGORIES = ["All", "Food", "Drinks", "Desserts", "Snacks"] as const;
type Category = "Food" | "Drinks" | "Desserts" | "Snacks";

const menuSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  category: z.enum(["Food", "Drinks", "Desserts", "Snacks"]),
  imageUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  available: z.boolean(),
});
type MenuFormData = z.infer<typeof menuSchema>;

const CATEGORY_COLORS: Record<Category, string> = {
  Food: "bg-orange-100 text-orange-700",
  Drinks: "bg-blue-100 text-blue-700",
  Desserts: "bg-pink-100 text-pink-700",
  Snacks: "bg-yellow-100 text-yellow-700",
};

function MenuItemCard({ item, onEdit, onDelete, onToggle }: { item: any; onEdit: (item: any) => void; onDelete: (item: any) => void; onToggle: (item: any) => void }) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(item);
    setToggling(false);
  };

  return (
    <Card className={`border transition-all duration-200 ${!item.available ? "opacity-60" : ""}`}>
      <CardContent className="p-0">
        {item.imageUrl && (
          <div className="h-40 overflow-hidden rounded-t-xl">
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-slate-800 text-sm">{item.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${CATEGORY_COLORS[item.category as Category]}`}>
              {item.category}
            </span>
          </div>
          {item.description && (
            <p className="text-xs text-slate-500 mb-2 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center justify-between mt-3">
            <span className="font-bold text-emerald-600">₹{item.price}</span>
            <div className="flex items-center gap-2">
              <Switch
                checked={item.available}
                onCheckedChange={handleToggle}
                disabled={toggling}
                aria-label={`Toggle ${item.name} availability`}
                id={`toggle-${item.id}`}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}>
                <Pencil size={13} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => onDelete(item)}>
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MenuItemForm({ onClose, onSave, editItem }: { onClose: () => void; onSave: () => void; editItem?: any }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, control, formState: { errors } } = useForm<MenuFormData>({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      name: editItem?.name || "",
      description: editItem?.description || "",
      price: editItem?.price || 0,
      category: editItem?.category || "Food",
      imageUrl: editItem?.imageUrl || "",
      available: editItem?.available !== undefined ? editItem.available : true,
    },
  });

  const onSubmit = async (data: MenuFormData) => {
    setLoading(true);
    try {
      if (editItem) {
        await api.put(`/menu/${editItem.id}`, data);
        toast.success("Item updated!");
      } else {
        await api.post("/menu", data);
        toast.success("Item added!");
      }
      onSave();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save item";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="item-name">Item Name *</Label>
        <Input id="item-name" placeholder="Cappuccino" {...register("name")} />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="item-desc">Description</Label>
        <Textarea id="item-desc" placeholder="Rich espresso with steamed milk..." rows={2} {...register("description")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="item-price">Price (₹) *</Label>
          <Input id="item-price" type="number" step="0.01" placeholder="150" {...register("price", { valueAsNumber: true })} />
          {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="item-category">Category *</Label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="item-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {["Food", "Drinks", "Desserts", "Snacks"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="item-image">Image URL (optional)</Label>
        <Input id="item-image" placeholder="https://..." {...register("imageUrl")} />
        {errors.imageUrl && <p className="text-xs text-red-500">{errors.imageUrl.message}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Controller
          name="available"
          control={control}
          render={({ field }) => (
            <Switch id="item-available" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
        <Label htmlFor="item-available">Available for ordering</Label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600" disabled={loading}>
          {loading ? <><Loader2 className="animate-spin w-4 h-4 mr-1" />{editItem ? "Saving..." : "Adding..."}</> : editItem ? "Save Changes" : "Add Item"}
        </Button>
      </div>
    </form>
  );
}

export default function MenuPage() {
  const { items, loading, refetch } = useMenu();
  const [category, setCategory] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() =>
    category === "All" ? items : items.filter((i: any) => i.category === category),
    [items, category]
  );

  const openAdd = () => { setEditItem(null); setDialogOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setDialogOpen(true); };
  const handleSave = () => { setDialogOpen(false); refetch(); };

  const handleToggle = async (item: any) => {
    try {
      await api.patch(`/menu/${item.id}/toggle`);
      refetch();
    } catch { toast.error("Failed to toggle availability"); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await api.delete(`/menu/${deleteItem.id}`);
      toast.success("Item deleted");
      setDeleteItem(null);
      refetch();
    } catch { toast.error("Failed to delete item"); } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Menu Management</h1>
        <Button id="add-menu-item-btn" onClick={openAdd} className="bg-emerald-500 hover:bg-emerald-600">
          <Plus size={16} className="mr-1" /> Add Item
        </Button>
      </div>

      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="flex-wrap h-auto gap-1">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c} value={c} className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              {c}
              {c !== "All" && (
                <span className="ml-1.5 bg-slate-200 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">
                  {items.filter((i: any) => i.category === c).length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin w-8 h-8 text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <UtensilsCrossed size={48} className="mx-auto mb-4 opacity-40" />
          <h3 className="font-semibold text-lg mb-1">No items yet</h3>
          <p className="text-sm">Add your first menu item to get started</p>
          <Button className="mt-4 bg-emerald-500 hover:bg-emerald-600" onClick={openAdd}>
            <Plus size={14} className="mr-1" /> Add Item
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((item: any) => (
            <MenuItemCard key={item.id} item={item} onEdit={openEdit} onDelete={setDeleteItem} onToggle={handleToggle} />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl sm:rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Menu Item" : "Add New Item"}</DialogTitle>
            <DialogDescription>{editItem ? "Update the details of this menu item" : "Fill in the details for the new menu item"}</DialogDescription>
          </DialogHeader>
          <MenuItemForm
            onClose={() => setDialogOpen(false)}
            onSave={handleSave}
            editItem={editItem}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent className="w-[95vw] max-w-md rounded-2xl sm:rounded-3xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteItem?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The item will be permanently removed from your menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 rounded-xl" disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
