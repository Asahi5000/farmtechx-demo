"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { isSupabaseConfigured } from "@/config/supabase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function DemoLanding() {
  const { user, enterDemo } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleEnterDemo = async () => {
    if (user) {
      router.replace("/");
      return;
    }

    setLoading(true);
    try {
      await enterDemo();
      router.replace("/");
    } catch (error: unknown) {
      showToast(
        error instanceof Error ? error.message : "Could not start the demo session.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-950 via-green-950 to-slate-950 px-5 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(52, 211, 153, .38), transparent 34%), radial-gradient(circle at 82% 78%, rgba(132, 204, 22, .28), transparent 32%)",
        }}
      />
      <section className="relative w-full max-w-xl rounded-[28px] bg-white px-7 py-9 shadow-2xl shadow-black/30 sm:px-12 sm:py-11">
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
            <Image
              src="/images/farmtechx-logo-nobg.png"
              alt="FarmTechX"
              width={68}
              height={68}
              className="h-16 w-16 object-contain"
              priority
            />
          </div>
          <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-emerald-800">
            PUBLIC DEMO
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            FarmTechX
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-gray-600 sm:text-base">
            Explore the hydroponic farm dashboard with sample sensor readings and demo-only controls.
          </p>
        </div>

        <button
          type="button"
          onClick={handleEnterDemo}
          disabled={loading || !isSupabaseConfigured}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-800 px-5 py-4 text-base font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true" className="text-xl leading-none">→</span>
          {loading ? "Starting the demo..." : "Enter the demo"}
        </button>

        {!isSupabaseConfigured && (
          <p className="mt-3 text-center text-sm text-amber-700">
            Supabase must be configured before the demo can start.
          </p>
        )}

        <div className="mt-5 flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-left">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
          <p className="text-sm leading-6 text-gray-700">
            This public workspace uses isolated demo records. Changes stay in demo data;
            pump and valve controls do not operate physical devices. Account settings
            and administrator actions are disabled.
          </p>
        </div>

        <div className="mt-7 text-center">
          <Link
            href="/signin/admin"
            className="text-sm font-medium text-emerald-800 underline-offset-4 hover:underline"
          >
            Administrator sign in
          </Link>
        </div>
      </section>
      <p className="absolute bottom-5 px-4 text-center text-xs text-white/70">
        FarmTechXBaluzo · Hydroponic farm management
      </p>
    </main>
  );
}
