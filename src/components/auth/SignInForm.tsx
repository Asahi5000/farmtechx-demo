"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/config/supabase";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      showToast("Successfully signed in!", "success");
      router.push("/");
    } catch (err: unknown) {
      const code = typeof err === "object" && err !== null && "code" in err ? err.code : "";
      let errorMessage = "Invalid email or password";
      if (code === "invalid_credentials") {
        errorMessage = "Invalid email or password. Please check your credentials.";
      } else if (code === "email_not_confirmed") {
        errorMessage = "Confirm your email address before signing in.";
      } else if (code === "invalid_email") {
        errorMessage = "Invalid email format";
      } else if (code === "too_many_requests") {
        errorMessage = "Too many failed attempts. Please try again later";
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          {/* Logo */}
          <div className="flex justify-center items-center gap-3 sm:gap-6 mb-8 px-4">
            <img
              src="/images/baluzo-farm-logo-nobg.png"
              alt="Baluzo Farm"
              className="w-24 sm:w-40 h-auto object-contain"
            />
            <span className="text-xl sm:text-3xl text-gray-400 dark:text-gray-600">×</span>
            <img
              src="/images/farmtechx-logo-nobg.png"
              alt="FarmTechX"
              className="w-24 sm:w-40 h-auto object-contain"
            />
          </div>
          
          <div className="mb-5 sm:mb-8 text-center">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Admin Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Welcome back! This portal is for FarmTechXBaluzo administrators only.
            </p>
          </div>
          <div>
            {!isSupabaseConfigured && (
              <p className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                Supabase setup is required. Add the project URL and anon key to your environment file.
              </p>
            )}
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <Label>
                    Email <span className="text-error-500">*</span>
                  </Label>
                  <Input 
                    placeholder="admin@farmtech.com" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>
                    Password <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <Button className="w-full" size="sm" disabled={loading || !isSupabaseConfigured}>
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
