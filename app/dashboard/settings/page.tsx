"use client";
import { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "firebase/auth";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

const profileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  address: z.string().optional(),
  autoMarkOrdersDeliveredOnCheckout: z.boolean(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z.string().min(8, "Min 8 characters"),
  confirmNew: z.string(),
}).refine(d => d.newPassword === d.confirmNew, { message: "Passwords don't match", path: ["confirmNew"] });

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      autoMarkOrdersDeliveredOnCheckout: false,
    },
  });
  const passForm = useForm({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    api.get("/cafe/profile").then((res) => {
      profileForm.reset({
        name: res.data.name,
        phone: res.data.phone,
        address: res.data.address || "",
        autoMarkOrdersDeliveredOnCheckout: !!res.data.autoMarkOrdersDeliveredOnCheckout,
      });
    }).catch(() => {});
  }, []);

  const onProfileSubmit = async (data: any) => {
    setProfileLoading(true);
    try {
      const res = await api.put("/cafe/profile", data);
      if (res.data?.profile) {
        profileForm.reset({
          name: res.data.profile.name || "",
          phone: res.data.profile.phone || "",
          address: res.data.profile.address || "",
          autoMarkOrdersDeliveredOnCheckout: !!res.data.profile.autoMarkOrdersDeliveredOnCheckout,
        });
      }
      toast.success("Profile updated!");
    } catch { toast.error("Failed to update profile"); }
    finally { setProfileLoading(false); }
  };

  const onPasswordSubmit = async (data: any) => {
    setPassLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user!.email!, data.currentPassword);
      await reauthenticateWithCredential(user!, credential);
      await updatePassword(user!, data.newPassword);
      toast.success("Password changed!");
      passForm.reset();
    } catch { toast.error("Failed to change password. Check your current password."); }
    finally { setPassLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete("/cafe/profile").catch(() => {});
      await deleteUser(user!);
      toast.success("Account deleted");
      router.push("/");
    } catch { toast.error("Failed to delete account. Please re-login and try again."); }
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Cafe Profile</CardTitle>
          <CardDescription>Update your cafe's public information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Cafe Name</Label>
              <Input id="settings-name" {...profileForm.register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-phone">Phone</Label>
              <Input id="settings-phone" {...profileForm.register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-address">Address</Label>
              <Input id="settings-address" {...profileForm.register("address")} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="space-y-1 pr-4">
                <Label htmlFor="auto-mark-delivered" className="text-sm font-semibold text-slate-800">
                  Auto mark orders delivered on settlement
                </Label>
                <p className="text-xs text-slate-500 leading-relaxed">
                  When enabled, checkout will mark all non-cancelled orders in that table session as delivered.
                  Leave it off to keep the current checkout behavior.
                </p>
              </div>
              <Controller
                control={profileForm.control}
                name="autoMarkOrdersDeliveredOnCheckout"
                render={({ field }) => (
                  <Switch
                    id="auto-mark-delivered"
                    checked={!!field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                  />
                )}
              />
            </div>
            <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={profileLoading}>
              {profileLoading ? <><Loader2 className="animate-spin w-4 h-4 mr-1" />Saving...</> : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-pass">Current Password</Label>
              <Input id="current-pass" type="password" {...passForm.register("currentPassword")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pass">New Password</Label>
              <Input id="new-pass" type="password" {...passForm.register("newPassword")} />
              {passForm.formState.errors.newPassword && <p className="text-xs text-red-500">{String(passForm.formState.errors.newPassword.message)}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-pass">Confirm New Password</Label>
              <Input id="confirm-new-pass" type="password" {...passForm.register("confirmNew")} />
              {passForm.formState.errors.confirmNew && <p className="text-xs text-red-500">{String(passForm.formState.errors.confirmNew.message)}</p>}
            </div>
            <Button type="submit" className="bg-slate-800 hover:bg-slate-700" disabled={passLoading}>
              {passLoading ? <><Loader2 className="animate-spin w-4 h-4 mr-1" />Changing...</> : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions — proceed with caution</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger render={
              <Button id="delete-account-btn" variant="destructive" className="gap-2">
                <Trash2 size={16} /> Delete Account
              </Button>
            } />
            <AlertDialogContent className="w-[95vw] max-w-md rounded-2xl sm:rounded-3xl p-6">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your cafe, menu, and all data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 rounded-xl">
                  Yes, Delete Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
