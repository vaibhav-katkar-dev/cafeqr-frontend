"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await resetPassword(data.email);
      setSent(true);
      toast.success("Reset email sent!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reset email";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">CafeQR</span>
          </div>
        </div>
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <CardDescription>We'll send you a reset link</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Check your inbox</h3>
                <p className="text-slate-500 text-sm">We sent a password reset link to your email.</p>
                <Link href="/auth/login"><Button className="mt-6 bg-emerald-500 hover:bg-emerald-600">Back to Login</Button></Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" placeholder="hello@mycafe.com" {...register("email")} />
                  {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                </div>
                <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={loading}>
                  {loading ? <><Loader2 className="animate-spin w-4 h-4 mr-2" />Sending...</> : "Send Reset Link"}
                </Button>
                <Link href="/auth/login" className="flex items-center justify-center gap-1 text-sm text-slate-600 hover:text-emerald-600 mt-2">
                  <ArrowLeft size={14} /> Back to login
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
