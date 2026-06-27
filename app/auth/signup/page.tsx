"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, Eye, EyeOff, Loader2 } from "lucide-react";

const schema = z
  .object({
    cafeName: z.string().min(2, "Cafe name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    phone: z.string().min(7, "Enter a valid phone number"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const credential = await signup(data.email, data.password);
      const token = await credential.user.getIdToken();
      await api.post(
        "/cafe/register",
        { name: data.cafeName, email: data.email, phone: data.phone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Welcome! Your cafe is ready.");
      router.push("/dashboard/orders");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 relative overflow-hidden p-4">
      {/* Background Decorative Glows */}
      <div className="absolute -top-12 -left-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-slate-900">
              Cafe<span className="text-emerald-500">QR</span>
            </span>
          </div>
        </div>
        <Card className="border border-slate-100 shadow-2xl rounded-3xl bg-white/90 backdrop-blur-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Start accepting QR orders in minutes</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cafeName">Cafe Name</Label>
                <Input id="cafeName" placeholder="The Morning Brew" {...register("cafeName")} />
                {errors.cafeName && <p className="text-sm text-red-500">{errors.cafeName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="hello@mycafe.com" {...register("email")} />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" placeholder="+91 98765 43210" {...register("phone")} />
                {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    placeholder="Min 8 characters"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat password"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin w-4 h-4 mr-2" />Creating account...</> : "Create Account"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-emerald-600 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
